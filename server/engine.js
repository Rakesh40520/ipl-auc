import {
  DEFAULT_CONFIG,
  getBidIncrement,
  calculateNextBid,
  calculateMaxPermissibleBid,
  validateBid,
  formatLakhs
} from './rules.js';
import { simulateMatchFixture } from './simulator.js';

export class AuctionEngine {
  constructor({
    roomCode,
    hostToken,
    hostName,
    config = {},
    teamsData = [],
    playersData = [],
    emit = () => {},
    db = null
  }) {
    this.roomCode = roomCode;
    this.hostToken = hostToken;
    this.hostName = hostName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.matchMode = this.config.matchMode || 'voting';
    this.emit = emit;
    this.db = db;

    this.status = 'lobby'; // lobby, active, paused, completed
    this.round = 1;
    this.isAcceleratedRound = false;

    // Initialize Teams Map
    this.teams = new Map();
    for (const t of teamsData) {
      this.teams.set(t.code, {
        code: t.code,
        name: t.name,
        city: t.city,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        accentColor: t.accentColor,
        textColor: t.textColor,
        titles: t.titles || 0,
        purse: this.config.defaultPurse,
        squad: [],
        playingXI: [],
        overseasCount: 0,
        userToken: null,
        userName: null,
        isBot: false,
        locked: false,
        isXIConfirmed: false
      });
    }

    // Initialize Players & Queues
    this.allPlayers = [...playersData];
    this.playerQueue = [...playersData];
    this.unsoldQueue = [];
    this.currentPlayerIndex = 0;
    this.currentPlayer = null;

    if (this.config.jumblePlayers) {
      this.jumblePlayers();
    }

    // Auction stage state
    this.currentBid = 0;
    this.leadTeam = null;
    this.leadUser = null;
    this.timer = this.config.timerDuration;
    this.timerInterval = null;
    this.bidHistory = [];
    this.lastBidSnapshot = null;
    this.results = [];

    // Bot AI decision state & pacing
    this.botMaxBudgetMap = new Map();
    this.nextBotBidTime = 0;
    this.lastTickTime = Date.now();
    this.lastEmittedTimer = null;

    // Transition & Animation guards
    this.transitionTimeout = null;
    this.isTransitioning = false;

    // Post-Auction Head-to-Head 1-on-1 Battle Arena & Tournament Fixtures
    this.activeBattle = null;
    this.fixtures = [];

    // Spectator voting & Playing XI selection window
    this.config.spectatorsCanVote = this.config.spectatorsCanVote ?? true;
    this.config.xiSelectionTime = this.config.xiSelectionTime ?? 90;
    this.xiTimer = this.config.xiSelectionTime;
    this.xiTimerInterval = null;

    this.spectatorCount = 0;
    this.connectedUsersCount = 0;
  }

  // --- LOBBY METHODS ---

  claimTeam(teamCode, { userToken, userName }) {
    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Team does not exist' };

    // Check if claimed by someone else
    if (team.userToken && team.userToken !== userToken) {
      const isSameName = userName && team.userName && team.userName.trim().toLowerCase() === userName.trim().toLowerCase();
      if (!isSameName) {
        return { success: false, reason: `Team is already claimed by ${team.userName}` };
      }
    }

    // Vacate any previous team this user owned in this room
    const vacatedTeams = [];
    for (const [code, t] of this.teams.entries()) {
      const isMatchToken = t.userToken && t.userToken === userToken;
      const isMatchName = userName && t.userName && t.userName.trim().toLowerCase() === userName.trim().toLowerCase();
      if ((isMatchToken || isMatchName) && code !== teamCode) {
        t.userToken = null;
        t.userName = null;
        t.isBot = false;
        vacatedTeams.push(t);
      }
    }

    team.userToken = userToken;
    team.userName = userName;
    team.isBot = false;

    // Persist all modified teams to database
    if (this.db) {
      for (const vt of vacatedTeams) {
        this.db.saveTeam(this.roomCode, vt);
      }
      this.db.saveTeam(this.roomCode, team);
    }
    this.persist();

    // Broadcast updates for all vacated teams so other clients unlock them immediately
    for (const vt of vacatedTeams) {
      this.emit('team_updated', { team: this.sanitizeTeam(vt) });
    }

    this.emit('team_updated', { team: this.sanitizeTeam(team) });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, team: this.sanitizeTeam(team) };
  }

  leaveTeam(teamCode, { userToken, userName } = {}) {
    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Team does not exist' };

    const matchesToken = team.userToken && team.userToken === userToken;
    const matchesName = userName && team.userName && team.userName.trim().toLowerCase() === userName.trim().toLowerCase();

    if (matchesToken || matchesName) {
      team.userToken = null;
      team.userName = null;
      team.isBot = false;
      if (this.db) {
        this.db.saveTeam(this.roomCode, team);
      }
      this.persist();
      this.emit('team_updated', { team: this.sanitizeTeam(team) });
      this.emit('state_sync', this.getStateSnapshot());
      return { success: true };
    }
    return { success: false, reason: 'Unauthorized' };
  }

  fillBots() {
    for (const team of this.teams.values()) {
      if (!team.userToken) {
        team.isBot = true;
        team.userName = `${team.code} AI`;
        team.userToken = `bot-${team.code}`;
      }
    }
    this.persist();
    this.emit('state_sync', this.getStateSnapshot());
  }

  clearBots() {
    for (const team of this.teams.values()) {
      if (team.isBot) {
        team.isBot = false;
        team.userName = null;
        team.userToken = null;
      }
    }
    this.persist();
    this.emit('state_sync', this.getStateSnapshot());
  }

  // --- AUCTION CONTROLS ---

  startAuction() {
    if (this.status !== 'lobby' && this.status !== 'paused') {
      return { success: false, reason: `Cannot start auction in ${this.status} state` };
    }

    // Only fill bots if explicitly enabled in room config
    if (this.config.botsEnabled) {
      this.fillBots();
    } else {
      this.clearBots();
    }

    this.status = 'active';
    this.emit('auction_status_changed', { status: this.status });
    this.presentNextPlayer();
    this.persist();
    return { success: true };
  }

  pauseAuction() {
    if (this.status !== 'active') return { success: false, reason: 'Auction is not active' };
    this.status = 'paused';
    this.stopTimer();
    this.emit('auction_status_changed', { status: this.status });
    this.persist();
    return { success: true };
  }

  resumeAuction() {
    if (this.status !== 'paused') return { success: false, reason: 'Auction is not paused' };
    this.status = 'active';
    this.startTimer();
    this.emit('auction_status_changed', { status: this.status });
    this.persist();
    return { success: true };
  }

  endAuction() {
    this.stopTimer();
    this.clearTransition();
    this.status = 'playing_xi_selection';

    // Auto-generate default Playing XI for any franchises that don't have one set yet
    for (const team of this.teams.values()) {
      if (!team.playingXI || team.playingXI.length === 0) {
        team.playingXI = this.generateDefaultPlayingXI(team);
      }
      team.isXIConfirmed = team.isBot;
    }

    // Auto-plan tournament fixtures if participating teams > 3
    this.generateFixtures();

    // Start XI selection countdown timer (default 90s)
    this.startXITimer();

    this.emit('auction_status_changed', { status: this.status });
    this.emit('xi_selection_started', {
      status: this.status,
      timer: this.xiTimer,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
      fixtures: this.fixtures
    });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, status: this.status, timer: this.xiTimer };
  }

  startXITimer() {
    this.stopXITimer();
    this.xiTimer = this.config.xiSelectionTime || 90;
    this.xiTimerInterval = setInterval(() => {
      this.xiTimer -= 1;
      this.emit('xi_timer_tick', { timer: this.xiTimer });
      if (this.xiTimer <= 0) {
        this.stopXITimer();
        this.advanceToFixtures();
      }
    }, 1000);
  }

  stopXITimer() {
    if (this.xiTimerInterval) {
      clearInterval(this.xiTimerInterval);
      this.xiTimerInterval = null;
    }
  }

  areAllTeamsXIConfirmed() {
    const activeHumanTeams = Array.from(this.teams.values()).filter(t => t.userToken && !t.isBot);
    if (activeHumanTeams.length === 0) return true;
    return activeHumanTeams.every(t => t.isXIConfirmed);
  }

  advanceToFixtures() {
    this.stopXITimer();
    this.status = 'completed';

    // Auto-confirm any unconfirmed squads
    for (const team of this.teams.values()) {
      if (!team.playingXI || team.playingXI.length === 0) {
        team.playingXI = this.generateDefaultPlayingXI(team);
      }
      team.isXIConfirmed = true;
    }

    if (!this.fixtures || this.fixtures.length === 0) {
      this.generateFixtures();
    }

    this.emit('auction_status_changed', { status: this.status });
    this.emit('auction_completed', {
      results: this.results,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
      activeBattle: this.activeBattle,
      fixtures: this.fixtures,
      standings: this.getTournamentStandings()
    });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true };
  }

  // Generate a balanced 11 (Max 4 overseas, at least 1 WK, balanced roles)
  generateDefaultPlayingXI(team) {
    const squad = team.squad || [];
    if (squad.length === 0) return [];
    if (squad.length <= 11) return [...squad];

    const selected = [];
    let overseasCount = 0;

    const canPick = (p) => {
      if (selected.some(s => s.id === p.id)) return false;
      if (p.isOverseas && overseasCount >= 4) return false;
      return true;
    };

    const addPlayer = (p) => {
      selected.push(p);
      if (p.isOverseas) overseasCount++;
    };

    // 1. Mandatory Wicketkeeper
    const wks = squad.filter(p => (p.category === 'wicketkeeper' || p.role === 'WK-Batter') && canPick(p));
    if (wks.length > 0) addPlayer(wks[0]);

    // 2. Pure Batters (up to 4)
    const batters = squad.filter(p => (p.category === 'batter' || p.role === 'Batter') && canPick(p));
    for (const b of batters.slice(0, 4)) {
      if (canPick(b) && selected.length < 11) addPlayer(b);
    }

    // 3. All-Rounders (up to 2)
    const allrounders = squad.filter(p => (p.category === 'allrounder' || p.role === 'All-Rounder') && canPick(p));
    for (const ar of allrounders.slice(0, 2)) {
      if (canPick(ar) && selected.length < 11) addPlayer(ar);
    }

    // 4. Fast Bowlers / Pacers (up to 2)
    const pacers = squad.filter(p => (p.category === 'pacer' || p.bowlingType === 'Pace') && canPick(p));
    for (const pac of pacers.slice(0, 2)) {
      if (canPick(pac) && selected.length < 11) addPlayer(pac);
    }

    // 5. Spinners (up to 2)
    const spinners = squad.filter(p => (p.category === 'spinner' || p.bowlingType === 'Spin') && canPick(p));
    for (const spin of spinners.slice(0, 2)) {
      if (canPick(spin) && selected.length < 11) addPlayer(spin);
    }

    // 6. Fill remaining slots from rest of squad respecting overseas <= 4
    for (const p of squad) {
      if (selected.length >= 11) break;
      if (canPick(p)) addPlayer(p);
    }

    // 7. Safety fallback if overseas cap left empty slots
    if (selected.length < 11) {
      for (const p of squad) {
        if (selected.length >= 11) break;
        if (!selected.some(s => s.id === p.id)) selected.push(p);
      }
    }

    return selected;
  }

  setPlayingXI(teamCode, { userToken, playingXI, confirm = false }) {
    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Invalid team' };

    // Auth check: user controls team or host
    if (team.userToken && team.userToken !== userToken && this.hostToken !== userToken) {
      return { success: false, reason: 'Unauthorized: you do not manage this franchise' };
    }

    if (!Array.isArray(playingXI)) {
      return { success: false, reason: 'Invalid playing XI list' };
    }

    team.playingXI = playingXI;
    if (confirm) {
      team.isXIConfirmed = true;
    }

    const allConfirmed = this.areAllTeamsXIConfirmed();

    this.persist();
    this.emit('team_updated', { team: this.sanitizeTeam(team) });
    this.emit('playing_xi_updated', {
      teamCode,
      playingXI,
      team: this.sanitizeTeam(team),
      isConfirmed: team.isXIConfirmed,
      allConfirmed
    });

    if (allConfirmed) {
      this.emit('all_teams_ready', { ready: true });
    }

    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, playingXI: team.playingXI, isConfirmed: team.isXIConfirmed, allConfirmed };
  }

  // --- HEAD-TO-HEAD BATTLE ARENA & POSITION-BY-POSITION VOTING ---

  initiateBattle({ teamA, teamB, userToken, fixtureId = null }) {
    if (!teamA || !teamB || teamA === teamB) {
      return { success: false, reason: 'Please select two different franchises for comparison' };
    }

    const tA = this.teams.get(teamA);
    const tB = this.teams.get(teamB);
    if (!tA || !tB) {
      return { success: false, reason: 'One or both franchises do not exist' };
    }

    // Ensure both teams have a Playing XI
    if (!tA.playingXI || tA.playingXI.length === 0) {
      tA.playingXI = this.generateDefaultPlayingXI(tA);
    }
    if (!tB.playingXI || tB.playingXI.length === 0) {
      tB.playingXI = this.generateDefaultPlayingXI(tB);
    }

    this.activeBattle = {
      id: `battle-${Date.now()}`,
      fixtureId: fixtureId || null,
      teamA,
      teamB,
      currentSlot: 0,
      votes: {}, // { [slotIndex]: { [voterUserToken]: { voteTeamCode, voterTeamCode } } }
      initiatedBy: userToken,
      timestamp: Date.now()
    };

    this.persist();
    this.emit('battle_updated', { battle: this.activeBattle });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, battle: this.activeBattle };
  }

  castBattleVote({ slotIndex = 0, voteTeamCode, userToken, voterTeamCode, isSuperOver = false }) {
    if (!this.activeBattle) {
      return { success: false, reason: 'No active team battle' };
    }

    const { teamA, teamB } = this.activeBattle;
    if (voteTeamCode !== teamA && voteTeamCode !== teamB) {
      return { success: false, reason: 'Vote must be for one of the competing franchises' };
    }

    // Check spectator
    const isSpectator = !voterTeamCode || !this.teams.has(voterTeamCode);
    if (isSpectator) {
      if (this.config.spectatorsCanVote === false) {
        return {
          success: false,
          reason: 'Spectator voting is disabled in this room. Only neutral franchise managers can vote.'
        };
      }
    } else {
      // If voter belongs to one of the competing teams, prompt requested remaining teams to vote!
      const activeHumanTeams = Array.from(this.teams.values()).filter(t => t.userToken && !t.isBot);
      if (activeHumanTeams.length > 2 && (voterTeamCode === teamA || voterTeamCode === teamB)) {
        return {
          success: false,
          reason: 'As a competing franchise manager, you cannot vote. Only remaining neutral franchises and spectators can vote!'
        };
      }
    }

    if (isSuperOver || this.activeBattle.isSuperOver) {
      if (!this.activeBattle.superOverVotes) {
        this.activeBattle.superOverVotes = {};
      }
      this.activeBattle.superOverVotes[userToken] = {
        voteTeamCode,
        voterTeamCode: isSpectator ? null : voterTeamCode,
        isSpectator,
        timestamp: Date.now()
      };
    } else {
      const slotKey = String(slotIndex);
      if (!this.activeBattle.votes[slotKey]) {
        this.activeBattle.votes[slotKey] = {};
      }

      this.activeBattle.votes[slotKey][userToken] = {
        voteTeamCode,
        voterTeamCode: isSpectator ? null : voterTeamCode,
        isSpectator,
        timestamp: Date.now()
      };
    }

    this.persist();
    this.emit('battle_updated', { battle: this.activeBattle });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, battle: this.activeBattle };
  }

  toggleSpectatorVoting() {
    this.config.spectatorsCanVote = !this.config.spectatorsCanVote;
    this.persist();
    this.emit('config_updated', { config: this.config });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, spectatorsCanVote: this.config.spectatorsCanVote };
  }

  advanceBattleSlot({ slotIndex }) {
    if (!this.activeBattle) return { success: false, reason: 'No active battle' };
    this.activeBattle.currentSlot = Math.max(0, Math.min(10, slotIndex));
    this.persist();
    this.emit('battle_updated', { battle: this.activeBattle });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, battle: this.activeBattle };
  }

  resetBattle() {
    this.activeBattle = null;
    this.persist();
    this.emit('battle_updated', { battle: null });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true };
  }

  // --- TOURNAMENT FIXTURES & STANDINGS ---

  generateFixtures() {
    // Participating franchises:
    // If AI bots enabled, all 10 franchises participate.
    // Otherwise, all franchises that have a manager or have acquired squad players.
    let participatingTeams = [];
    if (this.config.botsEnabled) {
      participatingTeams = Array.from(this.teams.values()).map(t => this.sanitizeTeam(t));
    } else {
      participatingTeams = Array.from(this.teams.values())
        .filter(t => t.userToken || (t.squad && t.squad.length > 0))
        .map(t => this.sanitizeTeam(t));
    }

    // Rule: Minimum 2 teams required to plan tournament match fixtures
    if (participatingTeams.length < 2) {
      this.fixtures = [];
      const reason = `At least 2 teams are required to plan tournament match fixtures (currently ${participatingTeams.length} team).`;
      this.emit('fixtures_updated', {
        fixtures: [],
        error: reason
      });
      return { success: false, reason };
    }

    const teamsList = [...participatingTeams];
    const isOdd = teamsList.length % 2 !== 0;
    if (isOdd) {
      teamsList.push({ code: 'BYE', name: 'BYE' });
    }

    const n = teamsList.length;
    const rounds = n - 1;
    const half = n / 2;
    const fixtures = [];
    let matchNumber = 1;

    let rotating = [...teamsList];
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const team1 = rotating[i];
        const team2 = rotating[n - 1 - i];

        if (team1.code !== 'BYE' && team2.code !== 'BYE') {
          fixtures.push({
            id: `fixture-${matchNumber}`,
            matchNumber: matchNumber++,
            round: r + 1,
            teamA: team1.code,
            teamB: team2.code,
            status: 'scheduled', // 'scheduled' | 'live' | 'completed'
            scoreA: null,
            scoreB: null,
            winner: null,
            battleId: null,
            completedAt: null
          });
        }
      }

      // Rotate round robin (keep first fixed, rotate remaining)
      const fixed = rotating[0];
      const rest = rotating.slice(1);
      const last = rest.pop();
      rest.unshift(last);
      rotating = [fixed, ...rest];
    }

    this.fixtures = fixtures;
    this.emit('fixtures_updated', { fixtures: this.fixtures });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, fixtures: this.fixtures };
  }

  startFixtureBattle({ fixtureId, userToken }) {
    if (!this.fixtures || this.fixtures.length === 0) {
      return { success: false, reason: 'No fixtures planned yet' };
    }

    const fixture = this.fixtures.find(f => f.id === fixtureId);
    if (!fixture) {
      return { success: false, reason: 'Fixture not found' };
    }

    // Reset any previously live fixtures back to scheduled
    for (const f of this.fixtures) {
      if (f.status === 'live' && f.id !== fixtureId) {
        f.status = 'scheduled';
      }
    }

    fixture.status = 'live';

    const battleRes = this.initiateBattle({
      teamA: fixture.teamA,
      teamB: fixture.teamB,
      userToken,
      fixtureId: fixture.id
    });

    if (!battleRes.success) {
      fixture.status = 'scheduled';
      return battleRes;
    }

    fixture.battleId = this.activeBattle.id;
    this.emit('fixtures_updated', { fixtures: this.fixtures });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, fixture, battle: this.activeBattle };
  }

  recordFixtureResult({ fixtureId, scoreA, scoreB, winner, isSuperOver = false, superOverScoreA = 0, superOverScoreB = 0, userToken }) {
    const fixture = this.fixtures.find(f => f.id === fixtureId);
    if (!fixture) {
      return { success: false, reason: 'Fixture not found' };
    }

    fixture.scoreA = typeof scoreA === 'number' ? scoreA : 0;
    fixture.scoreB = typeof scoreB === 'number' ? scoreB : 0;
    fixture.winner = winner || (fixture.scoreA > fixture.scoreB ? fixture.teamA : (fixture.scoreB > fixture.scoreA ? fixture.teamB : 'TIE'));
    fixture.isSuperOver = Boolean(isSuperOver);
    fixture.superOverScoreA = superOverScoreA;
    fixture.superOverScoreB = superOverScoreB;
    fixture.status = 'completed';
    fixture.completedAt = Date.now();

    if (this.activeBattle && this.activeBattle.fixtureId === fixtureId) {
      this.activeBattle = null;
      this.emit('battle_updated', { battle: null });
    }

    this.emit('fixtures_updated', { fixtures: this.fixtures });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, fixture };
  }

  jumblePlayers() {
    const startIndex = this.status === 'active' && this.currentPlayer ? this.currentPlayerIndex + 1 : this.currentPlayerIndex;
    const remaining = this.playerQueue.slice(startIndex);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this.playerQueue = [
      ...this.playerQueue.slice(0, startIndex),
      ...remaining
    ];

    this.emit('queue_jumbled', {
      totalRemaining: remaining.length,
      nextPlayer: this.playerQueue[startIndex] || null
    });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, count: remaining.length };
  }

  get matchMode() {
    return this.config.matchMode || 'voting';
  }

  setMatchMode(modeArg) {
    const mode = typeof modeArg === 'object' && modeArg !== null ? modeArg.mode : modeArg;
    if (mode !== 'voting' && mode !== 'ai_simulation') {
      return { success: false, reason: 'Invalid match mode. Must be "voting" or "ai_simulation"' };
    }
    this.config.matchMode = mode;

    // When switching to AI simulation, if fixtures are not planned yet, attempt to generate them
    if (mode === 'ai_simulation' && (!this.fixtures || this.fixtures.length === 0)) {
      this.generateFixtures();
    }

    this.emit('config_updated', { config: this.config });
    this.emit('match_mode_changed', { matchMode: mode });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, matchMode: mode };
  }

  simulateFixture({ fixtureId, userToken } = {}) {
    if (!this.fixtures || this.fixtures.length === 0) {
      return { success: false, reason: 'No fixtures planned yet' };
    }

    const fixture = this.fixtures.find(f => f.id === fixtureId);
    if (!fixture) {
      return { success: false, reason: 'Fixture not found' };
    }

    const tA = this.teams.get(fixture.teamA);
    const tB = this.teams.get(fixture.teamB);
    if (!tA || !tB) {
      return { success: false, reason: 'One or both franchises not found' };
    }

    // Ensure Playing XIs exist
    if (!tA.playingXI || tA.playingXI.length === 0) {
      tA.playingXI = this.generateDefaultPlayingXI(tA);
    }
    if (!tB.playingXI || tB.playingXI.length === 0) {
      tB.playingXI = this.generateDefaultPlayingXI(tB);
    }

    // Run statistical cricket match simulation based on math & player stats
    const scorecard = simulateMatchFixture({
      fixtureId: fixture.id,
      teamA: tA,
      teamB: tB,
      playingXIA: tA.playingXI,
      playingXIB: tB.playingXI
    });

    // Populate fixture
    fixture.status = 'completed';
    fixture.completedAt = Date.now();
    fixture.winner = scorecard.winner;
    fixture.scorecard = scorecard;
    fixture.isSuperOver = scorecard.isSuperOver;

    // Approximate slot wins based on innings comparison for standings diff
    if (scorecard.winner === fixture.teamA) {
      fixture.scoreA = 6 + Math.min(4, Math.floor(Math.random() * 4));
      fixture.scoreB = 11 - fixture.scoreA;
    } else if (scorecard.winner === fixture.teamB) {
      fixture.scoreB = 6 + Math.min(4, Math.floor(Math.random() * 4));
      fixture.scoreA = 11 - fixture.scoreB;
    } else {
      fixture.scoreA = 5;
      fixture.scoreB = 5;
    }

    if (this.activeBattle && this.activeBattle.fixtureId === fixtureId) {
      this.activeBattle = null;
      this.emit('battle_updated', { battle: null });
    }

    this.emit('fixture_simulated', { fixture, scorecard });
    this.emit('fixtures_updated', { fixtures: this.fixtures });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, fixture, scorecard };
  }

  simulateAllFixtures({ userToken } = {}) {
    if (!this.fixtures || this.fixtures.length === 0) {
      return { success: false, reason: 'No fixtures planned yet' };
    }

    let simulatedCount = 0;
    for (const fixture of this.fixtures) {
      if (fixture.status !== 'completed') {
        const res = this.simulateFixture({ fixtureId: fixture.id, userToken });
        if (res.success) simulatedCount++;
      }
    }

    this.emit('all_fixtures_simulated', { count: simulatedCount });
    this.emit('fixtures_updated', { fixtures: this.fixtures });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, simulatedCount };
  }

  concludeActiveBattle({ userToken } = {}) {
    if (!this.activeBattle) {
      return { success: false, reason: 'No active battle to conclude' };
    }

    const { teamA, teamB, fixtureId } = this.activeBattle;

    // 1. If currently in a Super Over, finalize the Super Over showdown
    if (this.activeBattle.isSuperOver) {
      let soVotesA = 0;
      let soVotesB = 0;
      const soVotes = this.activeBattle.superOverVotes || {};
      for (const voter in soVotes) {
        const v = soVotes[voter];
        if (v.voteTeamCode === teamA) soVotesA++;
        if (v.voteTeamCode === teamB) soVotesB++;
      }

      let winner = teamA;
      if (soVotesA > soVotesB) {
        winner = teamA;
      } else if (soVotesB > soVotesA) {
        winner = teamB;
      } else {
        const rA = this.activeBattle.superOverA?.rating ?? 95;
        const rB = this.activeBattle.superOverB?.rating ?? 95;
        winner = rA >= rB ? teamA : teamB;
      }

      const scoreA = this.activeBattle.regularScoreA ?? 5;
      const scoreB = this.activeBattle.regularScoreB ?? 5;

      if (fixtureId) {
        return this.recordFixtureResult({
          fixtureId,
          scoreA,
          scoreB,
          winner,
          isSuperOver: true,
          superOverScoreA: soVotesA,
          superOverScoreB: soVotesB,
          userToken
        });
      }

      const res = { teamA, teamB, scoreA, scoreB, winner, isSuperOver: true, superOverScoreA: soVotesA, superOverScoreB: soVotesB };
      this.activeBattle = null;
      this.emit('battle_updated', { battle: null });
      this.emit('state_sync', this.getStateSnapshot());
      this.persist();
      return { success: true, result: res };
    }

    // 2. Regular 11 position duels tally
    let scoreA = 0;
    let scoreB = 0;

    for (let i = 0; i < 11; i++) {
      const slotVotes = this.activeBattle.votes?.[String(i)] || {};
      let aVotes = 0;
      let bVotes = 0;
      for (const voter in slotVotes) {
        const v = slotVotes[voter];
        if (v.voteTeamCode === teamA) aVotes++;
        if (v.voteTeamCode === teamB) bVotes++;
      }

      if (aVotes > bVotes) {
        scoreA++;
      } else if (bVotes > aVotes) {
        scoreB++;
      } else {
        // Slot Tie-breaker based on player ratings
        const pA = this.teams.get(teamA)?.playingXI?.[i];
        const pB = this.teams.get(teamB)?.playingXI?.[i];
        const rA = pA?.rating ?? 80;
        const rB = pB?.rating ?? 80;
        if (rA > rB) scoreA++;
        else if (rB > rA) scoreB++;
      }
    }

    // 3. Check for a DRAW: If draw occurs, initiate Super Over as requested ("if draw you plan according")
    if (scoreA === scoreB) {
      this.activeBattle.isSuperOver = true;
      this.activeBattle.superOverVotes = {};
      const tA = this.teams.get(teamA);
      const tB = this.teams.get(teamB);
      this.activeBattle.superOverA = tA?.playingXI?.[0] || { name: `${teamA} Captain`, rating: 95 };
      this.activeBattle.superOverB = tB?.playingXI?.[0] || { name: `${teamB} Captain`, rating: 95 };
      this.activeBattle.regularScoreA = scoreA;
      this.activeBattle.regularScoreB = scoreB;
      this.persist();
      this.emit('super_over_started', { battle: this.activeBattle });
      this.emit('battle_updated', { battle: this.activeBattle });
      this.emit('state_sync', this.getStateSnapshot());
      return { success: true, draw: true, isSuperOver: true, battle: this.activeBattle };
    }

    const winner = scoreA > scoreB ? teamA : teamB;

    if (fixtureId) {
      return this.recordFixtureResult({
        fixtureId,
        scoreA,
        scoreB,
        winner,
        userToken
      });
    }

    // Non-fixture standalone battle
    const res = { teamA, teamB, scoreA, scoreB, winner };
    this.activeBattle = null;
    this.emit('battle_updated', { battle: null });
    this.emit('state_sync', this.getStateSnapshot());
    this.persist();
    return { success: true, result: res };
  }

  getTournamentStandings() {
    const standingsMap = new Map();

    const teamCodes = new Set();
    for (const f of this.fixtures) {
      teamCodes.add(f.teamA);
      teamCodes.add(f.teamB);
    }

    if (teamCodes.size === 0) {
      for (const t of this.teams.values()) {
        if (t.userToken || (t.squad && t.squad.length > 0)) {
          teamCodes.add(t.code);
        }
      }
    }

    for (const code of teamCodes) {
      const team = this.teams.get(code);
      standingsMap.set(code, {
        code,
        name: team?.name || code,
        primaryColor: team?.primaryColor || '#6366f1',
        userName: team?.userName || (team?.isBot ? 'AI Bot' : 'Open'),
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        slotsWon: 0,
        slotsLost: 0,
        diff: 0,
        form: []
      });
    }

    for (const f of this.fixtures) {
      if (f.status !== 'completed' || !f.winner) continue;

      const tA = standingsMap.get(f.teamA);
      const tB = standingsMap.get(f.teamB);
      if (!tA || !tB) continue;

      tA.played += 1;
      tB.played += 1;

      const sA = f.scoreA ?? 0;
      const sB = f.scoreB ?? 0;
      tA.slotsWon += sA;
      tA.slotsLost += sB;
      tB.slotsWon += sB;
      tB.slotsLost += sA;

      if (f.winner === f.teamA) {
        tA.won += 1;
        tA.points += 2;
        tA.form.push('W');

        tB.lost += 1;
        tB.form.push('L');
      } else if (f.winner === f.teamB) {
        tB.won += 1;
        tB.points += 2;
        tB.form.push('W');

        tA.lost += 1;
        tA.form.push('L');
      } else {
        tA.tied += 1;
        tA.points += 1;
        tA.form.push('T');

        tB.tied += 1;
        tB.points += 1;
        tB.form.push('T');
      }
    }

    for (const item of standingsMap.values()) {
      item.diff = item.slotsWon - item.slotsLost;
    }

    return Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.slotsWon - a.slotsWon;
    });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.botsEnabled === false) {
      this.clearBots();
    } else if (newConfig.botsEnabled === true) {
      this.fillBots();
    }
    this.persist();
    this.emit('config_updated', { config: this.config });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true };
  }

  clearTransition() {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    this.isTransitioning = false;
  }

  // --- PLAYER PRESENTATION & TRANSITIONS ---

  presentNextPlayer() {
    this.clearTransition();
    this.stopTimer();

    if (this.currentPlayerIndex >= this.playerQueue.length) {
      // Current round complete! Check if accelerated round needed
      if (this.round === 1 && this.unsoldQueue.length > 0) {
        this.startAcceleratedRound();
        return;
      }

      // Entire auction complete!
      this.status = 'completed';
      for (const team of this.teams.values()) {
        if (!team.playingXI || team.playingXI.length === 0) {
          team.playingXI = this.generateDefaultPlayingXI(team);
        }
      }
      this.emit('auction_completed', {
        results: this.results,
        teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
        activeBattle: this.activeBattle
      });
      this.emit('state_sync', this.getStateSnapshot());
      this.persist();
      return;
    }

    this.currentPlayer = this.playerQueue[this.currentPlayerIndex];
    this.currentBid = this.currentPlayer.basePrice;
    this.leadTeam = null;
    this.leadUser = null;
    this.bidHistory = [];
    this.lastBidSnapshot = null;
    this.timer = this.config.timerDuration;
    this.lastEmittedTimer = this.timer;
    this.nextBotBidTime = Date.now() + 2500 + Math.random() * 2000;

    // Reset Bot Max Willingness for this player
    this.calculateBotMaxBudgets(this.currentPlayer);

    this.emit('player_presented', {
      player: this.currentPlayer,
      index: this.currentPlayerIndex,
      total: this.playerQueue.length,
      round: this.round,
      isAcceleratedRound: this.isAcceleratedRound,
      currentBid: this.currentBid,
      timer: this.timer,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t))
    });

    this.persist();
    this.startTimer();
  }

  startAcceleratedRound() {
    this.round = 2;
    this.isAcceleratedRound = true;
    this.playerQueue = [...this.unsoldQueue];
    this.unsoldQueue = [];
    this.currentPlayerIndex = 0;

    this.emit('accelerated_round_started', {
      totalPlayers: this.playerQueue.length,
      round: 2
    });

    this.presentNextPlayer();
  }

  // --- BIDDING ---

  placeBid({ teamCode, userToken, userName, isBot = false }) {
    if (this.status !== 'active') {
      return { success: false, reason: 'Auction is not active' };
    }

    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Invalid team' };

    // Auth check (bot or matching token)
    if (!isBot && team.userToken !== userToken) {
      return { success: false, reason: 'You do not control this franchise' };
    }

    // Determine proposed bid amount
    const hasExistingBid = Boolean(this.leadTeam);
    const proposedBid = calculateNextBid(this.currentBid, this.currentPlayer.basePrice, hasExistingBid);

    // Validate using pure rules engine
    const validation = validateBid({
      roomState: this.status,
      team,
      player: this.currentPlayer,
      proposedBid,
      currentLeaderTeamCode: this.leadTeam,
      config: this.config
    });

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Save snapshot for potential Host Undo
    this.lastBidSnapshot = {
      currentBid: this.currentBid,
      leadTeam: this.leadTeam,
      leadUser: this.leadUser,
      timer: this.timer,
      bidHistoryLength: this.bidHistory.length
    };

    // Apply bid
    this.currentBid = proposedBid;
    this.leadTeam = team.code;
    this.leadUser = userName || team.userName || team.code;

    // Reset countdown timer (back to at least 7 seconds or full duration)
    this.timer = Math.max(this.timer, Math.min(this.config.timerDuration, 8.0));
    this.lastEmittedTimer = Math.ceil(this.timer);
    this.nextBotBidTime = Date.now() + 2500 + Math.random() * 2000;

    const bidRecord = {
      teamCode: team.code,
      teamName: team.name,
      userName: this.leadUser,
      amount: proposedBid,
      timestamp: Date.now()
    };
    this.bidHistory.unshift(bidRecord);

    if (this.db) {
      this.db.recordBid({
        roomCode: this.roomCode,
        playerId: this.currentPlayer.id,
        teamCode: team.code,
        amount: proposedBid
      });
    }

    this.emit('bid_placed', {
      currentBid: this.currentBid,
      leadTeam: this.leadTeam,
      leadTeamDetails: this.sanitizeTeam(team),
      leadUser: this.leadUser,
      bidHistory: this.bidHistory,
      timer: Math.ceil(this.timer),
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t))
    });

    return { success: true, amount: proposedBid };
  }

  undoLastBid() {
    if (!this.lastBidSnapshot) {
      return { success: false, reason: 'No bid to undo' };
    }

    this.currentBid = this.lastBidSnapshot.currentBid;
    this.leadTeam = this.lastBidSnapshot.leadTeam;
    this.leadUser = this.lastBidSnapshot.leadUser;
    this.timer = Math.max(this.lastBidSnapshot.timer, 5.0);

    if (this.bidHistory.length > 0) {
      this.bidHistory.shift();
    }
    this.lastBidSnapshot = null;

    const leadTeamDetails = this.leadTeam ? this.sanitizeTeam(this.teams.get(this.leadTeam)) : null;

    this.emit('bid_undone', {
      currentBid: this.currentBid,
      leadTeam: this.leadTeam,
      leadTeamDetails,
      leadUser: this.leadUser,
      bidHistory: this.bidHistory,
      timer: this.timer
    });

    return { success: true };
  }

  skipPlayer() {
    // If already transitioning, user wants to move to the next player immediately
    if (this.isTransitioning) {
      this.clearTransition();
      this.currentPlayerIndex++;
      this.presentNextPlayer();
      return { success: true };
    }
    if (!this.currentPlayer) return { success: false, reason: 'No active player' };
    this.stopTimer();
    this.finalizePlayer(false, 'unsold');
    return { success: true };
  }

  sellNow() {
    if (this.isTransitioning) return { success: true };
    if (!this.currentPlayer) return { success: false, reason: 'No active player' };
    this.stopTimer();
    if (this.leadTeam) {
      this.finalizePlayer(true, 'sold');
    } else {
      this.finalizePlayer(false, 'unsold');
    }
    return { success: true };
  }

  nextPlayer() {
    this.stopTimer();

    // If already in resolution transition, clear timer and advance immediately
    if (this.isTransitioning || this.transitionTimeout) {
      this.clearTransition();
      this.currentPlayerIndex++;
      this.presentNextPlayer();
      return { success: true };
    }

    if (!this.currentPlayer) {
      this.presentNextPlayer();
      return { success: true };
    }

    // Finalize current player (sold if bid placed, unsold otherwise)
    if (this.leadTeam) {
      this.finalizePlayer(true, 'sold');
    } else {
      this.finalizePlayer(false, 'unsold');
    }

    return { success: true };
  }

  // --- TIMER & RESOLUTION ---

  startTimer() {
    this.stopTimer();
    this.lastTickTime = Date.now();
    this.lastEmittedTimer = Math.ceil(this.timer);

    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      if (this.status !== 'active') return;

      this.timer = Math.max(0, this.timer - deltaSec);
      const currentCeil = Math.ceil(this.timer);

      // Emit strictly once per second to avoid WebSocket message jitter
      if (currentCeil !== this.lastEmittedTimer) {
        this.lastEmittedTimer = currentCeil;
        this.emit('timer_tick', {
          timer: currentCeil,
          precise: parseFloat(this.timer.toFixed(1))
        });
      }

      // Check Bot AI turn with human-like deliberation delay
      if (this.config.botsEnabled) {
        this.evaluateBotBids();
      }

      if (this.timer <= 0) {
        this.stopTimer();
        if (this.leadTeam) {
          this.finalizePlayer(true, 'sold');
        } else {
          this.finalizePlayer(false, 'unsold');
        }
      }
    }, 200);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  finalizePlayer(isSold, statusText = 'sold') {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.stopTimer();

    const player = this.currentPlayer;
    if (!player) {
      this.isTransitioning = false;
      return;
    }
    let winnerTeam = null;

    if (isSold && this.leadTeam) {
      winnerTeam = this.teams.get(this.leadTeam);
      winnerTeam.purse -= this.currentBid;
      winnerTeam.squad.push({
        ...player,
        soldPrice: this.currentBid,
        round: this.round
      });
      if (player.isOverseas) {
        winnerTeam.overseasCount++;
      }

      const resultEntry = {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        category: player.category || null,
        battingStyle: player.battingStyle || null,
        bowlingStyle: player.bowlingStyle || null,
        bowlingType: player.bowlingType || null,
        allrounderType: player.allrounderType || null,
        specialization: player.specialization || null,
        country: player.country,
        isOverseas: player.isOverseas,
        teamCode: winnerTeam.code,
        teamName: winnerTeam.name,
        amount: this.currentBid,
        status: 'sold',
        round: this.round,
        timestamp: Date.now()
      };
      this.results.push(resultEntry);

      if (this.db) {
        this.db.recordResult({
          roomCode: this.roomCode,
          playerId: player.id,
          teamCode: winnerTeam.code,
          amount: this.currentBid,
          status: 'sold',
          round: this.round
        });
        this.db.saveTeam(this.roomCode, winnerTeam);
      }

      this.emit('player_sold', {
        player,
        team: this.sanitizeTeam(winnerTeam),
        amount: this.currentBid,
        isMarquee: Boolean(player.set?.startsWith('M')),
        teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
        results: this.results
      });
    } else {
      // Unsold
      this.unsoldQueue.push(player);

      const resultEntry = {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        category: player.category || null,
        battingStyle: player.battingStyle || null,
        bowlingStyle: player.bowlingStyle || null,
        bowlingType: player.bowlingType || null,
        allrounderType: player.allrounderType || null,
        specialization: player.specialization || null,
        country: player.country,
        isOverseas: player.isOverseas,
        teamCode: null,
        teamName: null,
        amount: 0,
        status: statusText,
        round: this.round,
        timestamp: Date.now()
      };
      this.results.push(resultEntry);

      if (this.db) {
        this.db.recordResult({
          roomCode: this.roomCode,
          playerId: player.id,
          teamCode: null,
          amount: 0,
          status: statusText,
          round: this.round
        });
      }

      this.emit('player_unsold', {
        player,
        status: statusText,
        teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
        results: this.results
      });
    }

    this.persist();

    // Responsive transition delays: 1800ms for sold hammer stamp, 1000ms for unsold (crisp and quick)
    const delay = isSold ? 1800 : 1000;
    this.transitionTimeout = setTimeout(() => {
      this.transitionTimeout = null;
      this.isTransitioning = false;
      this.currentPlayerIndex++;
      this.presentNextPlayer();
    }, delay);
  }

  // --- BOT AI BIDDING ---

  calculateBotMaxBudgets(player) {
    this.botMaxBudgetMap.clear();
    if (!this.config.botsEnabled || !player) return;

    const isMarquee = player.set?.startsWith('M');
    const base = player.basePrice;

    for (const [code, team] of this.teams.entries()) {
      if (!team.isBot) continue;

      // Base multiplier depends on marquee/capped/uncapped
      let multiplier = 1.0;
      if (isMarquee) {
        multiplier = 2.5 + Math.random() * 5.0; // 5 Cr to 15 Cr
      } else if (player.isCapped) {
        multiplier = 1.2 + Math.random() * 3.5;
      } else {
        multiplier = 1.0 + Math.random() * 2.0;
      }

      // Check role needs
      const currentRoleCount = team.squad.filter(p => p.role === player.role).length;
      if (currentRoleCount < 3) multiplier *= 1.25;

      const maxBidByTeam = Math.round(base * multiplier);
      this.botMaxBudgetMap.set(code, maxBidByTeam);
    }
  }

  evaluateBotBids() {
    if (!this.config.botsEnabled) return;
    if (this.status !== 'active' || !this.currentPlayer) return;

    const now = Date.now();
    // Do not bid if deliberate delay hasn't elapsed
    if (now < this.nextBotBidTime) return;

    // Do not snipe in the final second (lets the gavel fall naturally or gives human time)
    if (this.timer < 1.0) return;

    // Schedule next bot decision window (2.5 to 4.5 seconds)
    this.nextBotBidTime = now + 2500 + Math.random() * 2000;

    // Eligible bots
    const eligibleBots = [];
    const nextBid = calculateNextBid(this.currentBid, this.currentPlayer.basePrice, Boolean(this.leadTeam));

    for (const [code, team] of this.teams.entries()) {
      if (!team.isBot) continue;
      if (this.leadTeam === code) continue; // Already leading

      const maxWillingness = this.botMaxBudgetMap.get(code) || 0;
      if (nextBid > maxWillingness) continue;

      // Solvency check
      const validation = validateBid({
        roomState: this.status,
        team,
        player: this.currentPlayer,
        proposedBid: nextBid,
        currentLeaderTeamCode: this.leadTeam,
        config: this.config
      });

      if (validation.valid) {
        eligibleBots.push(team);
      }
    }

    if (eligibleBots.length > 0) {
      // Pick one randomly weighted
      const chosenBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
      this.placeBid({
        teamCode: chosenBot.code,
        userName: chosenBot.userName,
        isBot: true
      });
    }
  }

  // --- STATE SERIALIZATION ---

  sanitizeTeam(team) {
    return {
      code: team.code,
      name: team.name,
      city: team.city,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      accentColor: team.accentColor,
      textColor: team.textColor,
      titles: team.titles,
      purse: team.purse,
      squadCount: team.squad.length,
      overseasCount: team.overseasCount,
      squad: team.squad,
      playingXI: team.playingXI || [],
      userToken: team.userToken,
      userName: team.userName,
      isBot: team.isBot,
      isClaimed: Boolean(team.userToken),
      isXIConfirmed: Boolean(team.isXIConfirmed)
    };
  }

  getStateSnapshot() {
    return {
      roomCode: this.roomCode,
      hostName: this.hostName,
      status: this.status,
      round: this.round,
      isAcceleratedRound: this.isAcceleratedRound,
      config: this.config,
      currentPlayerIndex: this.currentPlayerIndex,
      totalPlayers: this.playerQueue.length,
      currentPlayer: this.currentPlayer,
      currentBid: this.currentBid,
      leadTeam: this.leadTeam,
      leadUser: this.leadUser,
      leadTeamDetails: this.leadTeam ? this.sanitizeTeam(this.teams.get(this.leadTeam)) : null,
      timer: Math.ceil(this.timer),
      timerPrecise: parseFloat(this.timer.toFixed(1)),
      xiTimer: Math.ceil(this.xiTimer || 0),
      spectatorsCanVote: this.config.spectatorsCanVote ?? true,
      spectatorCount: this.spectatorCount || 0,
      connectedUsersCount: this.connectedUsersCount || 0,
      allTeamsXIConfirmed: this.areAllTeamsXIConfirmed(),
      bidHistory: this.bidHistory,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
      results: this.results,
      canUndo: Boolean(this.lastBidSnapshot),
      activeBattle: this.activeBattle,
      fixtures: this.fixtures || [],
      standings: this.getTournamentStandings(),
      matchMode: this.config.matchMode || 'voting'
    };
  }

  persist() {
    if (!this.db) return;
    this.db.saveRoom({
      code: this.roomCode,
      hostToken: this.hostToken,
      hostName: this.hostName,
      status: this.status,
      config: this.config,
      currentPlayerIndex: this.currentPlayerIndex,
      isAcceleratedRound: this.isAcceleratedRound
    });
  }

  destroy() {
    this.stopTimer();
    this.stopXITimer();
    this.clearTransition();
  }
}
