import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { roomManager } from './rooms.js';
import { CreateRoomSchema, JoinRoomSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'test' ? false : true
});

await fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

// Serve frontend dist if built
const WEB_DIST = path.resolve(__dirname, '../web/dist');
if (fs.existsSync(WEB_DIST)) {
  await fastify.register(fastifyStatic, {
    root: WEB_DIST,
    prefix: '/'
  });

  // SPA fallback for routes: /room/:code, etc.
  fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
      reply.status(404).send({ error: 'API route not found' });
    } else {
      reply.sendFile('index.html');
    }
  });
}

// REST Endpoints
fastify.get('/api/health', async () => {
  const mem = process.memoryUsage();
  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    activeRooms: roomManager.activeRooms.size
  };
});

fastify.post('/api/rooms', async (req, reply) => {
  const parsed = CreateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: 'Invalid room configuration', details: parsed.error.issues });
  }

  const result = roomManager.createRoom(parsed.data);
  return result;
});

fastify.get('/api/rooms/:code', async (req, reply) => {
  const engine = roomManager.getRoom(req.params.code);
  if (!engine) {
    return reply.status(404).send({ error: 'Room not found' });
  }
  return engine.getStateSnapshot();
});

// Setup Socket.IO on Fastify's raw HTTP server
const io = new Server(fastify.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

roomManager.setIO(io);

io.on('connection', (socket) => {
  roomManager.setupSocketEvents(socket);
});

// Start Fastify Server
try {
  await fastify.listen({ port: Number(PORT), host: HOST });
  fastify.log.info(`⚡ IPL Auction Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful termination
const shutdown = async () => {
  fastify.log.info('Shutting down server...');
  for (const engine of roomManager.activeRooms.values()) {
    engine.destroy();
  }
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
