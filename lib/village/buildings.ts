/**
 * 🏘️ Village Building System
 * 
 * Building definitions for the generative agent village.
 * 12 buildings with positions, sizes, and occupancy tracking.
 */

export interface Building {
  id: string;
  name: string;
  type: 'office' | 'service' | 'living' | 'social' | 'commerce';
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number; height: number };
  color: string;
  glowColor: string;
  allowedRoles: string[];
  isOccupied: boolean;
  occupants: string[];
  description: string;
}

// 12 buildings for the village
export const VILLAGE_BUILDINGS: Building[] = [
  {
    id: 'town-hall',
    name: 'Town Hall',
    type: 'office',
    position: { x: 0, y: 0, z: -40 },
    size: { width: 24, depth: 18, height: 12 },
    color: '#6366f1',
    glowColor: '#818cf8',
    allowedRoles: ['ceo', 'shalom'],
    isOccupied: false,
    occupants: [],
    description: 'Executive command center for high-level decisions'
  },
  {
    id: 'workshop',
    name: 'Workshop',
    type: 'office',
    position: { x: -35, y: 0, z: -20 },
    size: { width: 18, depth: 14, height: 8 },
    color: '#06b6d4',
    glowColor: '#67e8f9',
    allowedRoles: ['cio', 'shalom'],
    isOccupied: false,
    occupants: [],
    description: 'Technology and innovation hub'
  },
  {
    id: 'market-square',
    name: 'Market Square',
    type: 'commerce',
    position: { x: 35, y: 0, z: -20 },
    size: { width: 20, depth: 20, height: 4 },
    color: '#ec4899',
    glowColor: '#f9a8d4',
    allowedRoles: ['cmo', 'shalom', '*'],
    isOccupied: false,
    occupants: [],
    description: 'Trading and marketing hub'
  },
  {
    id: 'treasury',
    name: 'Treasury',
    type: 'office',
    position: { x: -45, y: 0, z: 10 },
    size: { width: 14, depth: 12, height: 10 },
    color: '#16a34a',
    glowColor: '#86efac',
    allowedRoles: ['cfo', 'shalom'],
    isOccupied: false,
    occupants: [],
    description: 'Financial planning and analysis center'
  },
  {
    id: 'guard-tower',
    name: 'Guard Tower',
    type: 'office',
    position: { x: 45, y: 0, z: 10 },
    size: { width: 12, depth: 12, height: 16 },
    color: '#dc2626',
    glowColor: '#fca5a5',
    allowedRoles: ['cso', 'shalom'],
    isOccupied: false,
    occupants: [],
    description: 'Security and risk management center'
  },
  {
    id: 'tavern',
    name: 'The Cozy Tavern',
    type: 'social',
    position: { x: 0, y: 0, z: 20 },
    size: { width: 16, depth: 14, height: 7 },
    color: '#7c3aed',
    glowColor: '#c4b5fd',
    allowedRoles: ['coo', 'shalom', '*'],
    isOccupied: false,
    occupants: [],
    description: 'Social hub for relaxation and operations planning'
  },
  {
    id: 'moltx-post',
    name: 'Moltx Post',
    type: 'service',
    position: { x: -30, y: 0, z: 35 },
    size: { width: 12, depth: 10, height: 6 },
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Communication and social media hub'
  },
  {
    id: 'moltbook-library',
    name: 'Moltbook Library',
    type: 'service',
    position: { x: 30, y: 0, z: 35 },
    size: { width: 14, depth: 12, height: 8 },
    color: '#f59e0b',
    glowColor: '#fcd34d',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Knowledge archive and learning center'
  },
  {
    id: 'trading-post',
    name: 'Trading Post',
    type: 'commerce',
    position: { x: -25, y: 0, z: -35 },
    size: { width: 14, depth: 12, height: 5 },
    color: '#f97316',
    glowColor: '#fdba74',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Active trading and deal-making center'
  },
  {
    id: 'forge',
    name: 'The Forge',
    type: 'service',
    position: { x: 25, y: 0, z: -35 },
    size: { width: 16, depth: 14, height: 6 },
    color: '#ea580c',
    glowColor: '#fb923c',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Creation and crafting headquarters'
  },
  {
    id: 'residence',
    name: 'Residences',
    type: 'living',
    position: { x: -15, y: 0, z: 45 },
    size: { width: 20, depth: 16, height: 6 },
    color: '#14b8a6',
    glowColor: '#5eead4',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Living quarters for all agents'
  },
  {
    id: 'plaza',
    name: 'Village Plaza',
    type: 'social',
    position: { x: 15, y: 0, z: 45 },
    size: { width: 18, depth: 16, height: 2 },
    color: '#a855f7',
    glowColor: '#d8b4fe',
    allowedRoles: ['*'],
    isOccupied: false,
    occupants: [],
    description: 'Open square for gatherings and events'
  }
];

// Utility functions
export function getBuildingById(id: string): Building | undefined {
  return VILLAGE_BUILDINGS.find(b => b.id === id);
}

export function getBuildingForRole(role: string): Building | undefined {
  return VILLAGE_BUILDINGS.find(b => 
    b.allowedRoles.includes(role) || b.allowedRoles.includes('*')
  );
}

export function getRandomEntrancePosition(building: Building): { x: number; y: number; z: number } {
  const offset = building.size.width / 2 + 2 + Math.random() * 2;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: building.position.x + Math.cos(angle) * offset,
    y: 0.8,
    z: building.position.z + Math.sin(angle) * offset
  };
}

export function calculateDistance(pos1: { x: number; z: number }, pos2: { x: number; z: number }): number {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getNearestBuilding(
  position: { x: number; z: number },
  type?: string
): Building {
  const buildings = type 
    ? VILLAGE_BUILDINGS.filter(b => b.type === type)
    : VILLAGE_BUILDINGS;
  
  return buildings.reduce((nearest, building) => {
    const dist = calculateDistance(position, building.position);
    const nearestDist = calculateDistance(position, nearest.position);
    return dist < nearestDist ? building : nearest;
  }, buildings[0]);
}
