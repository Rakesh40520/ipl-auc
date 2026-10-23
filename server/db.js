import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'auction.sqlite');

export class AuctionDB {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        host_token TEXT NOT NULL,
        host_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby',
        config_json TEXT NOT NULL,
        current_player_index INTEGER DEFAULT 0,
        is_accelerated INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_teams (
        room_code TEXT NOT NULL,
        team_code TEXT NOT NULL,
        user_token TEXT,
        user_name TEXT,
        purse_remaining INTEGER NOT NULL,
        is_bot INTEGER DEFAULT 0,
        PRIMARY KEY (room_code, team_code),
        FOREIGN KEY (room_code) REFERENCES rooms (code) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auction_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        player_id TEXT NOT NULL,
        team_code TEXT,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL, /* 'sold' or 'unsold' */
        round INTEGER NOT NULL DEFAULT 1,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (room_code) REFERENCES rooms (code) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auction_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        player_id TEXT NOT NULL,
        team_code TEXT NOT NULL,
        amount INTEGER NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS match_fixtures (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        match_number INTEGER,
        stage TEXT NOT NULL DEFAULT 'league',
        format TEXT NOT NULL DEFAULT 'T20',
        team_a TEXT NOT NULL,
        team_b TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        winner TEXT,
        margin TEXT,
        seed TEXT,
        scorecard_json TEXT,
        completed_at INTEGER,
        FOREIGN KEY (room_code) REFERENCES rooms (code) ON DELETE CASCADE
      );
    `);
  }

  saveRoom(room) {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (code, host_token, host_name, status, config_json, current_player_index, is_accelerated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        status = excluded.status,
        config_json = excluded.config_json,
        current_player_index = excluded.current_player_index,
        is_accelerated = excluded.is_accelerated,
        updated_at = excluded.updated_at
    `);
    const now = Date.now();
    stmt.run(
      room.code,
      room.hostToken,
      room.hostName,
      room.status || 'lobby',
      JSON.stringify(room.config || {}),
      room.currentPlayerIndex || 0,
      room.isAcceleratedRound ? 1 : 0,
      room.createdAt || now,
      now
    );
  }

  getRoom(code) {
    const stmt = this.db.prepare(`SELECT * FROM rooms WHERE code = ?`);
    const row = stmt.get(code);
    if (!row) return null;
    return {
      code: row.code,
      hostToken: row.host_token,
      hostName: row.host_name,
      status: row.status,
      config: JSON.parse(row.config_json),
      currentPlayerIndex: row.current_player_index,
      isAcceleratedRound: Boolean(row.is_accelerated),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  listActiveRooms() {
    const stmt = this.db.prepare(`SELECT * FROM rooms ORDER BY updated_at DESC LIMIT 50`);
    return stmt.all().map(row => ({
      code: row.code,
      hostName: row.host_name,
      status: row.status,
      config: JSON.parse(row.config_json),
      updatedAt: row.updated_at
    }));
  }

  saveTeam(roomCode, team) {
    const stmt = this.db.prepare(`
      INSERT INTO room_teams (room_code, team_code, user_token, user_name, purse_remaining, is_bot)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_code, team_code) DO UPDATE SET
        user_token = excluded.user_token,
        user_name = excluded.user_name,
        purse_remaining = excluded.purse_remaining,
        is_bot = excluded.is_bot
    `);
    stmt.run(
      roomCode,
      team.code,
      team.userToken || null,
      team.userName || null,
      team.purse,
      team.isBot ? 1 : 0
    );
  }

  getRoomTeams(roomCode) {
    const stmt = this.db.prepare(`SELECT * FROM room_teams WHERE room_code = ?`);
    return stmt.all(roomCode).map(r => ({
      code: r.team_code,
      userToken: r.user_token,
      userName: r.user_name,
      purse: r.purse_remaining,
      isBot: Boolean(r.is_bot)
    }));
  }

  recordBid({ roomCode, playerId, teamCode, amount }) {
    const stmt = this.db.prepare(`
      INSERT INTO auction_bids (room_code, player_id, team_code, amount, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(roomCode, playerId, teamCode, amount, Date.now());
  }

  recordResult({ roomCode, playerId, teamCode, amount, status, round = 1 }) {
    const stmt = this.db.prepare(`
      INSERT INTO auction_results (room_code, player_id, team_code, amount, status, round, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(roomCode, playerId, teamCode || null, amount, status, round, Date.now());
  }

  getResults(roomCode) {
    const stmt = this.db.prepare(`
      SELECT * FROM auction_results WHERE room_code = ? ORDER BY id ASC
    `);
    return stmt.all(roomCode).map(r => ({
      id: r.id,
      playerId: r.player_id,
      teamCode: r.team_code,
      amount: r.amount,
      status: r.status,
      round: r.round,
      timestamp: r.timestamp
    }));
  }

  deleteRoom(roomCode) {
    this.db.prepare(`DELETE FROM rooms WHERE code = ?`).run(roomCode);
    this.db.prepare(`DELETE FROM room_teams WHERE room_code = ?`).run(roomCode);
    this.db.prepare(`DELETE FROM auction_results WHERE room_code = ?`).run(roomCode);
    this.db.prepare(`DELETE FROM auction_bids WHERE room_code = ?`).run(roomCode);
    this.db.prepare(`DELETE FROM match_fixtures WHERE room_code = ?`).run(roomCode);
  }

  saveFixtureMatch(roomCode, fixture) {
    const stmt = this.db.prepare(`
      INSERT INTO match_fixtures (id, room_code, match_number, stage, format, team_a, team_b, status, winner, margin, seed, scorecard_json, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        room_code = excluded.room_code,
        match_number = excluded.match_number,
        stage = excluded.stage,
        format = excluded.format,
        team_a = excluded.team_a,
        team_b = excluded.team_b,
        status = excluded.status,
        winner = excluded.winner,
        margin = excluded.margin,
        seed = excluded.seed,
        scorecard_json = excluded.scorecard_json,
        completed_at = excluded.completed_at
    `);
    stmt.run(
      fixture.id,
      roomCode,
      fixture.matchNumber || 0,
      fixture.stage || 'league',
      fixture.format || fixture.scorecard?.format || 'T20',
      fixture.teamA,
      fixture.teamB,
      fixture.status || 'scheduled',
      fixture.winner || null,
      fixture.margin || fixture.scorecard?.margin || null,
      fixture.seed ? String(fixture.seed) : (fixture.scorecard?.seed ? String(fixture.scorecard.seed) : null),
      fixture.scorecard ? JSON.stringify(fixture.scorecard) : null,
      fixture.completedAt || (fixture.status === 'completed' ? Date.now() : null)
    );
  }

  getFixtureMatch(fixtureId) {
    const stmt = this.db.prepare(`SELECT * FROM match_fixtures WHERE id = ?`);
    const row = stmt.get(fixtureId);
    if (!row) return null;
    return {
      id: row.id,
      roomCode: row.room_code,
      matchNumber: row.match_number,
      stage: row.stage,
      format: row.format,
      teamA: row.team_a,
      teamB: row.team_b,
      status: row.status,
      winner: row.winner,
      margin: row.margin,
      seed: row.seed,
      scorecard: row.scorecard_json ? JSON.parse(row.scorecard_json) : null,
      completedAt: row.completed_at
    };
  }

  getRoomFixtures(roomCode) {
    const stmt = this.db.prepare(`SELECT * FROM match_fixtures WHERE room_code = ? ORDER BY match_number ASC`);
    return stmt.all(roomCode).map(row => ({
      id: row.id,
      roomCode: row.room_code,
      matchNumber: row.match_number,
      stage: row.stage,
      format: row.format,
      teamA: row.team_a,
      teamB: row.team_b,
      status: row.status,
      winner: row.winner,
      margin: row.margin,
      seed: row.seed,
      scorecard: row.scorecard_json ? JSON.parse(row.scorecard_json) : null,
      completedAt: row.completed_at
    }));
  }

  close() {
    this.db.close();
  }
}

export const db = new AuctionDB();
