import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { AgentState, AgentDelta, WorldDeltaUpdate } from '@/types/realtime';

// Types for Socket.IO server attachment
interface ServerWithIO extends HTTPServer {
  io?: SocketIOServer;
}

type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: ServerWithIO;
  };
};

// In-memory agent cache (per-function-instance, cleared on cold start)
const agentCache = new Map<string, AgentState>();

// Zone centers for agent positioning
const ZONE_CENTERS: Record<string, [number, number]> = {
  'perch': [0, 0],
  'warrens': [-30, 20],
  'forge': [35, -20],
  'plaza': [0, 40],
  'townhall': [10, 10]
};

// Generate deterministic position from ID and zone
function generateAgentPosition(id: string, zoneId: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const [cx, cy] = ZONE_CENTERS[zoneId] || [0, 0];
  const spread = 6;

  const x = cx + (Math.abs(hash) % 100) / 100 * spread * 2 - spread;
  const y = cy + (Math.abs(hash >> 8) % 100) / 100 * spread * 2 - spread;

  return { x, y };
}

// Generate static agent states (no filesystem access for Vercel compatibility)
function generateAgentStates(): AgentState[] {
  const agents: AgentState[] = [];

  // Shalom at center
  agents.push({
    id: 'shalom',
    name: 'Shalom',
    type: 'shalom',
    status: 'active',
    position: generateAgentPosition('shalom', 'perch'),
    color: '#6366f1',
    radius: 6,
    lastUpdate: Date.now()
  });

  // Default kobolds (hardcoded for Vercel serverless - no FS access)
  const koboldIds = ['daily-kobold', 'trade-kobold'];

  for (let i = 0; i < koboldIds.length; i++) {
    const id = koboldIds[i];
    const isTrading = id.includes('trade') || i % 2 === 1;
    const zoneId = isTrading ? 'forge' : 'warrens';

    agents.push({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      type: isTrading ? 'trading' : 'daily',
      status: 'active',
      position: generateAgentPosition(id, zoneId),
      color: isTrading ? '#f97316' : '#22c55e',
      radius: 4,
      lastUpdate: Date.now()
    });
  }

  return agents;
}

// Simple broadcast - no setInterval (not reliable in serverless)
function broadcastInitialState(io: SocketIOServer, socketId: string) {
  const agents = generateAgentStates();
  
  // Update cache
  for (const agent of agents) {
    agentCache.set(agent.id, agent);
  }

  // Send to the specific socket that connected
  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.emit('full', {
      type: 'full',
      timestamp: Date.now(),
      fullState: agents
    } as WorldDeltaUpdate);
  }
}

// Initialize Socket.IO handlers
function setupSocketHandlers(ioInstance: SocketIOServer) {
  ioInstance.on('connection', (socket) => {
    const clientId = socket.id;
    const transport = socket.conn.transport.name;
    
    console.log(`[Socket.IO] Client connected: ${clientId} (transport: ${transport})`);

    // Send initial state immediately
    broadcastInitialState(ioInstance, clientId);

    // Handle transport upgrade
    socket.conn.on('upgrade', (transport) => {
      console.log(`[Socket.IO] Client ${clientId} upgraded to ${transport.name}`);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Subscribe to viewport updates
    socket.on('viewport', (viewport) => {
      (socket as unknown as { viewport?: unknown }).viewport = viewport;
      console.log(`[Socket.IO] Client ${clientId} viewport updated`);
    });

    socket.on('subscribe', (data) => {
      console.log(`[Socket.IO] Client ${clientId} subscribed:`, data);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${clientId} (reason: ${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Client ${clientId} error:`, err);
    });
  });
}

// Main handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  // CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle Socket.IO upgrade
  if (!res.socket.server.io) {
    try {
      const ioInstance = new SocketIOServer(res.socket.server, {
        path: '/api/socket',
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: false
        },
        transports: ['polling', 'websocket'],
        pingInterval: 10000,
        pingTimeout: 5000,
        allowUpgrades: true,
        perMessageDeflate: false,
        maxHttpBufferSize: 1e6,
        // Vercel-specific: clean up on connection close
        cleanupEmptyChildNamespaces: true
      });

      res.socket.server.io = ioInstance;
      
      setupSocketHandlers(ioInstance);
      console.log('[Socket.IO] Server initialized on /api/socket');
    } catch (err) {
      console.error('[Socket.IO] Failed to initialize:', err);
      res.status(500).json({ error: 'Socket.IO initialization failed' });
      return;
    }
  }

  // End the response to let Socket.IO handle the connection
  res.end();
}

// Vercel config - prevent function from timing out too quickly
export const config = {
  api: {
    bodyParser: false, // Socket.IO handles its own body parsing
    externalResolver: true, // Let Socket.IO handle the response
  }
};
