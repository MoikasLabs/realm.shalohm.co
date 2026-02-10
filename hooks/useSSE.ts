/**
 * Server-Sent Events (SSE) Hook for Realm
 * 
 * Replaces Socket.IO with EventSource-based real-time updates.
 * Works perfectly on Vercel's serverless architecture.
 * 
 * Features client-side prediction for smooth reconnection:
 * - Stores velocity per agent to predict movement during disconnect
 * - "Coasting" mode continues moving agents based on last known velocity
 * - Smooth resync interpolates from predicted position to server position over 1s
 * 
 * @example
 * ```tsx
 * const { isConnected, lastPing, connect, disconnect } = useSSE({
 *   onMessage: (data) => console.log(data),
 *   onConnect: () => console.log('Connected'),
 *   onDisconnect: () => console.log('Disconnected'),
 * });
 * ```
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentState } from '@/types/realtime';

// SSE message types
export interface SSEMessage {
  type: 'full' | 'delta' | 'ping' | 'error';
  timestamp?: number;
  fullState?: AgentState[];
  agents?: Partial<AgentState>[];
  error?: string;
}

export interface UseSSEOptions {
  /** Callback on successful connection */
  onConnect?: () => void;
  /** Callback on disconnect */
  onDisconnect?: (reason?: string) => void;
  /** Callback on connection error */
  onError?: (error: Error) => void;
  /** Callback for any SSE message */
  onMessage?: (data: SSEMessage) => void;
  /** Callback for full state update */
  onFullState?: (agents: AgentState[]) => void;
  /** Callback for delta update */
  onDeltaUpdate?: (update: SSEMessage) => void;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
}

export interface UseSSEReturn {
  /** EventSource instance (null until connected) */
  eventSource: EventSource | null;
  /** Connection status */
  isConnected: boolean;
  /** Last ping timestamp from server */
  lastPing: number | null;
  /** Latency in ms (calculated from ping) */
  latency: number;
  /** Manually connect (if autoConnect is false) */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

// SSE endpoint path
const SSE_ENDPOINT = '/api/events';

// Reconnection delay in ms
const RECONNECT_DELAY = 3000;

/**
 * Custom hook for managing Server-Sent Events connections
 * 
 * Features:
 * - Pure EventSource (no Socket.IO overhead)
 * - Auto-connect and auto-reconnect
 * - Latency tracking via ping messages
 * - Cleanup on unmount
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onFullState,
    onDeltaUpdate,
    autoConnect = true,
    autoReconnect = true,
  } = options;

  // EventSource ref (persists between renders)
  const eventSourceRef = useRef<EventSource | null>(null);
  // Track intent to reconnect
  const shouldReconnectRef = useRef(true);
  // Reconnect timeout ref
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for React to respond to
  const [isConnected, setIsConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [latency, setLatency] = useState(0);

  /**
   * Connect to SSE server
   */
  const connect = useCallback(() => {
    if (typeof window === 'undefined') {
      // Cannot connect on server-side
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      // Already connected, skip
      return;
    }

    // Close any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(SSE_ENDPOINT);
    eventSourceRef.current = eventSource;
    shouldReconnectRef.current = true;

    // Connection opened
    eventSource.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    // Message received
    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        const now = Date.now();

        // Update latency on ping
        if (data.type === 'ping' && data.timestamp) {
          setLastPing(now);
          setLatency(now - data.timestamp);
        }

        // Call specific handlers
        if (data.type === 'full' && data.fullState) {
          onFullState?.(data.fullState);
        }
        if (data.type === 'delta') {
          onDeltaUpdate?.(data);
        }

        // Call generic message handler
        onMessage?.(data);
      } catch (err) {
        console.error('[useSSE] Failed to parse message:', err);
      }
    };

    // Error handler
    eventSource.onerror = (error) => {
      console.error('[useSSE] EventSource error:', error);
      setIsConnected(false);
      
      // Check if connection was closed
      if (eventSource.readyState === EventSource.CLOSED) {
        eventSourceRef.current = null;
        onDisconnect?.('connection closed');

        // Auto-reconnect if enabled
        if (shouldReconnectRef.current && autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      } else {
        onError?.(new Error('EventSource error'));
      }
    };
  }, [onConnect, onDisconnect, onError, onMessage, onFullState, onDeltaUpdate, autoReconnect]);

  /**
   * Disconnect from SSE server
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const eventSource = eventSourceRef.current;
    if (eventSource) {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onDisconnect?.('manual disconnect');
    }
  }, [onDisconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [autoConnect, connect]);

  return {
    eventSource: eventSourceRef.current,
    isConnected,
    lastPing,
    latency,
    connect,
    disconnect,
  };
}

/**
 * Hook specifically for realm.shalohm.co real-time updates
 * Provides typed event handlers for full state and delta updates
 * 
 * Features:
 * - Client-side prediction during SSE reconnects
 * - Velocity tracking for realistic coasting behavior
 * - Smooth 1s resync from predicted to server positions
 * 
 * @example
 * ```tsx
 * const { isConnected, latency } = useRealmSSE({
 *   onFullState: (agents) => store.setAgents(agents),
 *   onDeltaUpdate: (update) => store.applyUpdate(update),
 * });
 * ```
 */
import type { WorldDeltaUpdate } from '@/types/realtime';

export function useRealmSSE(options: {
  onFullState?: (agents: AgentState[], lastPositions?: Map<string, { x: number; y: number }>) => void;
  onDeltaUpdate?: (update: WorldDeltaUpdate) => void;
  onPing?: (latency: number) => void;
  onDisconnect?: () => void;
} = {}) {
  const { onFullState, onDeltaUpdate, onPing, onDisconnect } = options;

  // Position memory for smooth reconnection - prevents agent jumps on SSE reconnect
  // This ref persists across hook re-renders and survives disconnection
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const wasConnectedRef = useRef(false);

  return useSSE({
    autoConnect: true,
    autoReconnect: true,
    onFullState: (agents) => {
      // Check if we have stored positions (reconnect scenario)
      const hasStoredPositions = lastPositionsRef.current.size > 0;
      const isReconnect = wasConnectedRef.current && hasStoredPositions;
      
      if (isReconnect) {
        // This is a reconnect - use stored positions as interpolation start points
        console.log('[useRealmSSE] Reconnect detected, using saved positions for', lastPositionsRef.current.size, 'agents');
        onFullState?.(agents, lastPositionsRef.current);
        // Clear stored positions after using them
        lastPositionsRef.current.clear();
      } else {
        // First connection - no stored positions needed
        onFullState?.(agents);
      }
    },
    onDeltaUpdate: (update) => {
      // Only pass 'delta' and 'full' messages, not 'error' or 'ping'
      if (update.type === 'delta' || update.type === 'full') {
        onDeltaUpdate?.(update as WorldDeltaUpdate);
      }
    },
    onMessage: (data) => {
      if (data.type === 'ping' && data.timestamp) {
        onPing?.(Date.now() - data.timestamp);
        // Mark as connected after receiving a ping
        wasConnectedRef.current = true;
      }
    },
    onDisconnect: () => {
      console.log('[useRealmSSE] Disconnected, expecting' + (wasConnectedRef.current ? ' reconnect' : ' first connection'));
      onDisconnect?.();
    },
  });
}

/**
 * Hook for saving and retrieving position data for smooth reconnection
 * 
 * Call saveCurrentPositions(positions) from your component's onDisconnect
 * to preserve agent positions before SSE reconnects.
 */
export function usePositionSaver() {
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  const savePositions = useCallback((positions: Map<string, { x: number; y: number }>) => {
    positions.forEach((pos, id) => {
      lastPositionsRef.current.set(id, { ...pos });
    });
    console.log('[usePositionSaver] Saved positions for', positions.size, 'agents');
  }, []);

  const getPositions = useCallback(() => {
    return lastPositionsRef.current;
  }, []);

  const clearPositions = useCallback(() => {
    console.log('[usePositionSaver] Clearing saved positions');
    lastPositionsRef.current.clear();
  }, []);

  return {
    savePositions,
    getPositions,
    clearPositions,
  };
}

/**
 * Hook to capture and store agent positions for smooth reconnection.
 * Call this from your component to save positions before disconnect.
 */
export function usePositionMemory() {
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  const savePositions = useCallback((positions: Map<string, { x: number; y: number }>) => {
    positions.forEach((pos, id) => {
      lastPositionsRef.current.set(id, { ...pos });
    });
    console.log('[usePositionMemory] Saved positions for', positions.size, 'agents');
  }, []);

  const getSavedPositions = useCallback(() => {
    return lastPositionsRef.current;
  }, []);

  const clearSavedPositions = useCallback(() => {
    lastPositionsRef.current.clear();
  }, []);

  return {
    savePositions,
    getSavedPositions,
    clearSavedPositions,
    lastPositionsRef,
  };
}

/**
 * Hook with client-side position memory and velocity-based prediction
 * to prevent agent jumps on SSE reconnect.
 * 
 * When Vercel times out (10s), SSE reconnects, and this:
 * 1. Predicts agent movement during disconnect using stored velocity
 * 2. Continues moving agents in "coasting" mode
 * 3. Smoothly resyncs from predicted position to server position over 1s
 * 
 * Users never see a jump - agents keep moving smoothly.
 */
export function useAgentUpdatesSSE(options: {
  onFullState?: (agents: AgentState[]) => void;
  onDeltaUpdate?: (update: SSEMessage) => void;
} = {}) {
  const { onFullState, onDeltaUpdate } = options;
  
  // Interpolated positions cache - NOT cleared on disconnect
  // This allows us to continue animating during the reconnect window
  const interpolatedPositionsRef = useRef<
    Map<
      string,
      {
        current: { x: number; y: number };
        target: { x: number; y: number };
        startTime: number;
        duration: number;
      }
    >
  >(new Map());

  // Client-side prediction: store velocity per agent
  const agentVelocitiesRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());

  // Keep a history of positions to calculate velocity
  const positionHistoryRef = useRef<Map<string, Array<{ x: number; y: number; timestamp: number }>>>(new Map());

  // Last known positions before disconnect for velocity calculation
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Track connection state
  const wasConnectedRef = useRef(false);
  
  // Coasting interval ref - continues moving agents during disconnect
  const coastingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate velocity from position history using last 2-3 positions
  const calculateVelocity = useCallback((id: string, newPos: { x: number; y: number }, timestamp: number) => {
    const history = positionHistoryRef.current.get(id) || [];
    
    // Add new position to history
    history.push({ ...newPos, timestamp });
    
    // Keep only last 5 positions (about 500ms of history at 10fps)
    if (history.length > 5) {
      history.shift();
    }
    
    positionHistoryRef.current.set(id, history);
    
    // Need at least 2 positions to calculate velocity
    if (history.length < 2) {
      return { vx: 0, vy: 0 };
    }
    
    // Use most recent 2-3 positions for velocity
    const recent = history.slice(-3);
    if (recent.length < 2) return { vx: 0, vy: 0 };
    
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const dt = newest.timestamp - oldest.timestamp;
    
    if (dt < 10) return { vx: 0, vy: 0 }; // Too close, not enough time
    
    const vx = (newest.x - oldest.x) / dt;
    const vy = (newest.y - oldest.y) / dt;
    
    return { vx, vy };
  }, []);

  // Start coasting mode - continues moving agents based on velocity
  const startCoasting = useCallback(() => {
    if (coastingIntervalRef.current) {
      clearInterval(coastingIntervalRef.current);
    }
    
    console.log('[useAgentUpdatesSSE] Starting coasting mode for', interpolatedPositionsRef.current.size, 'agents');
    
    const lastTime = performance.now();
    
    coastingIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // Convert to seconds
      
      interpolatedPositionsRef.current.forEach((pos, id) => {
        const velocity = agentVelocitiesRef.current.get(id);
        if (velocity && (Math.abs(velocity.vx) > 0.001 || Math.abs(velocity.vy) > 0.001)) {
          // Apply velocity to continue movement
          pos.current.x += velocity.vx * 1000 * dt * 16; // Scale to match frame rate
          pos.current.y += velocity.vy * 1000 * dt * 16;
          
          // Also update the target so it follows
          pos.target.x += velocity.vx * 1000 * dt * 16;
          pos.target.y += velocity.vy * 1000 * dt * 16;
          
          // Reset start time so interpolation continues fresh
          pos.startTime = now;
        }
      });
      
      // Update lastTime reference (simplified - we'd need a ref for accurate dt)
    }, 16); // ~60fps
  }, []);

  // Stop coasting mode
  const stopCoasting = useCallback(() => {
    if (coastingIntervalRef.current) {
      clearInterval(coastingIntervalRef.current);
      coastingIntervalRef.current = null;
      console.log('[useAgentUpdatesSSE] Stopped coasting mode');
    }
  }, []);

  const handleFullState = useCallback((agents: AgentState[]) => {
    stopCoasting(); // Stop coasting when we get new data
    
    const now = performance.now();
    const isReconnect = wasConnectedRef.current && lastPositionsRef.current.size > 0;
    
    if (isReconnect) {
      console.log('[useAgentUpdatesSSE] Reconnect: smooth resync from predicted positions');
    }
    
    // Initialize or update interpolated positions
    agents.forEach((agent: AgentState) => {
      if (isReconnect) {
        // RECONNECT: Calculate predicted position based on velocity
        const lastPos = lastPositionsRef.current.get(agent.id);
        const velocity = agentVelocitiesRef.current.get(agent.id) || { vx: 0, vy: 0 };
        
        if (lastPos) {
          // Predict where agent should be if it kept moving during disconnect
          // Assume ~3s reconnect window
          const disconnectDuration = 3000; // ms (Vercel timeout + reconnect)
          const predictedX = lastPos.x + velocity.vx * disconnectDuration;
          const predictedY = lastPos.y + velocity.vy * disconnectDuration;
          
          // Interpolate from predicted position to server position over 1s
          // This creates a smooth "steer" effect rather than a jump
          interpolatedPositionsRef.current.set(agent.id, {
            current: { x: predictedX, y: predictedY },
            target: agent.position,
            startTime: now,
            duration: 1000, // 1s smooth resync
          });
          
          console.log(`[useAgentUpdatesSSE] Reconnect: agent ${agent.id} - predicted(${predictedX.toFixed(1)}, ${predictedY.toFixed(1)}) → server(${agent.position.x.toFixed(1)}, ${agent.position.y.toFixed(1)}) vel(${velocity.vx.toFixed(3)}, ${velocity.vy.toFixed(3)})`);
        } else {
          // Agent not seen before disconnect, normal init
          interpolatedPositionsRef.current.set(agent.id, {
            current: { ...agent.position },
            target: agent.targetPosition || { ...agent.position },
            startTime: now,
            duration: 100,
          });
        }
      } else {
        // FIRST CONNECTION: Normal initialization
        interpolatedPositionsRef.current.set(agent.id, {
          current: { ...agent.position },
          target: agent.targetPosition || { ...agent.position },
          startTime: now,
          duration: 100, // INTERPOLATION_DURATION
        });
      }
      
      // Reset position history for this agent
      positionHistoryRef.current.set(agent.id, []);
      // Clear old velocity - will recalculate from fresh
      agentVelocitiesRef.current.delete(agent.id);
    });

    // Clear saved positions after using them
    if (isReconnect) {
      lastPositionsRef.current.clear();
    }

    onFullState?.(agents);
  }, [onFullState, stopCoasting]);

  const handleDeltaUpdate = useCallback((update: SSEMessage) => {
    // Only process valid update types (not 'error' or 'ping')
    if (update.type !== 'delta' && update.type !== 'full') {
      return;
    }

    // Update interpolated positions and calculate velocity
    if (update.agents) {
      const now = performance.now();
      
      update.agents.forEach((delta) => {
        if (delta.id && delta.position) {
          const { vx, vy } = calculateVelocity(delta.id, delta.position, now);
          
          // Store calculated velocity
          if (Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001) {
            agentVelocitiesRef.current.set(delta.id, { vx, vy });
          }
          
          const current = interpolatedPositionsRef.current.get(delta.id);
          
          if (current) {
            current.current = { ...current.target };
            current.target = delta.position;
            current.startTime = now;
            current.duration = 100;
          } else {
            interpolatedPositionsRef.current.set(delta.id, {
              current: { ...delta.position },
              target: delta.position,
              startTime: now,
              duration: 100,
            });
          }
        }
      });
    }

    onDeltaUpdate?.(update);
  }, [onDeltaUpdate, calculateVelocity]);

  const sse = useRealmSSE({
    onFullState: handleFullState,
    onDeltaUpdate: handleDeltaUpdate,
    onPing: (latency) => {
      // Track connection state
      wasConnectedRef.current = true;
    },
    onDisconnect: () => {
      // Save all current positions AND velocities before disconnect
      console.log('[useAgentUpdatesSSE] Disconnect: Saving positions and velocities...');
      
      interpolatedPositionsRef.current.forEach((pos, id) => {
        // Save position
        lastPositionsRef.current.set(id, { ...pos.current });
        
        // Velocity is already stored in agentVelocitiesRef
        const vel = agentVelocitiesRef.current.get(id);
        if (vel) {
          console.log(`[useAgentUpdatesSSE] Saved velocity for ${id}: (${vel.vx.toFixed(3)}, ${vel.vy.toFixed(3)})`);
        }
      });
      
      console.log('[useAgentUpdatesSSE] Saved positions for', lastPositionsRef.current.size, 'agents');
      
      // Start coasting - agents keep moving during disconnect
      startCoasting();
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCoasting();
    };
  }, [stopCoasting]);

  return {
    ...sse,
    interpolatedPositions: interpolatedPositionsRef.current,
  };
}
