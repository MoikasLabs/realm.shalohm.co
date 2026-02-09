import { create } from 'zustand';
import { Agent, WorldState, Island, Task } from '@/types/agent';

interface WorldStore extends WorldState {
  // Actions
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  updateAgentPosition: (agentId: string, position: { x: number; y: number; z: number }) => void;
  updateAgentStatus: (agentId: string, status: Agent['status']) => void;
  assignTask: (agentId: string, task: Task) => void;
  completeTask: (agentId: string, taskId: string) => void;
  setTimeOfDay: (hour: number) => void;
  setWeather: (weather: WorldState['weather']) => void;
}

const initialIslands: Island[] = [
  {
    id: 'perch',
    name: "Dragon's Perch",
    position: { x: 0, y: 0, z: 0 }, // Center of the world
    type: 'central',
    radius: 12,
    color: '#6366f1'
  },
  {
    id: 'warrens',
    name: "The Warrens",
    position: { x: -35, y: 0, z: 15 }, // Left side
    type: 'work',
    radius: 8,
    color: '#22c55e'
  },
  {
    id: 'forge',
    name: "The Forge",
    position: { x: 35, y: 0, z: -15 }, // Right side
    type: 'work',
    radius: 7,
    color: '#f97316'
  },
  {
    id: 'plaza',
    name: "Gateway Plaza",
    position: { x: 0, y: 0, z: 50 }, // Front/entrance
    type: 'portal',
    radius: 10,
    color: '#a855f7'
  },
  {
    id: 'market',
    name: "Market Mesa",
    position: { x: 30, y: 0, z: 30 }, // Front-right
    type: 'meeting',
    radius: 9,
    color: '#eab308'
  }
];

export const useWorldStore = create<WorldStore>((set) => ({
  agents: new Map(),
  tasks: [],
  islands: initialIslands,
  timeOfDay: 12,
  weather: 'clear',

  addAgent: (agent) => set((state) => {
    const newAgents = new Map(state.agents);
    newAgents.set(agent.id, agent);
    return { agents: newAgents };
  }),

  removeAgent: (agentId) => set((state) => {
    const newAgents = new Map(state.agents);
    newAgents.delete(agentId);
    return { agents: newAgents };
  }),

  updateAgentPosition: (agentId, position) => set((state) => {
    const agent = state.agents.get(agentId);
    if (!agent) return state;
    
    const newAgents = new Map(state.agents);
    newAgents.set(agentId, { ...agent, position });
    return { agents: newAgents };
  }),

  updateAgentStatus: (agentId, status) => set((state) => {
    const agent = state.agents.get(agentId);
    if (!agent) return state;
    
    const newAgents = new Map(state.agents);
    newAgents.set(agentId, { ...agent, status });
    return { agents: newAgents };
  }),

  assignTask: (agentId, task) => set((state) => {
    const agent = state.agents.get(agentId);
    if (!agent) return state;
    
    const newAgents = new Map(state.agents);
    newAgents.set(agentId, { ...agent, currentTask: task, status: 'working' });
    return { agents: newAgents, tasks: [...state.tasks, task] };
  }),

  completeTask: (agentId, taskId) => set((state) => {
    const agent = state.agents.get(agentId);
    if (!agent) return state;
    
    const newAgents = new Map(state.agents);
    newAgents.set(agentId, { ...agent, currentTask: undefined, status: 'idle' });
    return { 
      agents: newAgents, 
      tasks: state.tasks.filter(t => t.id !== taskId) 
    };
  }),

  setTimeOfDay: (hour) => set({ timeOfDay: hour }),
  setWeather: (weather) => set({ weather })
}));
