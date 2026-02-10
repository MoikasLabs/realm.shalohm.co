import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';

// Extend NextApiResponse with socket server
type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

// Hardcoded agents for Vercel (no filesystem access)
const agents = [
  {
    id: 'shalom',
    name: 'Shalom',
    type: 'shalom',
    status: 'active',
    position: { x: 0, y: 0 },
    color: '#6366f1',
    radius: 6,
    lastUpdate: Date.now()
  },
  {
    id: 'daily-kobold',
    name: 'Daily Kobold',
    type: 'daily',
    status: 'active', 
    position: { x: -30, y: 20 },
    color: '#22c55e',
    radius: 4,
    lastUpdate: Date.now()
  },
  {
    id: 'trade-kobold',
    name: 'Trade Kobold',
    type: 'trading',
    status: 'active',
    position: { x: 35, y: -20 },
    color: '#f97316',
    radius: 4,
    lastUpdate: Date.now()
  }
];

// Setup handlers for Socket.IO
function setupIO(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id);
    
    // Send full state immediately
    socket.emit('full', {
      type: 'full',
      timestamp: Date.now(),
      fullState: agents
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id);
    });
  });
}

// Global to track if we've initialized
let ioInitialized = false;

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  // CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize Socket.IO server if not already done
  if (!ioInitialized && !res.socket.server.io) {
    try {
      console.log('[Socket.IO] Initializing server...');
      
      const io = new SocketIOServer(res.socket.server, {
        path: '/api/socket',
        cors: { origin: '*', methods: ['GET', 'POST'], credentials: false },
        transports: ['polling']
      });
      
      res.socket.server.io = io;
      setupIO(io);
      ioInitialized = true;
      
      console.log('[Socket.IO] Server ready');
    } catch (err) {
      console.error('[Socket.IO] Init error:', err);
      res.status(500).json({ error: 'Socket init failed' });
      return;
    }
  }

  // IMPORTANT: For Vercel serverless, we must end the response
  // Socket.IO middleware has already processed the request internally
  // This prevents the function from hanging
  res.status(200).end();
}

// Vercel config - max duration for long-polling
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  },
  maxDuration: 30 // Keep function alive for 30 seconds (max for free tier)
};
