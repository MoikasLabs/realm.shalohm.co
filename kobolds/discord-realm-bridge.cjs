#!/usr/bin/env node
/**
 * Discord-Realm Bridge
 * Hooks Discord activity to Shalom's realm presence
 */

const { getShalomPresence } = require('./shalom-presence.cjs');
const http = require('http');

// Initialize Shalom presence
const shalom = getShalomPresence();

// IPC server for Discord bot to trigger presence
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { event, data = {} } = JSON.parse(body);
      
      switch (event) {
        case 'discord:message':
          // Shalom starts processing Discord message
          const taskType = detectTaskType(data.content || '');
          shalom.onDiscordActivity(taskType);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, task: taskType }));
          break;
          
        case 'discord:response:start':
          // Shalom starts typing/responding
          shalom.onDiscordActivity(data.task || 'general');
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'discord:response:end':
          // Shalom finished responding
          shalom.onResponseComplete();
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'discord:typing':
          // Shalom is typing
          shalom.broadcastEmote('thinking');
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'shalom:say':
          // Make Shalom speak in realm
          shalom.say(data.text || 'Hello from Discord!');
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'status':
          res.writeHead(200);
          res.end(JSON.stringify({
            ok: true,
            connected: shalom.ws?.readyState === WebSocket.OPEN,
            location: shalom.currentLocation,
            inCave: shalom.inCave,
            onlineStatus: shalom.onlineStatus,  // 'online', 'busy', 'away'
            processing: shalom.isProcessing
          }));
          break;
          
        default:
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Unknown event' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
});

// Detect task type from message content
function detectTaskType(content) {
  const text = content.toLowerCase();
  
  if (text.includes('code') || text.includes('deploy') || text.includes('build') || text.includes('docker') || text.includes('k8s')) {
    return 'coding';
  }
  if (text.includes('write') || text.includes('post') || text.includes('tweet') || text.includes('content')) {
    return 'writing';
  }
  if (text.includes('trade') || text.includes('price') || text.includes('market') || text.includes('token')) {
    return 'trading';
  }
  if (text.includes('secure') || text.includes('vault') || text.includes('encrypt') || text.includes('key')) {
    return 'security';
  }
  return 'general';
}

const PORT = process.env.SHALOM_PRESENCE_PORT || 18802;
server.listen(PORT, () => {
  console.log(`[ShalomPresence] Bridge on port ${PORT}`);
  console.log('[ShalomPresence] Events: discord:message, discord:response:start, discord:response:end, shalom:say, status');
});

// Cleanup
process.on('SIGINT', () => {
  console.log('\n[ShalomPresence] Shutting down...');
  server.close();
  process.exit(0);
});
