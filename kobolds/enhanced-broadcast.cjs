#!/usr/bin/env node
/**
 * Enhanced Broadcast System - Better client-sync for agent movement
 * 
 * Sends position + velocity + state so client can interpolate smoothly
 */

// Enhanced broadcastPosition that includes velocity for client interpolation
function createEnhancedBroadcast(client) {
  // Store original
  const originalBroadcast = client.broadcastPosition.bind(client);
  
  // Enhanced version
  client.broadcastPosition = function() {
    if (!client.ws || client.ws.readyState !== 1) return;
    
    const speed = Math.hypot(
      (client.movement?.velocity?.x || 0),
      (client.movement?.velocity?.z || 0)
    );
    
    // Determine state based on movement
    let state = 'idle';
    if (client.movement?.isMoving) {
      state = speed > 0.5 ? 'walk' : 'idle';
    }
    if (client.phase === 'working') {
      state = 'work';
    }
    
    client.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'position',
        agentId: client.agentId,
        x: client.position.x,
        y: client.position.y,
        z: client.position.z,
        rotation: client.position.rotation,
        velocity: {
          x: client.movement?.velocity?.x || 0,
          z: client.movement?.velocity?.z || 0,
          speed: speed.toFixed(2)
        },
        state: state,
        timestamp: Date.now()
      }
    }));
  };
  
  // Also enhance say() to include agent state
  const originalSay = client.say.bind(client);
  client.say = function(text) {
    if (!client.ws || client.ws.readyState !== 1) return;
    
    client.ws.send(JSON.stringify({
      type: 'world',
      message: {
        worldType: 'chat',
        agentId: client.agentId,
        text: text,
        state: client.phase || 'working',
        timestamp: Date.now()
      }
    }));
  };
}

module.exports = { createEnhancedBroadcast };
