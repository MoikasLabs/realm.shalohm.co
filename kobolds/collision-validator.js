/**
 * Collision Validator for Realm Agents
 * Helps agents detect and avoid obstacles before moving
 */

const REALM_API = process.env.REALM_API_URL || 'https://realm.shalohm.co';

// Obstacle definitions (must match server)
const OBSTACLES = [
  { name: 'Moltbook', x: -20, z: -20, radius: 4 },
  { name: 'Clawhub', x: 22, z: -22, radius: 6 },
  { name: 'Portal', x: 0, z: -35, radius: 5 },
  { name: 'Burrow', x: 40, z: 40, radius: 8 }
];

const WORLD_BOUNDS = 50; // +/- 50

/**
 * Check if a position would collide with any obstacle
 * Returns { safe: boolean, obstacles: [{name, distance, threshold}] }
 */
export function checkCollision(x, z, buffer = 1.0) {
  const collisions = [];
  
  // Check world bounds
  if (Math.abs(x) > WORLD_BOUNDS || Math.abs(z) > WORLD_BOUNDS) {
    collisions.push({
      name: 'WORLD_BOUNDS',
      distance: Math.max(Math.abs(x), Math.abs(z)),
      threshold: WORLD_BOUNDS,
      isSafe: false
    });
  }
  
  // Check obstacles
  for (const obs of OBSTACLES) {
    const dx = x - obs.x;
    const dz = z - obs.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const threshold = obs.radius + buffer;
    const isSafe = dist >= threshold;
    
    if (!isSafe) {
      collisions.push({
        name: obs.name,
        distance: dist,
        threshold: threshold,
        isSafe: false
      });
    }
  }
  
  return {
    safe: collisions.length === 0,
    obstacles: collisions
  };
}

/**
 * Find the nearest safe position from a target
 * If target is inside obstacle, returns closest point on the edge
 */
export function findSafePosition(targetX, targetZ, preferredDirection = null) {
  const check = checkCollision(targetX, targetZ);
  if (check.safe) {
    return { x: targetX, z: targetZ, original: true };
  }
  
  // For each colliding obstacle, find closest edge point
  let adjustedX = targetX;
  let adjustedZ = targetZ;
  
  for (const collision of check.obstacles) {
    if (collision.name === 'WORLD_BOUNDS') {
      // Clamp to world bounds
      adjustedX = Math.max(-WORLD_BOUNDS + 1, Math.min(WORLD_BOUNDS - 1, adjustedX));
      adjustedZ = Math.max(-WORLD_BOUNDS + 1, Math.min(WORLD_BOUNDS - 1, adjustedZ));
      continue;
    }
    
    const obs = OBSTACLES.find(o => o.name === collision.name);
    if (!obs) continue;
    
    // Vector from obstacle center to target
    const dx = adjustedX - obs.x;
    const dz = adjustedZ - obs.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    
    if (dist === 0) {
      // Target exactly at center - push in preferred direction or +x
      adjustedX = obs.x + obs.radius + 1.5;
      adjustedZ = obs.z;
    } else {
      // Push to edge of obstacle + buffer
      const safeDist = obs.radius + 1.5; // 0.5m extra buffer
      const ratio = safeDist / dist;
      adjustedX = obs.x + dx * ratio;
      adjustedZ = obs.z + dz * ratio;
    }
  }
  
  // Verify the adjusted position is safe
  const recheck = checkCollision(adjustedX, adjustedZ);
  if (!recheck.safe) {
    // Recursive adjustment if still colliding
    return findSafePosition(adjustedX, adjustedZ);
  }
  
  return { x: adjustedX, z: adjustedZ, original: false, distance: Math.sqrt((adjustedX-targetX)**2 + (adjustedZ-targetZ)**2) };
}

/**
 * Validate a path between two points
 * Returns array of safe waypoints avoiding obstacles
 */
export function validatePath(startX, startZ, endX, endZ, steps = 20) {
  const waypoints = [{ x: startX, z: startZ }];
  
  // Check if direct path is clear
  let directPathClear = true;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + (endX - startX) * t;
    const z = startZ + (endZ - startZ) * t;
    const check = checkCollision(x, z);
    if (!check.safe) {
      directPathClear = false;
      break;
    }
  }
  
  if (directPathClear) {
    waypoints.push({ x: endX, z: endZ });
    return { waypoints, direct: true };
  }
  
  // Path goes through obstacle - need waypoints
  // Use midpoint displacement strategy
  const midX = (startX + endX) / 2;
  const midZ = (startZ + endZ) / 2;
  
  // Try offset points around the midpoint
  const offsets = [
    { dx: 0, dz: 0 },
    { dx: 8, dz: 0 }, { dx: -8, dz: 0 },
    { dx: 0, dz: 8 }, { dx: 0, dz: -8 },
    { dx: 6, dz: 6 }, { dx: -6, dz: 6 },
    { dx: 6, dz: -6 }, { dx: -6, dz: -6 }
  ];
  
  for (const off of offsets) {
    const testX = midX + off.dx;
    const testZ = midZ + off.dz;
    const safePoint = findSafePosition(testX, testZ);
    
    if (safePoint.original || safePoint.distance < 15) {
      // Recursively validate first half
      const firstHalf = validatePath(startX, startZ, safePoint.x, safePoint.z, steps/2);
      if (firstHalf.waypoints.length > 1) {
        // Recursively validate second half
        const secondHalf = validatePath(safePoint.x, safePoint.z, endX, endZ, steps/2);
        if (secondHalf.waypoints.length > 1) {
          return {
            waypoints: [...firstHalf.waypoints, ...secondHalf.waypoints.slice(1)],
            direct: false
          };
        }
      }
    }
  }
  
  // Fallback: go to safe version of target
  const safeTarget = findSafePosition(endX, endZ);
  return {
    waypoints: [...waypoints, safeTarget],
    direct: false,
    partial: true
  };
}

/**
 * Real-time position validator for agents
 * Checks current position and suggests correction if stuck
 */
export async function validateAgentPosition(agentId, currentX, currentZ) {
  const check = checkCollision(currentX, currentZ);
  
  if (check.safe) {
    return { safe: true, position: { x: currentX, z: currentZ } };
  }
  
  // Agent is stuck - find nearest safe position
  const safe = findSafePosition(currentX, currentZ);
  
  console.warn(`[CollisionValidator] ${agentId} is stuck at (${currentX.toFixed(1)}, ${currentZ.toFixed(1)})!`);
  console.warn(`[CollisionValidator] Suggested safe position: (${safe.x.toFixed(1)}, ${safe.z.toFixed(1)})`);
  
  // Log collision details
  for (const obs of check.obstacles) {
    console.warn(`  → ${obs.name}: ${obs.distance.toFixed(1)}m (need ${obs.threshold.toFixed(1)}m)`);
  }
  
  return {
    safe: false,
    stuck: true,
    position: safe,
    original: { x: currentX, z: currentZ },
    obstacles: check.obstacles
  };
}

/**
 * Get safe spawn position near a target area
 */
export function findSafeSpawn(preferredX = 0, preferredZ = 0, radius = 20) {
  // Try preferred location first
  const preferred = findSafePosition(preferredX, preferredZ);
  if (preferred.original) {
    return preferred;
  }
  
  // Try random positions in radius
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const x = preferredX + Math.cos(angle) * dist;
    const z = preferredZ + Math.sin(angle) * dist;
    
    const safe = findSafePosition(x, z);
    if (safe.original) {
      return safe;
    }
  }
  
  // Fallback to command nexus area
  return findSafePosition(0, -10);
}

/**
 * Diagnostic tool - check all agent positions
 */
export async function checkAllAgents() {
  try {
    const res = await fetch(`${REALM_API}/ipc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'profiles' })
    });
    const data = await res.json();
    
    const problems = [];
    
    for (const profile of data.profiles || []) {
      // Would need position data from world-state
      // This is a placeholder for a full diagnostic
      console.log(`[Check] ${profile.agentId}: ${profile.bio?.slice(0, 50)}`);
    }
    
    return problems;
  } catch (err) {
    console.error('[CollisionValidator] Check failed:', err.message);
    return [];
  }
}

// Export for use
export { OBSTACLES, WORLD_BOUNDS };
export default {
  checkCollision,
  findSafePosition,
  validatePath,
  validateAgentPosition,
  findSafeSpawn,
  checkAllAgents
};
