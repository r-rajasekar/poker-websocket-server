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

// Initialize WebSocket
console.log('🔌 Initializing WebSocket server...');
initializeWebSocket(server);

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