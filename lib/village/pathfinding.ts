/**
 * 🛤️ Village Pathfinding System
 * 
 * Simple pathfinding for agents to move between buildings.
 */

export interface Position {
  x: number;
  y: number;
  z: number;
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpPosition(start: Position, end: Position, t: number): Position {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z, end.z, t)
  };
}

export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export class Pathfinder {
  /**
   * Generate a path from start to end
   * Simple linear interpolation with intermediate points
   */
  findPath(start: Position, end: Position): Position[] {
    const direct = distance(start, end);
    const steps = Math.max(2, Math.ceil(direct / 10));
    const path: Position[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: lerp(start.x, end.x, t),
        y: 0.8,
        z: lerp(start.z, end.z, t)
      });
    }
    
    return path;
  }

  /**
   * Get entrance position offset from building center
   */
  getEntrance(
    buildingPos: { x: number; z: number },
    buildingSize: { width: number; depth: number },
    fromPos?: Position
  ): Position {
    const offset = buildingSize.width / 2 + 2;
    let angle = fromPos 
      ? Math.atan2(buildingPos.z - fromPos.z, buildingPos.x - fromPos.x)
      : Math.random() * Math.PI * 2;
    
    angle = angle + Math.PI; // Face building
    
    return {
      x: buildingPos.x + Math.cos(angle) * offset,
      y: 0.8,
      z: buildingPos.z + Math.sin(angle) * offset
    };
  }
}

export const pathfinder = new Pathfinder();
