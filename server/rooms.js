import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AuctionEngine } from './engine.js';
import { db } from './db.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  ClaimTeamSchema,
  LeaveTeamSchema,
  PlaceBidSchema,
  HostControlSchema,
  SetPlayingXISchema,
  InitiateBattleSchema,
  CastBattleVoteSchema,
  AdvanceBattleSlotSchema,
  ResetBattleSchema,
  PlanFixturesSchema,
  StartFixtureBattleSchema,
  RecordFixtureResultSchema,
  ConcludeBattleSchema,
  SimulateFixtureSchema,
  SimulateAllFixturesSchema
} from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Teams & Players data
const TEAMS_PATH = path.resolve(__dirname, '../data/teams.json');
const PLAYERS_PATH = path.resolve(__dirname, '../data/players.json');

const teamsData = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
const playersData = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));

// Characters for clean 5-letter room codes (avoiding confusing I, 1, O, 0)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export class RoomManager {
  constructor(io = null) {
    this.io = io;
    this.activeRooms = new Map(); // roomCode -> AuctionEngine
  }

  setIO(io) {
    this.io = io;
  }

  createRoom({ hostName, userToken, config = {} }) {
    let roomCode = generateRoomCode();
    while (this.activeRooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const hostToken = userToken || crypto.randomUUID();

    const engine = new AuctionEngine({
      roomCode,
      hostToken,
      hostName,
      config,
      teamsData,
      playersData,
      emit: (event, payload) => {
        if (this.io) {
          this.io.to(roomCode).emit(event, payload);
        }
      },
      db
    });

    this.activeRooms.set(roomCode, engine);
    engine.persist();

    return {
      roomCode,
      hostToken,
      hostName,
      state: engine.getStateSnapshot()
    };
  }

  getRoom(code) {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    if (this.activeRooms.has(cleanCode)) {
      return this.activeRooms.get(cleanCode);
    }

    // Attempt to restore from SQLite DB (Server Restart recovery!)
    const savedRoom = db.getRoom(cleanCode);
    if (!savedRoom) return null;

    const savedTeams = db.getRoomTeams(cleanCode);
    const savedResults = db.getResults(cleanCode);

    const engine = new AuctionEngine({
      roomCode: cleanCode,
      hostToken: savedRoom.hostToken,
      hostName: savedRoom.hostName,
      config: savedRoom.config,
      teamsData,
      playersData,
      emit: (event, payload) => {
        if (this.io) {
          this.io.to(cleanCode).emit(event, payload);
        }
      },
      db
    });

    engine.status = savedRoom.status;
    engine.currentPlayerIndex = savedRoom.currentPlayerIndex;
    engine.isAcceleratedRound = savedRoom.isAcceleratedRound;
    engine.results = savedResults;

    // Restore claimed teams and purses
    for (const t of savedTeams) {
      const liveTeam = engine.teams.get(t.code);
      if (liveTeam) {
        liveTeam.userToken = t.userToken;
        liveTeam.userName = t.userName;
        liveTeam.purse = t.purse;
        liveTeam.isBot = t.isBot;
      }
    }

    // Reconstruct squads from results
    for (const res of savedResults) {
      if (res.status === 'sold' && res.teamCode) {
        const team = engine.teams.get(res.teamCode);
        const p = playersData.find(x => x.id === res.playerId);
        if (team && p) {
          team.squad.push({ ...p, soldPrice: res.amount });
          if (p.isOverseas) team.overseasCount++;
        }
      }
    }

    this.activeRooms.set(cleanCode, engine);
    return engine;
  }

  updateRoomPresence(roomCode, engine) {
    if (!this.io || !engine) return;
    const roomSockets = this.io.sockets.adapter.rooms.get(roomCode);
    const connectedCount = roomSockets ? roomSockets.size : 1;
    const claimedCount = Array.from(engine.teams.values()).filter(t => t.userToken && !t.isBot).length;
    engine.connectedUsersCount = connectedCount;
    engine.spectatorCount = Math.max(0, connectedCount - claimedCount);

    this.io.to(roomCode).emit('presence_update', {
      connectedUsersCount: engine.connectedUsersCount,
      spectatorCount: engine.spectatorCount,
      claimedCount
    });
  }

  setupSocketEvents(socket) {
    // 1. Join room
    socket.on('join_room', (raw, callback = () => {}) => {
      const parsed = JoinRoomSchema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues?.[0]?.message || 'Invalid input';
        return callback({ success: false, error: `Invalid input: ${issue}` });
      }

      const { roomCode, userName, userToken, hostToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) {
        return callback({ success: false, error: 'Room not found. Check code and try again.' });
      }

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userName = userName;
      socket.data.userToken = userToken || socket.id;

      // Update room presence & spectators count
      this.updateRoomPresence(roomCode, engine);

      // Check if user already owned a team in this room (reconnection!)
      let reconnectedTeam = null;
      for (const team of engine.teams.values()) {
        const matchesToken = team.userToken && team.userToken === socket.data.userToken;
        const matchesName = team.userName && userName && team.userName.trim().toLowerCase() === userName.trim().toLowerCase();
        if (matchesToken || matchesName) {
          reconnectedTeam = team.code;
          // Re-bind to current socket token so reconnected manager controls the team!
          team.userToken = socket.data.userToken;
          team.userName = userName;
          if (engine.db) {
            engine.db.saveTeam(engine.roomCode, team);
          }
          break;
        }
      }

      const isHost = Boolean(
        socket.data.userToken === engine.hostToken ||
        (hostToken && hostToken === engine.hostToken) ||
        (engine.hostName && userName && engine.hostName.trim().toLowerCase() === userName.trim().toLowerCase())
      );

      socket.data.isHost = isHost;
      this.updateRoomPresence(roomCode, engine);

      callback({
        success: true,
        isHost,
        reconnectedTeam,
        state: engine.getStateSnapshot()
      });

      this.io.to(roomCode).emit('user_joined', {
        userName,
        reconnectedTeam
      });
    });

    // 2. Claim Team
    socket.on('claim_team', (raw, callback = () => {}) => {
      const parsed = ClaimTeamSchema.safeParse(raw);
      if (!parsed.success) {
        return callback({ success: false, error: 'Invalid claim data' });
      }

      const { roomCode, teamCode, userToken, userName } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.claimTeam(teamCode, { userToken, userName });
      if (!res.success) {
        return callback({ success: false, error: res.reason });
      }

      this.updateRoomPresence(roomCode, engine);
      callback({ success: true, team: res.team });
    });

    // 3. Leave Team
    socket.on('leave_team', (raw, callback = () => {}) => {
      const parsed = LeaveTeamSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid leave data' });

      const { roomCode, teamCode, userToken, userName } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.leaveTeam(teamCode, { userToken, userName: userName || socket.data?.userName });
      this.updateRoomPresence(roomCode, engine);
      callback(res);
    });

    // 4. Place Bid
    socket.on('place_bid', (raw, callback = () => {}) => {
      const parsed = PlaceBidSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid bid data' });

      const { roomCode, teamCode, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.placeBid({
        teamCode,
        userToken,
        userName: socket.data.userName
      });

      if (!res.success) {
        return callback({ success: false, error: res.reason });
      }

      callback({ success: true, amount: res.amount });
    });

    // 5. Host Controls
    socket.on('host_control', (raw, callback = () => {}) => {
      const parsed = HostControlSchema.safeParse(raw);
      if (!parsed.success) {
        return callback({
          success: false,
          error: 'Invalid host control data: ' + (parsed.error.issues?.[0]?.message || 'validation failed')
        });
      }

      const { roomCode, hostToken, userToken, action, configUpdate } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const isAuthorized = Boolean(
        socket.data.isHost === true ||
        (hostToken && engine.hostToken === hostToken) ||
        (userToken && engine.hostToken === userToken) ||
        socket.data.userToken === engine.hostToken
      );

      if (!isAuthorized) {
        return callback({ success: false, error: 'Unauthorized: only the room host can perform this action' });
      }

      let res = { success: true };
      switch (action) {
        case 'start':
          res = engine.startAuction();
          break;
        case 'pause':
          res = engine.pauseAuction();
          break;
        case 'resume':
          res = engine.resumeAuction();
          break;
        case 'skip':
        case 'unsold':
          res = engine.skipPlayer();
          break;
        case 'undo':
          res = engine.undoLastBid();
          break;
        case 'sell_now':
          res = engine.sellNow();
          break;
        case 'next_player':
          res = engine.nextPlayer();
          break;
        case 'end':
        case 'end_auction':
          res = engine.endAuction();
          break;
        case 'plan_fixtures':
          res = engine.generateFixtures();
          break;
        case 'conclude_battle':
          res = engine.concludeActiveBattle({ userToken });
          break;
        case 'reset_fixtures':
          engine.fixtures = [];
          engine.emit('fixtures_updated', { fixtures: [] });
          engine.emit('state_sync', engine.getStateSnapshot());
          engine.persist();
          res = { success: true };
          break;
        case 'fill_bots':
          engine.updateConfig({ botsEnabled: true });
          engine.fillBots();
          break;
        case 'clear_bots':
          engine.updateConfig({ botsEnabled: false });
          engine.clearBots();
          break;
        case 'toggle_bots':
          const willEnable = !engine.config.botsEnabled;
          engine.updateConfig({ botsEnabled: willEnable });
          if (willEnable) {
            engine.fillBots();
          } else {
            engine.clearBots();
          }
          break;
        case 'advance_to_fixtures':
          res = engine.advanceToFixtures();
          break;
        case 'advance_to_playoffs':
        case 'plan_playoffs':
          res = engine.advanceToPlayoffs();
          break;
        case 'advance_to_finals':
          res = engine.advanceToFinals();
          break;
        case 'advance_tournament_stage':
          res = engine.advanceTournamentStage();
          break;
        case 'toggle_spectator_voting':
          res = engine.toggleSpectatorVoting();
          break;
        case 'jumble_players':
          res = engine.jumblePlayers();
          break;
        case 'set_match_mode':
          res = engine.setMatchMode(parsed.data.matchMode || (engine.config.matchMode === 'voting' ? 'ai_simulation' : 'voting'));
          break;
        case 'simulate_fixture':
          if (parsed.data.fixtureId) {
            res = engine.simulateFixture({ fixtureId: parsed.data.fixtureId, userToken });
          } else {
            res = { success: false, error: 'fixtureId required' };
          }
          break;
        case 'simulate_all_fixtures':
          res = engine.simulateAllFixtures({ userToken });
          break;
        case 'update_config':
          if (configUpdate) {
            res = engine.updateConfig(configUpdate);
          }
          break;
        case 'close_room':
          this.io.to(roomCode).emit('room_closed', {
            reason: 'The host has ended this auction room.'
          });
          engine.destroy();
          this.activeRooms.delete(roomCode);
          if (db) {
            db.deleteRoom(roomCode);
          }
          res = { success: true };
          break;
        case 'release_team':
          if (parsed.data.teamCode) {
            const team = engine.teams.get(parsed.data.teamCode);
            if (team) {
              team.userToken = null;
              team.userName = null;
              team.isBot = false;
              if (engine.db) {
                engine.db.saveTeam(roomCode, team);
              }
              engine.persist();
              engine.emit('team_updated', { team: engine.sanitizeTeam(team) });
              engine.emit('state_sync', engine.getStateSnapshot());
            }
          }
          res = { success: true };
          break;
        default:
          res = { success: false, error: 'Unknown action' };
      }

      if (!res.success) {
        return callback({ success: false, error: res.reason || res.error });
      }

      callback({ success: true, state: engine.getStateSnapshot() });
    });

    // 6. Set Playing XI for Franchise
    socket.on('set_playing_xi', (raw, callback = () => {}) => {
      const parsed = SetPlayingXISchema.safeParse(raw);
      if (!parsed.success) {
        return callback({ success: false, error: 'Invalid playing XI payload' });
      }
      const { roomCode, teamCode, userToken, playingXI, confirm } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.setPlayingXI(teamCode, { userToken, playingXI, confirm });
      callback(res);
    });

    // 7. Initiate 1-on-1 Head-to-Head Team Battle
    socket.on('initiate_battle', (raw, callback = () => {}) => {
      const parsed = InitiateBattleSchema.safeParse(raw);
      if (!parsed.success) {
        return callback({ success: false, error: 'Invalid battle parameters' });
      }
      const { roomCode, teamA, teamB, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.initiateBattle({ teamA, teamB, userToken });
      callback(res);
    });

    // 8. Cast Position Vote in Team Battle
    socket.on('cast_battle_vote', (raw, callback = () => {}) => {
      const parsed = CastBattleVoteSchema.safeParse(raw);
      if (!parsed.success) {
        return callback({ success: false, error: 'Invalid vote data' });
      }
      const { roomCode, slotIndex, voteTeamCode, userToken, voterTeamCode, isSuperOver } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.castBattleVote({ slotIndex, voteTeamCode, userToken, voterTeamCode, isSuperOver });
      callback(res);
    });

    // 9. Advance Battle Slot (1 through 11)
    socket.on('advance_battle_slot', (raw, callback = () => {}) => {
      const parsed = AdvanceBattleSlotSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid slot' });
      const { roomCode, slotIndex } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.advanceBattleSlot({ slotIndex });
      callback(res);
    });

    // 10. Reset Battle
    socket.on('reset_battle', (raw, callback = () => {}) => {
      const parsed = ResetBattleSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid reset payload' });
      const { roomCode } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.resetBattle();
      callback(res);
    });

    // 11. Plan Tournament Fixtures
    socket.on('plan_fixtures', (raw, callback = () => {}) => {
      const parsed = PlanFixturesSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid plan fixtures payload' });
      const { roomCode } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.generateFixtures();
      callback(res);
    });

    // 12. Start Fixture in Battle Arena
    socket.on('start_fixture_battle', (raw, callback = () => {}) => {
      const parsed = StartFixtureBattleSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid fixture battle parameters' });
      const { roomCode, fixtureId, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.startFixtureBattle({ fixtureId, userToken });
      callback(res);
    });

    // 13. Record Fixture Result
    socket.on('record_fixture_result', (raw, callback = () => {}) => {
      const parsed = RecordFixtureResultSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid result payload' });
      const { roomCode, fixtureId, scoreA, scoreB, winner, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.recordFixtureResult({ fixtureId, scoreA, scoreB, winner, userToken });
      callback(res);
    });

    // 14. Conclude Active Battle & Update Points Table
    socket.on('conclude_battle', (raw, callback = () => {}) => {
      const parsed = ConcludeBattleSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid conclude payload' });
      const { roomCode, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.concludeActiveBattle({ userToken });
      callback(res);
    });

    // 15. Simulate Fixture (AI Match Simulation based on Player Stats & Math)
    socket.on('simulate_fixture', (raw, callback = () => {}) => {
      const parsed = SimulateFixtureSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid simulate payload' });
      const { roomCode, fixtureId, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.simulateFixture({ fixtureId, userToken });
      callback(res);
    });

    // 16. Simulate All Remaining Fixtures (AI Math)
    socket.on('simulate_all_fixtures', (raw, callback = () => {}) => {
      const parsed = SimulateAllFixturesSchema.safeParse(raw);
      if (!parsed.success) return callback({ success: false, error: 'Invalid payload' });
      const { roomCode, userToken } = parsed.data;
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });

      const res = engine.simulateAllFixtures({ userToken });
      callback(res);
    });

    // 17. Leave Room
    socket.on('leave_room', ({ roomCode, userName } = {}) => {
      if (roomCode) {
        socket.leave(roomCode);
        const engine = this.getRoom(roomCode);
        if (engine) this.updateRoomPresence(roomCode, engine);
        this.io.to(roomCode).emit('user_left', { userName });
      }
    });

    // 18. Socket Disconnect
    socket.on('disconnect', () => {
      const roomCode = socket.data?.roomCode;
      if (roomCode) {
        const engine = this.getRoom(roomCode);
        if (engine) this.updateRoomPresence(roomCode, engine);
      }
    });

    // 12. Request Full State Sync (e.g. after tab blur / network reconnect)
    socket.on('request_sync', ({ roomCode }, callback = () => {}) => {
      if (!roomCode) return callback({ success: false });
      const engine = this.getRoom(roomCode);
      if (!engine) return callback({ success: false, error: 'Room not found' });
      callback({ success: true, state: engine.getStateSnapshot() });
    });
  }
}

export const roomManager = new RoomManager();
