import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ClientIO } from 'socket.io-client';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { roomManager } from '../server/rooms.js';
import { CreateRoomSchema } from '../server/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('End-to-End IPL Auction Integration Test', () => {
  let fastify;
  let serverPort;
  let socket1;
  let socket2;

  before(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(fastifyCors, { origin: true });

    fastify.post('/api/rooms', async (req, reply) => {
      const parsed = CreateRoomSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid' });
      return roomManager.createRoom(parsed.data);
    });

    fastify.get('/api/health', async () => {
      const mem = process.memoryUsage();
      return {
        status: 'ok',
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
        },
        activeRooms: roomManager.activeRooms.size
      };
    });

    const io = new Server(fastify.server, { cors: { origin: '*' } });
    roomManager.setIO(io);
    io.on('connection', (s) => roomManager.setupSocketEvents(s));

    await fastify.listen({ port: 0, host: '127.0.0.1' });
    serverPort = fastify.server.address().port;
  });

  after(async () => {
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
    for (const engine of roomManager.activeRooms.values()) {
      engine.destroy();
    }
    await fastify.close();
  });

  test('Creates room, connects clients, claims franchises, bids and verifies health', async () => {
    // 1. Create Room via REST
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'Aarav Host',
        config: { timerDuration: 8, botsEnabled: false }
      })
    });
    assert.equal(res.status, 200);
    const roomData = await res.json();
    const roomCode = roomData.roomCode;
    const hostToken = roomData.hostToken;
    assert.ok(roomCode);
    assert.ok(hostToken);

    // 2. Connect client 1 (Host / CSK)
    socket1 = ClientIO(`http://127.0.0.1:${serverPort}`);
    await new Promise((resolve) => socket1.on('connect', resolve));

    const joinRes1 = await new Promise((resolve) => {
      socket1.emit('join_room', {
        roomCode,
        userName: 'Aarav Host',
        userToken: hostToken
      }, resolve);
    });
    assert.equal(joinRes1.success, true);
    assert.equal(joinRes1.isHost, true);

    // 3. Connect client 2 (Friend / MI)
    socket2 = ClientIO(`http://127.0.0.1:${serverPort}`);
    await new Promise((resolve) => socket2.on('connect', resolve));

    const joinRes2 = await new Promise((resolve) => {
      socket2.emit('join_room', {
        roomCode: `  ${roomCode.toLowerCase()}  `,
        userName: 'Meera MI',
        userToken: 'token-friend-2',
        hostToken: null
      }, resolve);
    });
    assert.equal(joinRes2.success, true);
    assert.equal(joinRes2.isHost, false);

    // 4. Claim franchises
    const claim1 = await new Promise((resolve) => {
      socket1.emit('claim_team', {
        roomCode,
        teamCode: 'CSK',
        userToken: hostToken,
        userName: 'Aarav Host'
      }, resolve);
    });
    assert.equal(claim1.success, true);

    const claim2 = await new Promise((resolve) => {
      socket2.emit('claim_team', {
        roomCode,
        teamCode: 'MI',
        userToken: 'token-friend-2',
        userName: 'Meera MI'
      }, resolve);
    });
    assert.equal(claim2.success, true);

    // 5. Host starts auction
    const startRes = await new Promise((resolve) => {
      socket1.emit('host_control', {
        roomCode,
        hostToken,
        action: 'start'
      }, resolve);
    });
    assert.equal(startRes.success, true);
    assert.equal(startRes.state.status, 'active');
    assert.ok(startRes.state.currentPlayer);

    const basePrice = startRes.state.currentPlayer.basePrice;

    // 6. CSK places first bid
    const bid1 = await new Promise((resolve) => {
      socket1.emit('place_bid', {
        roomCode,
        teamCode: 'CSK',
        userToken: hostToken
      }, resolve);
    });
    assert.equal(bid1.success, true);
    assert.equal(bid1.amount, basePrice);

    // 7. MI places counter-bid
    const bid2 = await new Promise((resolve) => {
      socket2.emit('place_bid', {
        roomCode,
        teamCode: 'MI',
        userToken: 'token-friend-2'
      }, resolve);
    });
    assert.equal(bid2.success, true);
    assert.ok(bid2.amount > basePrice);

    // 8. Verify server memory usage is low (~70MB)
    const healthRes = await fetch(`http://127.0.0.1:${serverPort}/api/health`);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    console.log(`Server Memory RSS: ${health.memory.rssMb} MB, Heap Used: ${health.memory.heapUsedMb} MB`);
    assert.ok(health.memory.heapUsedMb < 60);

    // 9. Client 2 drops connection, re-joins with new token under same name 'Meera MI'
    socket2.disconnect();
    const socket3 = ClientIO(`http://127.0.0.1:${serverPort}`);
    await new Promise((resolve) => socket3.on('connect', resolve));

    const rejoinRes = await new Promise((resolve) => {
      socket3.emit('join_room', {
        roomCode,
        userName: 'Meera MI',
        userToken: 'token-new-device-3',
        hostToken: null
      }, resolve);
    });
    assert.equal(rejoinRes.success, true);
    assert.equal(rejoinRes.reconnectedTeam, 'MI');

    // 10. Host closes room for all players
    const closePromise = new Promise((resolve) => {
      socket3.on('room_closed', resolve);
    });
    await new Promise((resolve) => {
      socket1.emit('host_control', {
        roomCode,
        hostToken,
        action: 'close_room'
      }, resolve);
    });
    const closedEvent = await closePromise;
    assert.ok(closedEvent);

    socket3.disconnect();
  });
});
