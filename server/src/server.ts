import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './game/RoomManager';
import { setupSocketHandlers } from './socket/socketHandlers';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// CORS configuration for production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats endpoint for monitoring
app.get('/stats', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    activeRooms: roomManager.getRoomCount(),
    connectedClients: io.engine.clientsCount,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    uptime: `${Math.round(process.uptime() / 60)} minutes`,
    timestamp: new Date().toISOString()
  });
});

// Initialize room manager
const roomManager = new RoomManager();

// Setup socket handlers
setupSocketHandlers(io, roomManager);

// Periodic cleanup job - runs every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  logger.cleanup('Running periodic room cleanup...');
  const cleaned = roomManager.cleanupStaleRooms();
  
  // Log memory stats
  const memUsage = process.memoryUsage();
  logger.memory(`Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  logger.info(`📊 Active rooms: ${roomManager.getRoomCount()}, Connected clients: ${io.engine.clientsCount}`);
}, CLEANUP_INTERVAL);

// Broadcast server errors to all connected clients so they see a browser popup
function notifyClientsOfError(message: string) {
  try {
    io.emit('serverError', { message });
  } catch (_) {
    // Socket may be in a broken state — nothing more we can do
  }
}

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
  notifyClientsOfError(`Server error: ${err.message}`);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.stack || reason?.message || String(reason);
  logger.error(`Unhandled rejection: ${msg}`);
  notifyClientsOfError(`Server error: ${reason?.message || 'Unhandled rejection'}`);
});

process.on('SIGTERM', () => {
  logger.error('Received SIGTERM — server shutting down');
  notifyClientsOfError('Server is restarting. You will be reconnected automatically.');
});

process.on('SIGINT', () => {
  logger.error('Received SIGINT — server shutting down');
  notifyClientsOfError('Server is shutting down.');
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`🎮 Least Count Server running on port ${PORT}`);
  logger.info(`🌐 Socket.IO server ready for connections`);
  logger.info(`🧹 Automatic cleanup enabled (every ${CLEANUP_INTERVAL / 60000} minutes)`);
  logger.info(`📝 Log level: ${process.env.LOG_LEVEL || 'info'} (set LOG_LEVEL env var to change)`);
});
