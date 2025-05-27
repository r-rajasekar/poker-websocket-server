// server.js
const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
require('dotenv').config();

// Import your existing WebSocket code
const { initializeWebSocket, getWebSocketStats } = require('./lib/websocket');

const app = express();

// CORS for your domain
app.use(cors({
  origin: [
    "https://www.predictionarena.fun", 
    "https://predictionarena.fun",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Poker WebSocket Server Running',
    timestamp: new Date().toISOString()
  });
});

// Health check with stats
app.get('/health', (req, res) => {
  const stats = getWebSocketStats();
  res.json({ 
    status: 'healthy',
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// WebSocket stats endpoint
app.get('/stats', (req, res) => {
  const stats = getWebSocketStats();
  res.json(stats);
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket and get io instance
console.log('🔌 Initializing WebSocket server...');
const io = initializeWebSocket(server);

// ===== BROADCAST ENDPOINTS =====

// Player joined broadcast
app.post('/broadcast/player-joined', (req, res) => {
  const { roomId, joinData } = req.body;
  
  if (io) {
    io.to(roomId).emit('player-joined', {
      ...joinData,
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted player-joined to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Game state update broadcast
app.post('/broadcast/game-state', (req, res) => {
  const { roomId, gameState } = req.body;
  
  if (io) {
    io.to(roomId).emit('game-state-update', {
      gameState,
      type: 'state-update',
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted game-state to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Player action broadcast
app.post('/broadcast/player-action', (req, res) => {
  const { roomId, action } = req.body;
  
  if (io) {
    io.to(roomId).emit('player-action', {
      action,
      type: 'action',
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted player-action to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Player left broadcast
app.post('/broadcast/player-left', (req, res) => {
  const { roomId, playerInfo } = req.body;
  
  if (io) {
    io.to(roomId).emit('player-left', {
      playerInfo,
      type: 'player-leave',
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted player-left to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Player reload broadcast
app.post('/broadcast/player-reload', (req, res) => {
  const { roomId, playerInfo } = req.body;
  
  if (io) {
    io.to(roomId).emit('player-reload', {
      ...playerInfo,
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted player-reload to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Players removed broadcast
app.post('/broadcast/players-removed', (req, res) => {
  const { roomId, removalData } = req.body;
  
  if (io) {
    io.to(roomId).emit('players-removed', {
      ...removalData,
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted players-removed to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

// Hand started broadcast
app.post('/broadcast/hand-started', (req, res) => {
  const { roomId, handData } = req.body;
  
  if (io) {
    io.to(roomId).emit('hand-started', {
      handData,
      type: 'hand-start',
      timestamp: new Date().toISOString(),
      roomId
    });
    console.log(`📡 Broadcasted hand-started to room ${roomId}`);
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(500).json({ success: false, error: 'WebSocket not initialized' });
  }
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Poker WebSocket server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
