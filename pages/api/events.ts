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

// Agent base configurations - center positions and movement parameters
const AGENT_CONFIGS = [
  {
    id: 'shalom',
    name: 'Shalom',
    type: 'shalom' as const,
    status: 'active' as const,
    color: '#6366f1',
    radius: 6,
    baseX: 0,
    baseY: 0,
    amplitudeX: 40,
    amplitudeY: 25,
    speedX: 0.3,
    speedY: 0.5,
    phaseX: 0,
    phaseY: Math.PI / 4
  },
  {
    id: 'daily-kobold',
    name: 'Daily Kobold',
    type: 'daily' as const,
    status: 'active' as const,
    color: '#22c55e',
    radius: 4,
    baseX: -25,
    baseY: 15,
    amplitudeX: 20,
    amplitudeY: 20,
    speedX: 0.8,
    speedY: 0.8,
    phaseX: Math.PI / 2,
    phaseY: 0
  },
  {
    id: 'trade-kobold',
    name: 'Trade Kobold',
    type: 'trading' as const,
    status: 'active' as const,
    color: '#f97316',
    radius: 4,
    baseX: 25,
    baseY: -15,
    amplitudeX: 30,
    amplitudeY: 20,
    speedX: 0.4,
    speedY: 0.8,
    phaseX: 0,
    phaseY: Math.PI / 2
  }
];

// Generate deterministic movement based on timestamp
// Each agent follows a unique mathematical pattern for visual interest
// Generate deterministic movement based on timestamp
function generateAgentPositions(seedTime: number): AgentState[] {
  const time = seedTime / 1000; // Convert to seconds for smoother movement

  return AGENT_CONFIGS.map(config => {
    // Calculate position using sine wave patterns
    // X position: base + sin(time * speed + phase) * amplitude
    const x = config.baseX + Math.sin(time * config.speedX + config.phaseX) * config.amplitudeX;
    
    // Y position: base + sin(time * speed + phase) * amplitude
    // Using different speed/phase creates interesting non-linear paths
    const y = config.baseY + Math.sin(time * config.speedY + config.phaseY) * config.amplitudeY;

    // Calculate target position (for smooth interpolation on client)
    // Look slightly ahead in time for natural movement direction
    const lookAhead = 0.1;
    const targetX = config.baseX + Math.sin((time + lookAhead) * config.speedX + config.phaseX) * config.amplitudeX;
    const targetY = config.baseY + Math.sin((time + lookAhead) * config.speedY + config.phaseY) * config.amplitudeY;
    
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      status: config.status,
      position: { x, y },
      targetPosition: { x: targetX, y: targetY },
      color: config.color,
      radius: config.radius,
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
