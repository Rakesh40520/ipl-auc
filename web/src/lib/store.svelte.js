import { io } from 'socket.io-client';
import { playGavel, playBid, playCountdownBeep, playSoldChime } from './audio.js';
import { triggerConfetti, getFranchise } from './utils.js';

// Storage keys: tab-specific session in sessionStorage, room host keys in localStorage
const SESSION_KEY = 'ipl_auction_tab_session';
const HOST_KEYS = 'ipl_auction_host_keys';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(data) {
  try {
    const existing = loadSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...data }));
  } catch {}
}

function getHostTokenForRoom(roomCode) {
  try {
    const raw = localStorage.getItem(HOST_KEYS);
    const map = raw ? JSON.parse(raw) : {};
    return map[roomCode.toUpperCase()] || null;
  } catch {
    return null;
  }
}

function saveHostTokenForRoom(roomCode, token) {
  try {
    const raw = localStorage.getItem(HOST_KEYS);
    const map = raw ? JSON.parse(raw) : {};
    map[roomCode.toUpperCase()] = token;
    localStorage.setItem(HOST_KEYS, JSON.stringify(map));
  } catch {}
}

const USER_ROOM_KEYS = 'ipl_auction_user_room_keys';

function getUserRoomData(roomCode) {
  try {
    const raw = localStorage.getItem(USER_ROOM_KEYS);
    const map = raw ? JSON.parse(raw) : {};
    return map[roomCode.toUpperCase()] || null;
  } catch {
    return null;
  }
}

function saveUserRoomData(roomCode, data) {
  try {
    const raw = localStorage.getItem(USER_ROOM_KEYS);
    const map = raw ? JSON.parse(raw) : {};
    map[roomCode.toUpperCase()] = { ...(map[roomCode.toUpperCase()] || {}), ...data };
    localStorage.setItem(USER_ROOM_KEYS, JSON.stringify(map));
  } catch {}
}

export class AuctionStore {
  // Reactive Svelte 5 State
  connected = $state(false);
  isReconnecting = $state(false);
  reconnectAttempts = $state(0);
  view = $state('home'); // home, lobby, auction, squads, results
  roomCode = $state('');
  userName = $state('');
  userToken = $state('');
  hostToken = $state(null);
  isHost = $state(false);
  myTeamCode = $state(null);
  notification = $state(null);

  // Full Room Snapshot State
  roomState = $state({
    status: 'lobby',
    round: 1,
    isAcceleratedRound: false,
    config: {},
    currentPlayerIndex: 0,
    totalPlayers: 0,
    currentPlayer: null,
    currentBid: 0,
    leadTeam: null,
    leadUser: null,
    leadTeamDetails: null,
    timer: 10,
    timerPrecise: 10.0,
    xiTimer: 90,
    spectatorsCanVote: true,
    allTeamsXIConfirmed: false,
    bidHistory: [],
    teams: [],
    results: [],
    canUndo: false,
    activeBattle: null,
    fixtures: [],
    standings: [],
    matchMode: 'voting'
  });

  // Sold/Unsold Celebration overlay state
  stamp = $state({
    visible: false,
    type: 'sold', // 'sold' | 'unsold'
    teamName: '',
    teamColor: '',
    amount: 0,
    playerName: ''
  });

  socket = null;

  constructor() {
    const session = loadSession();
    this.userToken = session.userToken || crypto.randomUUID();
    this.userName = session.userName || '';
    this.roomCode = session.roomCode || '';
    this.myTeamCode = session.myTeamCode || null;

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlRoom = params.get('room') || params.get('code');
        if (urlRoom) {
          this.roomCode = urlRoom.trim().toUpperCase();
        }
      } catch (e) {
        // ignore
      }
    }

    if (this.roomCode) {
      const savedUser = getUserRoomData(this.roomCode);
      if (savedUser) {
        if (savedUser.userToken) this.userToken = savedUser.userToken;
        if (savedUser.userName && !this.userName) this.userName = savedUser.userName;
        if (savedUser.myTeamCode && !this.myTeamCode) this.myTeamCode = savedUser.myTeamCode;
      }
    }

    saveSession({ userToken: this.userToken });
  }

  init() {
    if (this.socket) return;

    this.socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      if (this.roomCode && this.userName) {
        this.joinRoom(this.roomCode, this.userName, true);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.isReconnecting = true;
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', () => {
      this.connected = false;
      this.isReconnecting = true;
    });

    if (this.socket.io) {
      this.socket.io.on('reconnect_attempt', (attempt) => {
        this.isReconnecting = true;
        this.reconnectAttempts = attempt;
      });

      this.socket.io.on('reconnect', () => {
        this.connected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.notify('Connection restored! State synchronized.');
        if (this.roomCode && this.userName) {
          this.joinRoom(this.roomCode, this.userName, true);
        }
      });

      this.socket.io.on('reconnect_error', () => {
        this.isReconnecting = true;
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify('Network online. Reconnecting…');
        this.reconnectNow();
      });
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.connected) {
          this.reconnectNow();
        }
      });
    }

    // --- REALTIME SERVER EVENTS ---

    this.socket.on('presence_update', (data) => {
      if (data.connectedUsersCount !== undefined) {
        this.roomState.connectedUsersCount = data.connectedUsersCount;
      }
      if (data.spectatorCount !== undefined) {
        this.roomState.spectatorCount = data.spectatorCount;
      }
    });

    this.socket.on('state_sync', (state) => {
      this.roomState = state;
      this.updateViewBasedOnState();
    });

    this.socket.on('auction_status_changed', ({ status }) => {
      this.roomState.status = status;
      this.updateViewBasedOnState();
    });

    this.socket.on('player_presented', (payload) => {
      this.roomState.currentPlayer = payload.player;
      this.roomState.currentPlayerIndex = payload.index;
      this.roomState.totalPlayers = payload.total;
      this.roomState.round = payload.round;
      this.roomState.isAcceleratedRound = payload.isAcceleratedRound;
      this.roomState.currentBid = payload.currentBid;
      this.roomState.timer = payload.timer;
      this.roomState.timerPrecise = payload.timer;
      this.roomState.leadTeam = null;
      this.roomState.leadUser = null;
      this.roomState.leadTeamDetails = null;
      this.roomState.bidHistory = [];
      this.roomState.canUndo = false;
      this.stamp.visible = false;

      if (payload.teams) {
        this.roomState.teams = payload.teams;
      }
      if (this.view === 'lobby') {
        this.view = 'auction';
      }

      playGavel();
    });

    this.socket.on('timer_tick', ({ timer, precise }) => {
      this.roomState.timer = timer;
      this.roomState.timerPrecise = precise;

      if (timer <= 3 && timer > 0) {
        playCountdownBeep(true);
      }
    });

    this.socket.on('bid_placed', (payload) => {
      this.roomState.currentBid = payload.currentBid;
      this.roomState.leadTeam = payload.leadTeam;
      this.roomState.leadTeamDetails = payload.leadTeamDetails;
      this.roomState.leadUser = payload.leadUser;
      this.roomState.bidHistory = payload.bidHistory;
      this.roomState.timer = payload.timer;
      this.roomState.timerPrecise = payload.timer;
      this.roomState.canUndo = true;

      if (payload.teams) {
        this.roomState.teams = payload.teams;
      }

      playBid();
    });

    this.socket.on('bid_undone', (payload) => {
      this.roomState.currentBid = payload.currentBid;
      this.roomState.leadTeam = payload.leadTeam;
      this.roomState.leadTeamDetails = payload.leadTeamDetails;
      this.roomState.leadUser = payload.leadUser;
      this.roomState.bidHistory = payload.bidHistory;
      this.roomState.timer = payload.timer;
      this.roomState.timerPrecise = payload.timer;
      this.roomState.canUndo = false;
    });

    this.socket.on('player_sold', (payload) => {
      playSoldChime();

      const franchise = getFranchise(payload.team?.code);
      this.stamp = {
        visible: true,
        type: 'sold',
        teamName: payload.team?.name || payload.team?.code,
        teamColor: franchise.primary,
        amount: payload.amount,
        playerName: payload.player?.name
      };

      if (payload.isMarquee || this.myTeamCode === payload.team?.code) {
        triggerConfetti(franchise.primary);
      }

      if (payload.teams) {
        this.roomState.teams = payload.teams;
      } else {
        const targetTeam = this.roomState.teams.find(t => t.code === payload.team?.code);
        if (targetTeam) {
          targetTeam.purse = payload.team.purse;
          targetTeam.squadCount = payload.team.squadCount;
          targetTeam.overseasCount = payload.team.overseasCount;
          targetTeam.squad = payload.team.squad;
        }
      }

      if (payload.results) {
        this.roomState.results = payload.results;
      }
    });

    this.socket.on('player_unsold', (payload) => {
      this.stamp = {
        visible: true,
        type: 'unsold',
        teamName: '',
        teamColor: '#8a87a8',
        amount: 0,
        playerName: payload.player?.name
      };

      if (payload.teams) {
        this.roomState.teams = payload.teams;
      }

      if (payload.results) {
        this.roomState.results = payload.results;
      }
    });

    this.socket.on('team_updated', ({ team }) => {
      const idx = this.roomState.teams.findIndex(t => t.code === team.code);
      if (idx !== -1) {
        this.roomState.teams[idx] = team;
      }
      if (team.userToken === this.userToken) {
        this.myTeamCode = team.code;
        saveSession({ myTeamCode: team.code });
      } else if (this.myTeamCode === team.code && !team.userToken) {
        this.myTeamCode = null;
        saveSession({ myTeamCode: null });
      }
    });

    this.socket.on('accelerated_round_started', () => {
      this.notify('Accelerated Round starting for unsold players!');
    });

    this.socket.on('xi_selection_started', (payload) => {
      this.roomState.status = payload.status || 'playing_xi_selection';
      this.roomState.xiTimer = payload.timer || 90;
      if (payload.teams) this.roomState.teams = payload.teams;
      if (payload.fixtures) this.roomState.fixtures = payload.fixtures;
      this.view = 'results';
      this.notify('Auction ended! Select and lock in your franchise Playing XI!');
    });

    this.socket.on('xi_timer_tick', ({ timer }) => {
      this.roomState.xiTimer = timer;
    });

    this.socket.on('all_teams_ready', () => {
      this.roomState.allTeamsXIConfirmed = true;
      this.notify('All franchises have locked in their Playing XI! Host can start the matches.');
    });

    this.socket.on('super_over_started', ({ battle }) => {
      this.roomState.activeBattle = battle;
      this.notify('MATCH TIED! Super Over sudden-death tie-breaker initiated!');
      playGavel();
    });

    this.socket.on('config_updated', ({ config }) => {
      this.roomState.config = config;
      if (config.spectatorsCanVote !== undefined) {
        this.roomState.spectatorsCanVote = config.spectatorsCanVote;
      }
    });

    this.socket.on('auction_completed', (payload) => {
      this.roomState.status = 'completed';
      if (payload.results) {
        this.roomState.results = payload.results;
      }
      if (payload.teams) {
        this.roomState.teams = payload.teams;
      }
      if (payload.activeBattle !== undefined) {
        this.roomState.activeBattle = payload.activeBattle;
      }
      if (payload.fixtures) {
        this.roomState.fixtures = payload.fixtures;
      }
      if (payload.standings) {
        this.roomState.standings = payload.standings;
      }
      this.view = 'results';
      triggerConfetti('#f4c20d');
    });

    this.socket.on('playing_xi_updated', ({ teamCode, playingXI, team, isConfirmed, allConfirmed }) => {
      const idx = this.roomState.teams.findIndex(t => t.code === teamCode);
      if (idx !== -1) {
        this.roomState.teams[idx].playingXI = playingXI;
        if (isConfirmed !== undefined) {
          this.roomState.teams[idx].isXIConfirmed = isConfirmed;
        }
        if (team) this.roomState.teams[idx] = team;
      }
      if (allConfirmed !== undefined) {
        this.roomState.allTeamsXIConfirmed = allConfirmed;
      }
    });

    this.socket.on('battle_updated', ({ battle }) => {
      this.roomState.activeBattle = battle;
    });

    this.socket.on('queue_jumbled', (payload) => {
      this.notify(`Player queue jumbled randomly (${payload.totalRemaining} players)!`);
    });

    this.socket.on('match_mode_changed', ({ matchMode }) => {
      this.roomState.matchMode = matchMode;
      this.notify(`Tournament mode set to: ${matchMode === 'ai_simulation' ? 'AI Match Simulation (Stats & Scorecards)' : 'Community Jury Voting'}`);
    });

    this.socket.on('fixture_simulated', ({ fixture, scorecard }) => {
      const idx = this.roomState.fixtures.findIndex(f => f.id === fixture.id);
      if (idx !== -1) {
        this.roomState.fixtures[idx] = fixture;
      }
      this.notify(`Match #${fixture.matchNumber}: ${scorecard.margin}! POTM: ${scorecard.playerOfTheMatch?.name}`);
    });

    this.socket.on('all_fixtures_simulated', ({ count }) => {
      this.notify(`All ${count} remaining match fixtures simulated by AI!`);
    });

    this.socket.on('fixtures_updated', ({ fixtures, error }) => {
      if (fixtures) {
        this.roomState.fixtures = fixtures;
      }
      if (error) {
        this.notify(error);
      }
    });

    this.socket.on('room_closed', ({ reason } = {}) => {
      this.notify(reason || 'The auction room was closed by the host.');
      this.leaveRoom(false);
    });
  }

  notify(msg) {
    this.notification = msg;
    setTimeout(() => {
      if (this.notification === msg) this.notification = null;
    }, 3500);
  }

  updateViewBasedOnState() {
    if (this.view === 'home') return;
    if (this.roomState.status === 'completed' || this.roomState.status === 'playing_xi_selection') {
      if (this.view === 'auction' || this.view === 'lobby' || !this.view) {
        this.view = 'results';
      }
    } else if (this.roomState.status === 'lobby') {
      if (this.view !== 'squads') {
        this.view = 'lobby';
      }
    } else {
      if (this.view !== 'squads' && this.view !== 'results') {
        this.view = 'auction';
      }
    }
  }

  // --- ACTIONS ---

  async createRoom(hostName, config = {}) {
    this.userName = hostName;
    saveSession({ userName: hostName });

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, userToken: this.userToken, config })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      this.roomCode = data.roomCode;
      this.isHost = true;
      this.hostToken = data.hostToken || this.userToken;
      this.roomState = data.state;
      this.view = 'lobby';

      saveSession({
        roomCode: data.roomCode,
        userName: hostName
      });

      saveHostTokenForRoom(data.roomCode, this.hostToken);

      // Join socket room as host
      await this.joinRoom(data.roomCode, hostName);
      this.isHost = true;
      return { success: true, roomCode: data.roomCode };
    } catch (err) {
      this.notify(err.message);
      return { success: false, error: err.message };
    }
  }

  joinRoom(code, name, isSilent = false) {
    const cleanCode = (code || '').trim().toUpperCase();
    const cleanName = (name || '').trim();
    this.roomCode = cleanCode;
    this.userName = cleanName;
    saveSession({ roomCode: cleanCode, userName: cleanName });

    const savedUserData = getUserRoomData(cleanCode);
    const effectiveUserToken = savedUserData?.userToken || this.userToken || null;
    const savedHostToken = getHostTokenForRoom(cleanCode) || this.hostToken || null;

    return new Promise((resolve) => {
      this.socket.emit('join_room', {
        roomCode: cleanCode,
        userName: cleanName,
        userToken: effectiveUserToken,
        hostToken: savedHostToken
      }, (res) => {
        if (!res.success) {
          if (!isSilent) this.notify(res.error || 'Could not join room');
          resolve(res);
          return;
        }

        this.roomState = res.state;
        // Strictly set isHost from server's verified response!
        this.isHost = Boolean(res.isHost);
        if (this.isHost && savedHostToken) {
          this.hostToken = savedHostToken;
        }

        const resolvedTeam = res.reconnectedTeam || savedUserData?.myTeamCode || null;
        if (resolvedTeam) {
          this.myTeamCode = resolvedTeam;
          saveSession({ myTeamCode: resolvedTeam });
        }

        saveUserRoomData(cleanCode, {
          userToken: effectiveUserToken,
          userName: cleanName,
          myTeamCode: this.myTeamCode
        });

        if (res.reconnectedTeam) {
          this.notify(`Reconnected to ${res.reconnectedTeam}!`);
        }

        // For intentional joins, always navigate
        if (!isSilent) {
          const status = res.state?.status || 'lobby';
          if (status === 'completed') {
            this.view = 'results';
          } else if (status === 'lobby') {
            this.view = 'lobby';
          } else {
            this.view = 'auction';
          }
        } else {
          this.updateViewBasedOnState();
        }
        resolve(res);
      });
    });
  }

  reconnectNow() {
    if (!this.socket) {
      this.init();
      return;
    }
    if (!this.connected) {
      this.socket.connect();
    }
    if (this.roomCode && this.userName) {
      this.joinRoom(this.roomCode, this.userName, true);
    }
  }

  claimTeam(teamCode) {
    // Eagerly vacate previous team in local state so UI unlocks old team immediately
    if (this.myTeamCode && this.myTeamCode !== teamCode && Array.isArray(this.roomState?.teams)) {
      const prevTeam = this.roomState.teams.find(t => t.code === this.myTeamCode);
      if (prevTeam) {
        prevTeam.userToken = null;
        prevTeam.userName = null;
        prevTeam.isClaimed = false;
        prevTeam.isBot = false;
      }
    }

    return new Promise((resolve) => {
      this.socket.emit('claim_team', {
        roomCode: this.roomCode,
        teamCode,
        userToken: this.userToken,
        userName: this.userName
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Failed to claim team');
        } else {
          this.myTeamCode = teamCode;
          saveSession({ myTeamCode: teamCode });
          saveUserRoomData(this.roomCode, {
            userToken: this.userToken,
            userName: this.userName,
            myTeamCode: teamCode
          });
        }
        resolve(res);
      });
    });
  }

  leaveTeam(teamCode) {
    if (Array.isArray(this.roomState?.teams)) {
      const tObj = this.roomState.teams.find(t => t.code === teamCode);
      if (tObj) {
        tObj.userToken = null;
        tObj.userName = null;
        tObj.isClaimed = false;
        tObj.isBot = false;
      }
    }

    return new Promise((resolve) => {
      this.socket.emit('leave_team', {
        roomCode: this.roomCode,
        teamCode,
        userToken: this.userToken,
        userName: this.userName
      }, (res) => {
        if (res.success) {
          this.myTeamCode = null;
          saveSession({ myTeamCode: null });
          saveUserRoomData(this.roomCode, { myTeamCode: null });
        }
        resolve(res);
      });
    });
  }

  placeBid() {
    if (!this.myTeamCode) {
      this.notify('You must claim a franchise to place bids!');
      return;
    }

    return new Promise((resolve) => {
      this.socket.emit('place_bid', {
        roomCode: this.roomCode,
        teamCode: this.myTeamCode,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Bid rejected');
        }
        resolve(res);
      });
    });
  }

  hostControl(action, extra = {}) {
    const hostToken = getHostTokenForRoom(this.roomCode) || this.hostToken || this.userToken;

    return new Promise((resolve) => {
      this.socket.emit('host_control', {
        roomCode: this.roomCode,
        hostToken,
        userToken: this.userToken,
        action,
        ...extra
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Host action failed');
        }
        resolve(res);
      });
    });
  }

  leaveRoom(closeForAll = false) {
    if (closeForAll && this.isHost && this.roomCode) {
      this.hostControl('close_room');
      return;
    }

    if (this.socket && this.roomCode) {
      this.socket.emit('leave_room', {
        roomCode: this.roomCode,
        userName: this.userName
      });
    }

    this.roomCode = '';
    this.myTeamCode = null;
    this.isHost = false;
    this.hostToken = null;
    this.view = 'home';
    this.roomState = this.getDefaultRoomState();
    saveSession({ roomCode: '', myTeamCode: null });
  }

  getDefaultRoomState() {
    return {
      status: 'lobby',
      round: 1,
      isAcceleratedRound: false,
      config: {},
      currentPlayerIndex: 0,
      totalPlayers: 0,
      currentPlayer: null,
      currentBid: 0,
      leadTeam: null,
      leadUser: null,
      leadTeamDetails: null,
      timer: 10,
      timerPrecise: 10.0,
      bidHistory: [],
      teams: [],
      results: [],
      canUndo: false,
      activeBattle: null
    };
  }

  setPlayingXI(teamCode, playingXI, confirm = false) {
    return new Promise((resolve) => {
      this.socket.emit('set_playing_xi', {
        roomCode: this.roomCode,
        teamCode,
        userToken: this.userToken,
        playingXI,
        confirm
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Failed to update Playing XI');
        } else {
          this.notify(confirm ? 'Playing XI locked in & confirmed!' : 'Playing XI saved successfully!');
        }
        resolve(res);
      });
    });
  }

  advanceToFixtures() {
    return this.hostControl('advance_to_fixtures');
  }

  toggleSpectatorVoting() {
    return this.hostControl('toggle_spectator_voting');
  }

  initiateBattle(teamA, teamB) {
    return new Promise((resolve) => {
      this.socket.emit('initiate_battle', {
        roomCode: this.roomCode,
        teamA,
        teamB,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Failed to start battle');
        } else {
          this.notify(`Battle Clash: ${teamA} vs ${teamB} initiated!`);
        }
        resolve(res);
      });
    });
  }

  castBattleVote(slotIndex, voteTeamCode, isSuperOver = false) {
    return new Promise((resolve) => {
      this.socket.emit('cast_battle_vote', {
        roomCode: this.roomCode,
        slotIndex,
        voteTeamCode,
        userToken: this.userToken,
        voterTeamCode: this.myTeamCode,
        isSuperOver
      }, (res) => {
        if (!res.success) {
          this.notify(res.error || 'Vote rejected');
        }
        resolve(res);
      });
    });
  }

  advanceBattleSlot(slotIndex) {
    return new Promise((resolve) => {
      this.socket.emit('advance_battle_slot', {
        roomCode: this.roomCode,
        slotIndex,
        userToken: this.userToken
      }, resolve);
    });
  }

  resetBattle() {
    return new Promise((resolve) => {
      this.socket.emit('reset_battle', {
        roomCode: this.roomCode,
        userToken: this.userToken
      }, resolve);
    });
  }

  planFixtures() {
    return new Promise((resolve) => {
      this.socket.emit('plan_fixtures', {
        roomCode: this.roomCode,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Failed to plan fixtures');
        } else {
          this.notify(`Successfully planned ${res.fixtures?.length || 0} match fixtures!`);
        }
        resolve(res);
      });
    });
  }

  startFixtureBattle(fixtureId) {
    return new Promise((resolve) => {
      this.socket.emit('start_fixture_battle', {
        roomCode: this.roomCode,
        fixtureId,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Failed to start fixture battle');
        } else {
          this.notify(`Match #${res.fixture?.matchNumber}: ${res.fixture?.teamA} vs ${res.fixture?.teamB} started in Arena!`);
        }
        resolve(res);
      });
    });
  }

  recordFixtureResult(fixtureId, scoreA, scoreB, winner) {
    return new Promise((resolve) => {
      this.socket.emit('record_fixture_result', {
        roomCode: this.roomCode,
        fixtureId,
        scoreA,
        scoreB,
        winner,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Failed to record result');
        } else {
          this.notify(`Match result recorded! Standings updated.`);
        }
        resolve(res);
      });
    });
  }

  concludeBattle() {
    return new Promise((resolve) => {
      this.socket.emit('conclude_battle', {
        roomCode: this.roomCode,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Failed to conclude battle');
        } else {
          this.notify('Battle concluded and points recorded in tournament standings!');
        }
        resolve(res);
      });
    });
  }

  jumblePlayers() {
    return this.hostControl('jumble_players');
  }

  setMatchMode(mode) {
    return this.hostControl('set_match_mode', { matchMode: mode });
  }

  simulateFixture(fixtureId) {
    return new Promise((resolve) => {
      this.socket.emit('simulate_fixture', {
        roomCode: this.roomCode,
        fixtureId,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Match simulation failed');
        }
        resolve(res);
      });
    });
  }

  simulateAllFixtures() {
    return new Promise((resolve) => {
      this.socket.emit('simulate_all_fixtures', {
        roomCode: this.roomCode,
        userToken: this.userToken
      }, (res) => {
        if (!res.success) {
          this.notify(res.reason || res.error || 'Simulation failed');
        }
        resolve(res);
      });
    });
  }

  requestSync() {
    if (!this.roomCode) return;
    this.socket.emit('request_sync', { roomCode: this.roomCode }, (res) => {
      if (res.success) {
        this.roomState = res.state;
      }
    });
  }
}

export const store = new AuctionStore();
