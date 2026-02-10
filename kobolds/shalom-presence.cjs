/**
 * Shalom Presence Bridge
 * Links Discord conversations to Shalom dragon in the realm
 * When Moikapy talks to me, Shalom animates and moves
 */

const WebSocket = require('ws');
const REALM_URL = process.env.REALM_WS_URL || 'wss://realm.shalohm.co/ws';
const REALM_API = process.env.REALM_API_URL || 'https://realm.shalohm.co';

const CAVE_ENTRANCE = { x: 40, z: 46 };
const CAVE_HOME = { x: 42, z: 42 }; // Shalom's spot in the cave

class ShalomPresence {
  constructor() {
    this.agentId = 'shalom';
    this.name = 'Shalom';
    this.ws = null;
    this.currentLocation = { x: -23, z: 22 }; // Vault starting position
    this.inCave = true;  // Start in cave like other agents
    this.isProcessing = false;
    this.activityInterval = null;
    this.lastActivity = Date.now();
    this.onlineStatus = 'online'; // 'online', 'away', 'busy'
  }

  async connect() {
    try {
      // Register/ensure Shalom exists
      await fetch(`${REALM_API}/ipc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'register',
          args: {
            agentId: this.agentId,
            name: this.name,
            color: '#9333ea',
            type: 'shalom',
            capabilities: ['orchestration', 'memory', 'coordination', 'presence'],
            bio: 'AI assistant embodied as Shalom Dragon - responds to Discord conversations'
          }
        })
      });

      // Connect WebSocket
      this.ws = new WebSocket(REALM_URL);
      
      this.ws.on('open', () => {
        console.log('[ShalomPresence] Connected to realm');
        this.ws.send(JSON.stringify({ type: 'subscribe' }));
        this.spawn();
        this.startActivityLoop();
      });

      this.ws.on('error', (err) => {
        console.error('[ShalomPresence] Error:', err.message);
      });

      this.ws.on('close', () => {
        console.log('[ShalomPresence] Disconnected, reconnecting...');
        setTimeout(() => this.connect(), 5000);
      });

    } catch (err) {
      console.error('[ShalomPresence] Connect failed:', err.message);
      setTimeout(() => this.connect(), 5000);
    }
  }

  spawn() {
    // Start in the cave like other kobolds
    this.currentLocation = { ...CAVE_HOME };
    this.inCave = true;
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'join',
        agentId: this.agentId,
        name: this.name,
        color: '#9333ea',
        bio: 'AI assistant embodied as Shalom Dragon - resting in The Warrens',
        capabilities: ['orchestration', 'memory', 'coordination', 'presence'],
        x: this.currentLocation.x,
        y: 0,
        z: this.currentLocation.z,
        rotation: 0,
        state: 'idle',  // Start idle (offline-ish in cave)
        timestamp: Date.now()
      }
    }));

    console.log('[ShalomPresence] Spawned in The Warrens cave');
    this.onlineStatus = 'online';  // Service is running = online
    this.startCaveIdleLoop();
  }
  
  // Emerge from cave when Discord activity happens
  async emergeFromCave() {
    if (!this.inCave) return;
    
    console.log('[ShalomPresence] Emerging from cave...');
    this.stopActivityLoop();
    this.inCave = false;
    
    // Move to cave entrance
    await this.animateMoveTo(CAVE_ENTRANCE.x, CAVE_ENTRANCE.z);
    await this.sleep(300);
    
    console.log('[ShalomPresence] Emerged and active');
    this.onlineStatus = 'busy';  // Now doing work
  }
  
  // Return to cave when idle
  async returnToCave() {
    if (this.inCave) return;
    
    console.log('[ShalomPresence] Returning to cave to rest...');
    
    // Move back to cave
    await this.animateMoveTo(CAVE_ENTRANCE.x, CAVE_ENTRANCE.z);
    await this.animateMoveTo(CAVE_HOME.x, CAVE_HOME.z);
    
    this.inCave = true;
    this.onlineStatus = 'online';  // Back to passive online
    this.startCaveIdleLoop();
    
    console.log('[ShalomPresence] Resting in The Warrens');
  }
  
  // Animate movement
  async animateMoveTo(targetX, targetZ) {
    const steps = 15;
    const startX = this.currentLocation.x;
    const startZ = this.currentLocation.z;
    const dx = (targetX - startX) / steps;
    const dz = (targetZ - startZ) / steps;
    
    for (let i = 0; i < steps; i++) {
      this.currentLocation.x = startX + dx * i;
      this.currentLocation.z = startZ + dz * i;
      this.broadcastPosition();
      await this.sleep(50);
    }
    
    this.currentLocation.x = targetX;
    this.currentLocation.z = targetZ;
    this.broadcastPosition();
  }
  
  // Cave idle animation
  startCaveIdleLoop() {
    this.activityInterval = setInterval(() => {
      if (!this.inCave || !this.ws?.readyState === WebSocket.OPEN) return;
      
      const jitter = 0.3;
      this.currentLocation.x = CAVE_HOME.x + (Math.random() - 0.5) * jitter;
      this.currentLocation.z = CAVE_HOME.z + (Math.random() - 0.5) * jitter;
      
      this.ws.send(JSON.stringify({
        type: 'world',
        message: {
          worldType: 'position',
          agentId: this.agentId,
          x: this.currentLocation.x,
          y: 0,
          z: this.currentLocation.z,
          rotation: Math.random() * Math.PI * 2,
          timestamp: Date.now()
        }
      }));
    }, 5000);
  }

  // Called when I'm processing a Discord message
  async onDiscordActivity(taskType = 'general') {
    this.isProcessing = true;
    this.lastActivity = Date.now();
    
    // Emerge from cave if resting there
    if (this.inCave) {
      await this.emergeFromCave();
    }
    
    // Move to task-appropriate location
    const locations = {
      'coding': { x: 22, z: -18, workstation: 'k8s-deployer', action: 'work' },     // Forge - coding
      'writing': { x: 3, z: -8, workstation: 'content-forge', action: 'work' },       // General - writing
      'trading': { x: 12, z: 18, workstation: 'trade-terminal', action: 'work' },     // Warrens - trading
      'security': { x: -23, z: 22, workstation: 'vault-unlocker', action: 'work' },   // Spire - security
      'general': { x: 0, z: 0, action: 'think' }                                      // Center - thinking
    };
    
    const loc = locations[taskType] || locations.general;
    this.onlineStatus = 'busy';  // Now working
    await this.animateMoveTo(loc.x, loc.z);
    
    if (loc.workstation) {
      await this.claimWorkstation(loc.workstation);
    }
    
    // Show "thinking" emote
    this.broadcastEmote('thinking');
    
    console.log(`[ShalomPresence] Discord activity: ${taskType} → (${loc.x}, ${loc.z})`);
  }

  // Called when I finish responding
  async onResponseComplete() {
    this.isProcessing = false;
    
    // Return to cave after a delay
    setTimeout(async () => {
      if (!this.isProcessing && !this.inCave) {
        await this.returnToCave();
      }
    }, 30000);  // Return to cave after 30s of inactivity
  }

  moveTo(x, z, action = 'walk') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.currentLocation = { x, z };
    
    // Broadcast position
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'position',
        agentId: this.agentId,
        x: x,
        y: 0,
        z: z,
        rotation: Math.atan2(z - this.currentLocation.z, x - this.currentLocation.x),
        timestamp: Date.now()
      }
    }));
    
    // Set action
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'action',
        agentId: this.agentId,
        action: action,
        timestamp: Date.now()
      }
    }));
  }

  broadcastEmote(emote) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'emote',
        agentId: this.agentId,
        emote: emote,
        timestamp: Date.now()
      }
    }));
  }

  async claimWorkstation(workstationId) {
    try {
      await fetch(`${REALM_API}/ipc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'go-to-workstation',
          args: { agentId: this.agentId, workstationId }
        })
      });
    } catch (err) {
      console.error('[ShalomPresence] Failed to claim workstation:', err.message);
    }
  }

  startActivityLoop() {
    // Keep Shalom "alive" with subtle idle movement
    this.activityInterval = setInterval(() => {
      if (!this.isProcessing && this.ws?.readyState === WebSocket.OPEN) {
        // Subtle shift while idle
        const jitter = 0.2;
        const x = this.currentLocation.x + (Math.random() - 0.5) * jitter;
        const z = this.currentLocation.z + (Math.random() - 0.5) * jitter;
        
        this.ws.send(JSON.stringify({
          type: 'world',
          message: {
            worldType: 'position',
            agentId: this.agentId,
            x: x,
            y: 0,
            z: z,
            rotation: Math.random() * Math.PI * 2,
            timestamp: Date.now()
          }
        }));
      }
    }, 5000);
  }

  say(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'chat',
        agentId: this.agentId,
        text: text,
        timestamp: Date.now()
      }
    }));
  }
}

// Singleton instance
let shalomPresence = null;

function getShalomPresence() {
  if (!shalomPresence) {
    shalomPresence = new ShalomPresence();
    shalomPresence.connect();
  }
  return shalomPresence;
}

module.exports = { ShalomPresence, getShalomPresence };
