import {
  DEFAULT_CONFIG,
  getBidIncrement,
  calculateNextBid,
  calculateMaxPermissibleBid,
  validateBid,
  formatLakhs
} from './rules.js';

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
        locked: false
      });
    }

    // Initialize Players & Queues
    this.allPlayers = [...playersData];
    this.playerQueue = [...playersData];
    this.unsoldQueue = [];
    this.currentPlayerIndex = 0;
    this.currentPlayer = null;

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

    // Post-Auction Head-to-Head 1-on-1 Battle Arena
    this.activeBattle = null;
  }

  // --- LOBBY METHODS ---

  claimTeam(teamCode, { userToken, userName }) {
    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Team does not exist' };

    // Check if claimed by someone else
    if (team.userToken && team.userToken !== userToken) {
      return { success: false, reason: `Team is already claimed by ${team.userName}` };
    }

    // Vacate any previous team this user owned in this room
    for (const [code, t] of this.teams.entries()) {
      if (t.userToken === userToken && code !== teamCode) {
        t.userToken = null;
        t.userName = null;
        t.isBot = false;
      }
    }

    team.userToken = userToken;
    team.userName = userName;
    team.isBot = false;

    this.persist();
    this.emit('team_updated', { team: this.sanitizeTeam(team) });
    return { success: true, team: this.sanitizeTeam(team) };
  }

  leaveTeam(teamCode, { userToken }) {
    const team = this.teams.get(teamCode);
    if (!team) return { success: false, reason: 'Team does not exist' };

    if (team.userToken === userToken) {
      team.userToken = null;
      team.userName = null;
      team.isBot = false;
      this.persist();
      this.emit('team_updated', { team: this.sanitizeTeam(team) });
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
    this.status = 'completed';

    // Auto-generate default Playing XI for any franchises that don't have one set yet
    for (const team of this.teams.values()) {
      if (!team.playingXI || team.playingXI.length === 0) {
        team.playingXI = this.generateDefaultPlayingXI(team);
      }
    }

    this.emit('auction_status_changed', { status: this.status });
    this.emit('auction_completed', {
      results: this.results,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
      activeBattle: this.activeBattle
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

  setPlayingXI(teamCode, { userToken, playingXI }) {
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
    this.persist();
    this.emit('team_updated', { team: this.sanitizeTeam(team) });
    this.emit('playing_xi_updated', {
      teamCode,
      playingXI,
      team: this.sanitizeTeam(team)
    });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, playingXI: team.playingXI };
  }

  // --- HEAD-TO-HEAD BATTLE ARENA & POSITION-BY-POSITION VOTING ---

  initiateBattle({ teamA, teamB, userToken }) {
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

  castBattleVote({ slotIndex, voteTeamCode, userToken, voterTeamCode }) {
    if (!this.activeBattle) {
      return { success: false, reason: 'No active team battle' };
    }

    const { teamA, teamB } = this.activeBattle;
    if (voteTeamCode !== teamA && voteTeamCode !== teamB) {
      return { success: false, reason: 'Vote must be for one of the competing franchises' };
    }

    // If voter belongs to one of the competing teams, prompt requested remaining teams to vote!
    const activeHumanTeams = Array.from(this.teams.values()).filter(t => t.userToken && !t.isBot);
    if (activeHumanTeams.length > 2 && (voterTeamCode === teamA || voterTeamCode === teamB)) {
      return {
        success: false,
        reason: 'As a competing franchise manager, you cannot vote. Only remaining neutral franchises can vote!'
      };
    }

    const slotKey = String(slotIndex);
    if (!this.activeBattle.votes[slotKey]) {
      this.activeBattle.votes[slotKey] = {};
    }

    this.activeBattle.votes[slotKey][userToken] = {
      voteTeamCode,
      voterTeamCode: voterTeamCode || null,
      timestamp: Date.now()
    };

    this.persist();
    this.emit('battle_updated', { battle: this.activeBattle });
    this.emit('state_sync', this.getStateSnapshot());
    return { success: true, battle: this.activeBattle };
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
      isClaimed: Boolean(team.userToken)
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
      bidHistory: this.bidHistory,
      teams: Array.from(this.teams.values()).map(t => this.sanitizeTeam(t)),
      results: this.results,
      canUndo: Boolean(this.lastBidSnapshot),
      activeBattle: this.activeBattle
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
    this.clearTransition();
  }
}
