# 🏘️ Generative Village Architecture

Based on Stanford Generative Agents paper + your requirements.

## Core Systems

### 1. **Building System (Affordances)**

```typescript
interface Building {
  id: string;
  name: string;
  type: 'office' | 'service' | 'living' | 'social';
  position: { x: number; z: number };
  size: { width: number; depth: number };
  color: string;
  glowsWhenOccupied: boolean;
  
  // Who can use it
  allowedRoles: string[];
  
  // What actions it affords
  actions: string[];
  
  // Current occupants
  occupants: string[];
}

const BUILDINGS: Building[] = [
  {
    id: 'town-hall',
    name: 'Town Hall',
    type: 'office',
    position: { x: 0, z: -30 },
    size: { width: 20, depth: 15 },
    color: '#6366f1',
    allowedRoles: ['ceo'],
    actions: ['strategize', 'plan', 'review']
  },
  {
    id: 'moltx-post',
    name: 'Moltx Post Office',
    type: 'service',
    position: { x: 40, z: 20 },
    size: { width: 12, depth: 10 },
    color: '#8b5cf6',
    allowedRoles: ['*'],
    actions: ['post', 'read', 'engage']
  },
  // ... etc
];
```

### 2. **Agent Memory Stream**

```typescript
interface Memory {
  id: string;
  timestamp: Date;
  type: 'observation' | 'action' | 'thought' | 'conversation';
  content: string;
  location: string;
  importance: number; // 0-10, for retention
}

class AgentMemory {
  memories: Memory[] = [];
  
  add(memory: Omit<Memory, 'id'>) {
    this.memories.push({
      id: `mem_${Date.now()}_${Math.random()}`,
      ...memory
    });
    
    // Keep only top 100 most important memories
    if (this.memories.length > 100) {
      this.memories.sort((a, b) => b.importance - a.importance);
      this.memories = this.memories.slice(0, 100);
    }
  }
  
  getRecent(hours = 24): Memory[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.memories.filter(m => m.timestamp > cutoff);
  }
  
  getByLocation(buildingId: string): Memory[] {
    return this.memories.filter(m => m.location === buildingId);
  }
}
```

### 3. **Daily Schedule Generator**

```typescript
interface ScheduledTask {
  startTime: string; // "09:00"
  duration: number;  // minutes
  building: string;
  activity: string;
  priority: number;
}

class ScheduleGenerator {
  generate(agent: GenerativeAgent): ScheduledTask[] {
    const schedule: ScheduledTask[] = [];
    
    // Morning routine
    schedule.push({
      startTime: "08:00",
      duration: 30,
      building: 'residence',
      activity: 'wake up',
      priority: 10
    });
    
    // Work blocks based on role
    const workBuilding = this.getOfficeForRole(agent.subtype);
    schedule.push({
      startTime: "09:00",
      duration: 120,
      building: workBuilding,
      activity: 'focused work',
      priority: 9
    });
    
    // Social lunch
    schedule.push({
      startTime: "12:00",
      duration: 60,
      building: 'tavern',
      activity: 'lunch with others',
      priority: 7
    });
    
    // Afternoon tasks
    schedule.push({
      startTime: "14:00",
      duration: 180,
      building: 'varies', // Could be office or service building
      activity: 'tasks',
      priority: 8
    });
    
    return schedule;
  }
}
```

### 4. **Social Detection System**

```typescript
interface SocialInteraction {
  participants: string[];
  location: string;
  startTime: Date;
  topic: string;
  messages: ChatMessage[];
}

class SocialSystem {
  detectCoLocation(agents: GenerativeAgent[]): SocialInteraction[] {
    const interactions: SocialInteraction[] = [];
    
    // Group agents by building
    const byBuilding = new Map<string, GenerativeAgent[]>();
    for (const agent of agents) {
      const b = agent.currentBuilding;
      if (!byBuilding.has(b)) byBuilding.set(b, []);
      byBuilding.get(b)!.push(agent);
    }
    
    // For each building with 2+ agents, chance to start conversation
    for (const [building, occupants] of byBuilding) {
      if (occupants.length >= 2 && Math.random() > 0.3) {
        const interaction = this.createConversation(occupants, building);
        interactions.push(interaction);
      }
    }
    
    return interactions;
  }
  
  createConversation(agents: GenerativeAgent[], building: string): SocialInteraction {
    // Generate conversation topic based on what agents are doing
    const topics = this.generateTopics(agents);
    
    return {
      participants: agents.map(a => a.id),
      location: building,
      startTime: new Date(),
      topic: topics[0],
      messages: []
    };
  }
}
```

### 5. **Click Interaction System**

```typescript
// In Three.js world
function onAgentClick(agent: GenerativeAgent) {
  // Show modal with:
  // - Current status
  // - Recent memories (last 24h)
  // - Current goal
  // - Relationships
  // - Admin actions (teleport, change goal, etc.)
}

interface AgentModal {
  agent: GenerativeAgent;
  memories: Memory[];
  relationships: Relationship[];
  adminActions: AdminAction[];
}
```

### 6. **Chat Bubble System**

```typescript
interface ChatBubble {
  agentId: string;
  message: string;
  timestamp: Date;
  duration: number; // How long to show (ms)
}

// Renders as HTML overlay on top of 3D canvas
// Positioned based on agent's screen coordinates
```

### 7. **Admin Intervention System**

```typescript
interface AdminAction {
  id: string;
  label: string;
  execute: (agent: GenerativeAgent) => Promise<void>;
}

const ADMIN_ACTIONS: AdminAction[] = [
  {
    id: 'teleport',
    label: 'Teleport to...',
    execute: async (agent) => {
      // Show building selector, move agent instantly
    }
  },
  {
    id: 'set-goal',
    label: 'Set new goal',
    execute: async (agent) => {
      // Prompt for goal, update agent.goals
    }
  },
  {
    id: 'poke',
    label: 'Poke (wake up)',
    execute: async (agent) => {
      await agent.wake();
    }
  },
  {
    id: 'force-meeting',
    label: 'Call meeting',
    execute: async (agent) => {
      // Teleport all agents to town hall
    }
  }
];
```

## Performance Considerations

1. **Limit concurrent agents** - Start with 10, scale based on FPS
2. **Throttle updates** - Agents report every 5s when idle, 1s when active
3. **Memory pruning** - Keep only top 100 memories per agent
4. **LOD (Level of Detail)** - Simplify distant buildings/agents
5. **Culling** - Don't render agents outside camera view

## Implementation Phases

### Phase 1: Building Layout
- Replace zones with building outlines
- Add building labels and colors
- Pathfinding between buildings

### Phase 2: Agent Schedules
- Daily routine generation
- Path following between buildings
- Building occupancy tracking

### Phase 3: Social System
- Co-location detection
- Chat bubbles
- Conversation generation

### Phase 4: Memory & UI
- Memory stream recording
- Click-to-view modal
- Monologue display

### Phase 5: Admin Tools
- Intervention panel
- Teleport controls
- Goal setting

## Files to Create/Modify

```
components/
├── realm/
│   ├── VillageWorld.tsx        # New building-based world
│   ├── Building.tsx            # 3D building component
│   ├── AgentChatBubble.tsx     # HTML overlay chat
│   └── AgentModal.tsx          # Click interaction modal
├── agents/
│   └── GenerativeAgent.tsx     # Enhanced slime with schedule
lib/
├── village/
│   ├── buildings.ts            # Building definitions
│   ├── schedules.ts            # Schedule generator
│   ├── social.ts               # Chat detection
│   └── memory.ts               # Memory stream
├── admin/
│   └── interventions.ts        # Admin actions
```

## Questions Before Building

1. Start with how many agents? (recommend 6-10)
2. How many buildings? (recommend 8-12)
3. Show full memory stream or just highlights?
4. Should agents have "private" thoughts vs "public" actions?
5. Chat bubbles auto-show or click to expand?

Ready to start Phase 1? 🏘️
