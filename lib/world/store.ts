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
    position: { x: 0, y: 15, z: 0 },
    type: 'central',
    radius: 8,
    color: '#6366f1'
  },
  {
    id: 'warrens',
    name: "The Warrens",
    position: { x: -25, y: 2, z: 10 },
    type: 'work',
    radius: 6,
    color: '#22c55e'
  },
  {
    id: 'forge',
    name: "The Forge",
    position: { x: 25, y: 0, z: -10 },
    type: 'work',
    radius: 5,
    color: '#f97316'
  },
  {
    id: 'plaza',
    name: "Gateway Plaza",
    position: { x: 0, y: 0, z: 35 },
    type: 'portal',
    radius: 7,
    color: '#a855f7'
  },
  {
    id: 'market',
    name: "Market Mesa",
    position: { x: 20, y: 5, z: 20 },
    type: 'meeting',
    radius: 6,
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
