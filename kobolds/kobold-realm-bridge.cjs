#!/usr/bin/env node
/**
 * Kobold Realm Bridge
 * Spawns kobold avatars when subagents start work
 */

const { RealmClient, TASK_WORKSTATIONS } = require('./realm-client.cjs');

const KOBOLDS = [
  // Note: 'shalom' is managed by shalom-presence.cjs - I AM the dragon!
  { id: 'daily-kobold', name: 'Daily Kobold', type: 'daily', color: '#22c55e' },
  { id: 'trade-kobold', name: 'Trade Kobold', type: 'trade', color: '#f97316' },
  { id: 'deploy-kobold', name: 'Deploy Kobold', type: 'deploy', color: '#3b82f6' }
];

const realmClients = new Map();

async function spawnAll() {
  console.log('[KoboldBridge] Spawning all kobolds...');
  
  for (const config of KOBOLDS) {
    if (!realmClients.has(config.id)) {
      const client = new RealmClient(config);
      realmClients.set(config.id, client);
      await client.connect();
      await client.sleep(500);
    }
  }
  
  console.log('[KoboldBridge] All kobolds spawned');
}

async function sendToWork(koboldId, zone) {
  const client = realmClients.get(koboldId);
  if (!client) {
    console.error(`[KoboldBridge] Kobold ${koboldId} not found`);
    return;
  }
  
  await client.goToWork(zone);
}

async function finishWork(koboldId) {
  const client = realmClients.get(koboldId);
  if (client) {
    client.finishWork();
  }
}

async function sendChat(koboldId, text) {
  const client = realmClients.get(koboldId);
  if (!client) {
    console.error(`[KoboldBridge] Kobold ${koboldId} not found`);
    return;
  }
  client.say(text);
}

// IPC commands for integration
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { command, args = {} } = JSON.parse(body);
      
      switch (command) {
        case 'spawn-all':
          await spawnAll();
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, message: 'All kobolds spawned' }));
          break;
          
        case 'go-to-work':
          await sendToWork(args.koboldId, args.zone);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'finish-work':
          await finishWork(args.koboldId);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;

        case 'chat':
          sendChat(args.koboldId, args.text);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
          break;
          
        case 'move-to-task':
          // Dynamic movement: Move agent to task-specific workstation
          { const client = realmClients.get(args.koboldId);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Kobold ${args.koboldId} not found` }));
              break;
            }
            const success = await client.moveToTask(args.taskType);
            res.writeHead(200);
            res.end(JSON.stringify({ ok: success, task: args.taskType }));
          }
          break;
          
        case 'return-home':
          // Return agent to their home workstation
          { const client = realmClients.get(args.koboldId);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Kobold ${args.koboldId} not found` }));
              break;
            }
            await client.returnHome();
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, message: `${args.koboldId} returning home` }));
          }
          break;
          
        case 'task-workstations':
          // List available task types and their workstations
          res.writeHead(200);
          res.end(JSON.stringify({ 
            ok: true, 
            tasks: TASK_WORKSTATIONS 
          }));
          break;
          
        case 'emerge':
          // Agent emerges from cave to start working
          { const client = realmClients.get(args.koboldId);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Kobold ${args.koboldId} not found` }));
              break;
            }
            await client.emergeFromCave();
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, message: `${args.koboldId} emerging from cave` }));
          }
          break;
          
        case 'return-to-cave':
          // Agent returns to cave to rest
          { const client = realmClients.get(args.koboldId);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Kobold ${args.koboldId} not found` }));
              break;
            }
            await client.returnToCave();
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, message: `${args.koboldId} returned to cave` }));
          }
          break;
          
        case 'cave-status':
          // Check who is in/out of cave
          res.writeHead(200);
          res.end(JSON.stringify({
            ok: true,
            agents: Array.from(realmClients.entries()).map(([id, client]) => ({
              id,
              name: client.name,
              inCave: client.inCave,
              position: client.position
            }))
          }));
          break;
          
        case 'status':
          res.writeHead(200);
          res.end(JSON.stringify({
            ok: true,
            kobolds: Array.from(realmClients.entries()).map(([id, client]) => ({
              id,
              name: client.name,
              connected: client.ws?.readyState === 1,
              inCave: client.inCave,
              onlineStatus: client.inCave ? 'idle' : 'active',
              position: client.position
            }))
          }));
          break;
          
        case 'spawn-subagent':
          // Spawn a temporary sub-agent (appears when sessions_spawn is called)
          { const subagentConfig = {
              id: args.id || `subagent-${Date.now()}`,
              name: args.name || 'Sub-Agent',
              type: args.type || 'helper',
              color: args.color || '#6366f1',
              ...args
            };
            
            // Check if already exists
            if (realmClients.has(subagentConfig.id)) {
              res.writeHead(409);
              res.end(JSON.stringify({ ok: false, error: 'Sub-agent already exists' }));
              break;
            }
            
            const client = new RealmClient(subagentConfig);
            realmClients.set(subagentConfig.id, client);
            await client.connect();
            
            console.log(`[KoboldBridge] Sub-agent spawned: ${subagentConfig.name} (${subagentConfig.id})`);
            res.writeHead(200);
            res.end(JSON.stringify({ 
              ok: true, 
              id: subagentConfig.id,
              message: `Sub-agent ${subagentConfig.name} spawned in The Warrens`
            }));
          }
          break;
          
        case 'despawn-subagent':
          // Remove a temporary sub-agent
          { const client = realmClients.get(args.id);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Sub-agent ${args.id} not found` }));
              break;
            }
            
            // Only allow despawn of sub-agents (not main kobolds)
            if (!args.id.startsWith('subagent-') && !args.id.startsWith('temp-')) {
              res.writeHead(403);
              res.end(JSON.stringify({ ok: false, error: 'Can only despawn temporary sub-agents' }));
              break;
            }
            
            client.disconnect();
            realmClients.delete(args.id);
            console.log(`[KoboldBridge] Sub-agent despawned: ${args.id}`);
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, message: `${args.id} despawned` }));
          }
          break;
          
        case 'subagent-task':
          // Make a sub-agent emerge and do a task, then return to cave
          { const client = realmClients.get(args.id);
            if (!client) {
              res.writeHead(404);
              res.end(JSON.stringify({ ok: false, error: `Sub-agent ${args.id} not found` }));
              break;
            }
            
            // Emerge and do task
            await client.emergeFromCave();
            if (args.task) {
              await client.moveToTask(args.task);
            }
            
            // Auto-return to cave after duration
            const duration = args.duration || 30000;
            setTimeout(() => {
              client.returnToCave();
            }, duration);
            
            res.writeHead(200);
            res.end(JSON.stringify({ 
              ok: true, 
              message: `${args.id} doing task ${args.task} for ${duration}ms`
            }));
          }
          break;
          
        default:
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Unknown command' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
});

const PORT = process.env.KOBOLD_BRIDGE_PORT || 18801;
server.listen(PORT, () => {
  console.log(`[KoboldBridge] IPC server on port ${PORT}`);
  console.log('[KoboldBridge] Commands: spawn-all, go-to-work, finish-work, chat, status');
  console.log('[KoboldBridge] Sub-agents: spawn-subagent, despawn-subagent, subagent-task');
  console.log('[KoboldBridge] Movement: move-to-task, emerge, return-to-cave, cave-status');
  
  // Auto-spawn on start
  spawnAll();
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n[KoboldBridge] Shutting down...');
  for (const client of realmClients.values()) {
    client.disconnect();
  }
  server.close();
  process.exit(0);
});
