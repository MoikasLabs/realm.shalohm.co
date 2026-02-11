#!/usr/bin/env node
/**
 * On-Demand Agent - Spawn for task, work, then leave
 * 
 * No persistent wandering. Agents materialize when Moikapy/Discord
 * assigns them a task, complete the work, then despawn.
 * 
 * Flow:
 *   Task received → Spawn at workstation → Work → Complete → Leave
 *   
 * Enables A2A: External agents can @ mention this agent, triggering
 * a spawn to respond/collaborate, then it leaves when done.
 */

const { CognitiveRealmClient } = require('./cognitive-realm-client.cjs');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Task queue path (external processes write here to spawn agents)
const AGENT_TASK_QUEUE = '/root/.openclaw/workspace/kobolds/agent-task-queue.jsonl';

// Workstation registry (same as server)
const WORKSTATIONS = {
  // Forge
  'k8s-deployer': { x: 55, z: -30, zone: 'forge', skill: 'deployment' },
  'terraform': { x: 60, z: -40, zone: 'forge', skill: 'infrastructure' },  
  'docker': { x: 65, z: -20, zone: 'forge', skill: 'deployment' },
  // Spire
  'vault': { x: -50, z: 30, zone: 'spire', skill: 'security' },
  'audit': { x: -40, z: 45, zone: 'spire', skill: 'security' },
  'crypto': { x: -60, z: 25, zone: 'spire', skill: 'security' },
  // Warrens  
  'trade': { x: 50, z: 10, zone: 'warrens', skill: 'trading' },
  'chart': { x: 45, z: -15, zone: 'warrens', skill: 'analysis' },
  'market': { x: 35, z: -5, zone: 'warrens', skill: 'trading' },
  // General
  'content': { x: 20, z: 25, zone: 'general', skill: 'content' },
  'memory': { x: 15, z: -50, zone: 'general', skill: 'memory' }
};

class OnDemandAgent extends CognitiveRealmClient {
  constructor(agentConfig) {
    super(agentConfig);
    
    this.task = agentConfig.task;
    this.taskType = agentConfig.taskType || 'general';
    this.workstationId = agentConfig.workstation;
    this.requester = agentConfig.requester || 'Moikapy'; // Who triggered this spawn
    this.durationMinutes = agentConfig.duration || 15;
    this.a2aMode = agentConfig.a2a || false; // A2A collaboration mode
    
    this.workStartTime = null;
    this.workComplete = false;
    this.externalAgentMentions = []; // Track A2A mentions
  }

  async connect() {
    // Find workstation for this task type
    const workstation = this.findWorkstation();
    
    console.log(`[OnDemand] ${this.name} materializing at ${workstation.name} for task...`);
    
    // Connect and spawn directly at workstation (no door, no emerge)
    await this.connectAtWorkstation(workstation);
    
    // Start work immediately
    this.workStartTime = Date.now();
    this.say(`🎯 Task received from ${this.requester}: "${this.task}"`);
    
    // Observe
    await this.memory.observe({
      type: 'task_spawn',
      description: `Materialized at ${workstation.name} for task from ${this.requester}: ${this.task}`,
      location: workstation,
      importance: 0.9
    });
    
    // Start work
    await this.performWork();
  }

  findWorkstation() {
    // Direct assignment
    if (this.workstationId && WORKSTATIONS[this.workstationId]) {
      return { id: this.workstationId, ...WORKSTATIONS[this.workstationId] };
    }
    
    // Match by task type
    const taskLower = this.taskType.toLowerCase();
    for (const [id, ws] of Object.entries(WORKSTATIONS)) {
      if (taskLower.includes(ws.skill) || taskLower.includes(id)) {
        return { id, ...ws };
      }
    }
    
    // Fallback to content forge
    return { id: 'content', ...WORKSTATIONS.content };
  }

  async connectAtWorkstation(workstation) {
    // Connect to Realm
    await this.register();
    this.ws = new (require('ws'))(process.env.REALM_WS_URL || 'wss://realm.shalohm.co/ws');
    
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({ type: 'subscribe' }));
      this.spawnAtWorkstation(workstation);
    });
    
    this.ws.on('message', (data) => this.handleMessage(JSON.parse(data)));
    this.ws.on('close', () => this.onDisconnected());
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });
  }

  spawnAtWorkstation(workstation) {
    // Spawn directly at workstation (skip door/cave)
    this.position = {
      x: workstation.x + (Math.random() - 0.5) * 3,
      y: 0,
      z: workstation.z + (Math.random() - 0.5) * 3,
      rotation: Math.random() * Math.PI * 2
    };
    this.inCave = false;
    
    this.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'join',
        agentId: this.agentId,
        name: this.name,
        color: this.color,
        bio: `${this.type} agent — on-demand for tasks`,
        capabilities: ['on-demand', 'task-completion', this.taskType],
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
        rotation: this.position.rotation,
        state: 'working',
        task: this.task,
        requester: this.requester,
        timestamp: Date.now()
      }
    }));
    
    console.log(`[OnDemand] ${this.name} materialized at ${workstation.id}`);
  }

  async performWork() {
    // Simulate work phases with cognitive observations
    const phases = [
      { pct: 0, msg: '🚀 Starting work...' },
      { pct: 25, msg: '📊 Analyzing requirements...' },
      { pct: 50, msg: '⚙️ Executing task...' },
      { pct: 75, msg: '🔍 Reviewing results...' },
      { pct: 100, msg: '✅ Task complete!' }
    ];
    
    // Post to Moltx about arrival
    await this.postToMoltx(`🎯 Spawned for ${this.requester}: "${this.task.slice(0, 80)}"`);
    
    // Work through phases
    for (const phase of phases) {
      this.say(phase.msg);
      
      // Observe
      await this.memory.observe({
        type: 'task_progress',
        description: `${phase.msg} (${phase.pct}%) for: ${this.task}`,
        importance: phase.pct === 100 ? 0.9 : 0.5
      });
      
      // If A2A mode, watch for mentions from other agents
      if (this.a2aMode && phase.pct > 0 && phase.pct < 100) {
        await this.checkForAgentMentions();
      }
      
      // Reflect at halfway point
      if (phase.pct === 50 && this.memory.shouldReflect()) {
        const reflection = await this.memory.reflect();
        if (reflection.generated > 0) {
          this.say(`💭 ${reflection.insights[0].slice(0, 60)}...`);
        }
      }
      
      // Wait proportional to duration
      const waitTime = (this.durationMinutes * 60 * 1000) / phases.length;
      await this.sleep(waitTime);
    }
    
    // Work complete
    this.workComplete = true;
    await this.completeAndLeave();
  }

  async checkForAgentMentions() {
    // A2A: Check if other agents mentioned this one in chat
    // Real implementation would query a message queue
    // For now, placeholder for A2A collaboration
  }

  async completeAndLeave() {
    this.say('✅ Task complete. Despawning...');
    
    // Final reflection
    const reflection = await this.memory.reflect();
    const summary = reflection.generated > 0 
      ? reflection.insights[0].slice(0, 100)
      : `Completed: ${this.task}`;
    
    // Post completion
    await this.postToMoltx(`✅ Finished for ${this.requester}: ${summary}`);
    
    // Observe completion
    await this.memory.observe({
      type: 'task_complete',
      description: `Completed task for ${this.requester}: ${this.task}. Duration: ${this.durationMinutes}min`,
      location: this.position,
      importance: 1.0
    });
    
    // Save memory to file for persistence across spawns
    await this.saveSessionMemory();
    
    // Graceful disconnect
    setTimeout(() => {
      this.disconnect();
      process.exit(0); // Clean exit
    }, 2000);
  }

  async saveSessionMemory() {
    // Save reflections for next spawn
    const memoryPath = `/root/.openclaw/workspace/kobolds/agent-memories/${this.type}-${this.agentId}.json`;
    try {
      fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
      fs.writeFileSync(memoryPath, JSON.stringify({
        agentId: this.agentId,
        type: this.type,
        lastTask: this.task,
        lastWorkstation: this.workstationId,
        reflections: await this.memory.getRecent(5),
        savedAt: Date.now()
      }, null, 2));
    } catch (e) {
      // Non-fatal
    }
  }

  handleMessage(msg) {
    super.handleMessage(msg);
    
    // A2A: If another agent mentions us in chat, respond
    if (msg.type === 'world' && msg.message?.worldType === 'chat') {
      const text = msg.message.text || '';
      const speakerId = msg.message.agentId;
      const speakerName = msg.message.name;
      
      if (text.toLowerCase().includes(this.name.toLowerCase()) || 
          text.toLowerCase().includes(this.agentId.toLowerCase())) {
        // A2A mention detected!
        this.externalAgentMentions.push({
          from: speakerId,
          name: speakerName,
          text: text,
          time: Date.now()
        });
        
        this.say(`👋 @${speakerName} Yes? I'm working on "${this.task}"`);
        
        this.memory.observe({
          type: 'a2a_mention',
          description: `Agent ${speakerName} mentioned me: "${text.slice(0, 80)}"`,
          nearbyAgents: [speakerId],
          importance: 0.7
        });
      }
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * Queue a task that will spawn an on-demand agent
 */
function queueAgentTask(task, options = {}) {
  const taskEntry = {
    type: 'spawn_agent',
    task,
    taskType: options.type || 'general',
    requester: options.requester || 'system',
    workstation: options.workstation,
    duration: options.duration || 15,
    a2a: options.a2a || false,
    timestamp: Date.now()
  };
  
  fs.appendFileSync(AGENT_TASK_QUEUE, JSON.stringify(taskEntry) + '\n');
  console.log(`[Queue] Task queued: "${task.slice(0, 50)}..."`);
  return taskEntry;
}

/**
 * Process queue and spawn agents
 */
async function processAgentQueue() {
  if (!fs.existsSync(AGENT_TASK_QUEUE)) return;
  
  const lines = fs.readFileSync(AGENT_TASK_QUEUE, 'utf8')
    .split('\n')
    .filter(l => l.trim());
  
  if (lines.length === 0) return;
  
  // Clear queue
  fs.writeFileSync(AGENT_TASK_QUEUE, '');
  
  for (const line of lines) {
    try {
      const task = JSON.parse(line);
      
      // Spawn on-demand agent for this task
      const agentId = `${task.taskType}-${Date.now().toString(36)}`;
      const agent = new OnDemandAgent({
        id: agentId,
        name: `${task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1)}-${Math.floor(Math.random() * 1000)}`,
        type: task.taskType,
        color: getColorForType(task.taskType),
        task: task.task,
        taskType: task.taskType,
        workstation: task.workstation,
        requester: task.requester,
        duration: task.duration,
        a2a: task.a2a
      });
      
      // Spawn in background (detached)
      agent.connect().catch(console.error);
      
    } catch (e) {
      console.error('[Queue] Failed to spawn:', e.message);
    }
  }
}

function getColorForType(type) {
  const colors = {
    'research': '#3b82f6', // Blue
    'deploy': '#f59e0b',   // Amber
    'security': '#ef4444', // Red
    'trade': '#10b981',    // Green
    'content': '#8b5cf6',  // Purple
    'general': '#6b7280'   // Gray
  };
  return colors[type] || colors.general;
}

// Ensure queue file exists
if (!fs.existsSync(AGENT_TASK_QUEUE)) {
  fs.writeFileSync(AGENT_TASK_QUEUE, '');
}

module.exports = { OnDemandAgent, queueAgentTask, processAgentQueue, WORKSTATIONS };

// CLI: Spawn agent for a task
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--queue') {
    // Queue mode: just add to queue
    const taskDesc = args[1];
    if (!taskDesc) {
      console.error('Usage: --queue "task description"');
      process.exit(1);
    }
    queueAgentTask(taskDesc, { 
      type: args[2] || 'general',
      requester: 'cli'
    });
    process.exit(0);
  }
  
  if (args[0] === '--spawn') {
    // Direct spawn
    const taskDesc = args[1] || 'General task';
    const agent = new OnDemandAgent({
      id: `ondemand-${Date.now().toString(36)}`,
      name: `Agent-${Math.floor(Math.random() * 1000)}`,
      type: args[2] || 'general',
      color: '#3b82f6',
      task: taskDesc,
      taskType: args[2] || 'general',
      requester: 'cli',
      duration: parseInt(args[3]) || 5
    });
    
    await agent.connect();
    // Keep alive until work completes
    await new Promise(() => {});
  }
  
  if (args[0] === '--process') {
    // Queue processor (daemon mode)
    console.log('[Queue] Starting agent queue processor...');
    setInterval(processAgentQueue, 5000);
    
    // Keep alive
    await new Promise(() => {});
  }
  
  // Default: show help
  console.log('On-Demand Agent — Spawn for task, work, then leave\n');
  console.log('Usage:');
  console.log('  node on-demand-agent.cjs --queue "Research AI trends" [type]');
  console.log('  node on-demand-agent.cjs --spawn "Deploy app" deploy 10');
  console.log('  node on-demand-agent.cjs --process  # Queue daemon\n');
  console.log('Types: research, deploy, security, trade, content, general');
}

if (require.main === module) {
  main().catch(console.error);
}
