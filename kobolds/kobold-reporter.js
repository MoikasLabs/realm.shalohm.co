/**
 * Kobold Reporter for Realm
 * 
 * Allows kobolds to report their status and position to the Realm map.
 * Posts to /api/agents/report endpoint.
 */

const REALM_URL = process.env.REALM_URL || 'https://realm.shalohm.co';
const REALM_API_SECRET = process.env.REALM_API_SECRET || '';

/**
 * Report agent status to Realm
 */
async function reportStatus(agentId, status, task, zone, position) {
  try {
    const response = await fetch(`${REALM_URL}/api/agents/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(REALM_API_SECRET && { 'X-Realm-Secret': REALM_API_SECRET }),
      },
      body: JSON.stringify({
        agentId,
        status,
        task,
        location: zone ? { zone } : undefined,
        position,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      console.warn(`[KoboldReporter] Failed to report: ${response.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[KoboldReporter] Error reporting:', err.message);
    return false;
  }
}

/**
 * Start work on a task
 */
async function startWork(agentId, task, zone) {
  console.log(`[KoboldReporter] ${agentId} starting work: ${task} in ${zone}`);
  return reportStatus(agentId, 'working', task, zone, null);
}

/**
 * Finish work, return to idle
 */
async function finishWork(agentId, homeZone) {
  console.log(`[KoboldReporter] ${agentId} finished work, returning to ${homeZone}`);
  return reportStatus(agentId, 'idle', null, homeZone, null);
}

/**
 * Report error status
 */
async function reportError(agentId, error, zone) {
  console.error(`[KoboldReporter] ${agentId} error: ${error}`);
  return reportStatus(agentId, 'error', error, zone, null);
}

/**
 * Update current position
 */
async function updatePosition(agentId, x, y, zone) {
  return reportStatus(agentId, 'working', null, zone, { x, y });
}

module.exports = {
  reportStatus,
  startWork,
  finishWork,
  reportError,
  updatePosition,
};
