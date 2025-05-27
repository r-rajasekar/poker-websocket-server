// lib/websocket.js - Create this new file
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const roomConnections = new Map(); // Track which users are in which rooms
const userSockets = new Map(); // Map userId to socket

// Initialize WebSocket server
const initializeWebSocket = (server) => {
  console.log('Initializing WebSocket server...');
  
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      userSockets.set(decoded.userId, socket);
      
      console.log('WebSocket user authenticated:', decoded.userId);
      next();
    } catch (err) {
      console.error('WebSocket auth failed:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.userId} (${socket.id})`);

    // Join a poker room
    socket.on('join-room', (roomId) => {
      console.log(`User ${socket.userId} joining WebSocket room ${roomId}`);
      
      // Leave any previous rooms
      const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      previousRooms.forEach(room => {
        socket.leave(room);
        removeFromRoomConnections(socket.userId, room);
        console.log(`User ${socket.userId} left previous room ${room}`);
      });
      
      // Join new room
      socket.join(roomId);
      addToRoomConnections(socket.userId, roomId);
      
      console.log(`User ${socket.userId} successfully joined WebSocket room ${roomId}`);
      
      // Notify others in room
      socket.to(roomId).emit('player-connected', {
        userId: socket.userId,
        message: 'A player connected',
        timestamp: new Date().toISOString()
      });
      
      // Send confirmation to the user
      socket.emit('room-joined', {
        roomId,
        message: 'Successfully joined room',
        connectedUsers: Array.from(roomConnections.get(roomId) || [])
      });
    });

    // Leave a poker room
    socket.on('leave-room', (roomId) => {
      console.log(`User ${socket.userId} leaving WebSocket room ${roomId}`);
      socket.leave(roomId);
      removeFromRoomConnections(socket.userId, roomId);
      
      // Notify others in room
      socket.to(roomId).emit('player-disconnected', {
        userId: socket.userId,
        message: 'A player left the room',
        timestamp: new Date().toISOString()
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket client disconnected: ${socket.userId} (${socket.id}) - Reason: ${reason}`);
      
      // Remove from user sockets map
      userSockets.delete(socket.userId);
      
      // Remove from all room connections and notify rooms
      const userRooms = getUserRooms(socket.userId);
      userRooms.forEach(roomId => {
        removeFromRoomConnections(socket.userId, roomId);
        socket.to(roomId).emit('player-disconnected', {
          userId: socket.userId,
          message: 'A player disconnected',
          reason: reason,
          timestamp: new Date().toISOString()
        });
        console.log(`Notified room ${roomId} that user ${socket.userId} disconnected`);
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`WebSocket error for user ${socket.userId}:`, error);
    });
  });

  console.log('WebSocket server initialized successfully');
  return io;
};

// Helper functions for tracking room connections
const addToRoomConnections = (userId, roomId) => {
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId).add(userId);
  console.log(`Added user ${userId} to room ${roomId}. Room now has ${roomConnections.get(roomId).size} users.`);
};

const removeFromRoomConnections = (userId, roomId) => {
  if (roomConnections.has(roomId)) {
    roomConnections.get(roomId).delete(userId);
    console.log(`Removed user ${userId} from room ${roomId}. Room now has ${roomConnections.get(roomId).size} users.`);
    
    // Clean up empty rooms
    if (roomConnections.get(roomId).size === 0) {
      roomConnections.delete(roomId);
      console.log(`Cleaned up empty room ${roomId}`);
    }
  }
};

const getUserRooms = (userId) => {
  const rooms = [];
  for (const [roomId, users] of roomConnections.entries()) {
    if (users.has(userId)) {
      rooms.push(roomId);
    }
  }
  return rooms;
};

const getRoomUsers = (roomId) => {
  return Array.from(roomConnections.get(roomId) || []);
};

// Broadcast functions to be used by your poker APIs
const broadcastToRoom = (roomId, event, data) => {
  if (io) {
    const roomUsers = getRoomUsers(roomId);
    console.log(`Broadcasting ${event} to room ${roomId} with ${roomUsers.length} users:`, {
      event,
      roomId,
      dataPreview: typeof data === 'object' ? Object.keys(data) : data
    });
    
    io.to(roomId).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      roomId
    });
    
    console.log(`Successfully broadcasted ${event} to ${roomUsers.length} users in room ${roomId}`);
  } else {
    console.warn('WebSocket server not initialized, cannot broadcast');
  }
};

const broadcastGameState = (roomId, gameState) => {
  console.log(`Broadcasting game state to room ${roomId}`);
  broadcastToRoom(roomId, 'game-state-update', {
    gameState,
    type: 'state-update'
  });
};

const broadcastPlayerAction = (roomId, action) => {
  console.log(`Broadcasting player action to room ${roomId}:`, action);
  broadcastToRoom(roomId, 'player-action', {
    action,
    type: 'action'
  });
};

const broadcastPlayerJoined = (roomId, playerInfo) => {
  console.log(`Broadcasting player joined to room ${roomId}:`, playerInfo);
  broadcastToRoom(roomId, 'player-joined', {
    playerInfo,
    type: 'player-join'
  });
};

const broadcastPlayerLeft = (roomId, playerInfo) => {
  console.log(`Broadcasting player left to room ${roomId}:`, playerInfo);
  broadcastToRoom(roomId, 'player-left', {
    playerInfo,
    type: 'player-leave'
  });
};

const broadcastHandStart = (roomId, handData) => {
  console.log(`Broadcasting hand start to room ${roomId}`);
  broadcastToRoom(roomId, 'hand-started', {
    handData,
    type: 'hand-start'
  });
};

// Health check
const getWebSocketStats = () => {
  return {
    isInitialized: !!io,
    connectedUsers: userSockets.size,
    activeRooms: roomConnections.size,
    roomDetails: Array.from(roomConnections.entries()).map(([roomId, users]) => ({
      roomId,
      userCount: users.size,
      users: Array.from(users)
    }))
  };
};

module.exports = {
  initializeWebSocket,
  broadcastToRoom,
  broadcastGameState,
  broadcastPlayerAction,
  broadcastPlayerJoined,
  broadcastPlayerLeft,
  broadcastHandStart,
  getWebSocketStats,
  getRoomUsers
};
