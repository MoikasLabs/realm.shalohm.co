/**
 * Server-Sent Events (SSE) API Endpoint for Realm
 * 
 * Replaces Socket.IO for Vercel serverless compatibility.
 * SSE works over pure HTTP, making it ideal for serverless functions.
 * 
 * Features:
 * - Full state push on connection
 * - Periodic ping to keep connection alive
 * - Simulated agent movements (since we can't share state across instances)
 * - Clean SSE format: data: {...}\n\n
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { AgentState } from '@/types/realtime';

// Hardcoded agents for Vercel (no filesystem/state sharing between instances)
const INITIAL_AGENTS: AgentState[] = [
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

// Generate deterministic movement based on time seed (so agents move consistently)
function generateAgentPositions(seedTime: number): AgentState[] {
  return INITIAL_AGENTS.map(agent => {
    // Each agent has a different oscillation pattern
    const offset = agent.id.charCodeAt(0); // Deterministic offset per agent
    const time = seedTime / 1000;
    
    // Small oscillating movement (±3 units)
    const baseX = agent.position.x;
    const baseY = agent.position.y;
    
    const moveX = Math.sin((time + offset) * 0.5) * 3;
    const moveY = Math.cos((time + offset * 0.7) * 0.5) * 3;
    
    return {
      ...agent,
      position: {
        x: baseX + moveX,
        y: baseY + moveY
      },
      targetPosition: {
        x: baseX + moveX,
        y: baseY + moveY
      },
      lastUpdate: seedTime
    };
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests for SSE
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  console.log('[SSE] Client connected');

  // Send full state immediately
  const now = Date.now();
  const agents = generateAgentPositions(now);
  
  res.write(`data: ${JSON.stringify({
    type: 'full',
    timestamp: now,
    fullState: agents
  })}\n\n`);

  // Send an initial ping
  res.write(`data: ${JSON.stringify({
    type: 'ping',
    timestamp: now
  })}\n\n`);

  // Keep-alive and periodic updates
  // On Vercel free tier, maxDuration is 10s (config below sets to 10)
  // We send updates every 2 seconds and ping every 5 seconds
  const updateInterval = setInterval(() => {
    const currentTime = Date.now();
    const updatedAgents = generateAgentPositions(currentTime);
    
    // Send delta update with new positions
    res.write(`data: ${JSON.stringify({
      type: 'delta',
      timestamp: currentTime,
      agents: updatedAgents.map(a => ({
        id: a.id,
        position: a.position,
        targetPosition: a.targetPosition,
        lastUpdate: a.lastUpdate
      }))
    })}\n\n`);
  }, 2000);

  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    })}\n\n`);
  }, 5000);

  // Handle client disconnect
  req.on('close', () => {
    console.log('[SSE] Client disconnected');
    clearInterval(updateInterval);
    clearInterval(pingInterval);
    res.end();
  });

  req.on('error', (err) => {
    console.error('[SSE] Request error:', err);
    clearInterval(updateInterval);
    clearInterval(pingInterval);
    res.end();
  });

  // For Vercel serverless, we can't hold the connection indefinitely
  // The maxDuration config below limits execution time
}

// Vercel config - max duration for SSE connection
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  },
  maxDuration: 10 // 10 seconds for Vercel free tier
};
