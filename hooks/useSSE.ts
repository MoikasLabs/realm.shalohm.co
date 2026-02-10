/**
 * Server-Sent Events (SSE) Hook for Realm
 * 
 * Replaces Socket.IO with EventSource-based real-time updates.
 * Works perfectly on Vercel's serverless architecture.
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
 * Hook with client-side position memory to prevent agent jumps on SSE reconnect.
 * 
 * When Vercel times out (10s), SSE reconnects, and this remembers agent positions
 * to smoothly interpolate from where they were instead of jumping to server positions.
 * 
 * Legacy compatibility hook - provides same API as useAgentUpdates
 * but uses SSE instead of Socket.IO
 */
export function useAgentUpdatesSSE(options: {
  onFullState?: (agents: AgentState[]) => void;
  onDeltaUpdate?: (update: SSEMessage) => void;
} = {}) {
  const { onFullState, onDeltaUpdate } = options;
  
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

  // Store last known positions before disconnect for smooth reconnection
  const lastPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const wasConnectedRef = useRef(false);

  const handleFullState = useCallback((agents: AgentState[]) => {
    const now = performance.now();
    const isReconnect = wasConnectedRef.current && lastPositionsRef.current.size > 0;
    
    // Initialize interpolated positions
    agents.forEach((agent: AgentState) => {
      if (isReconnect) {
        // On reconnect: Use last known position as start, server position as target
        // This prevents agents from "jumping" when SSE reconnects after timeout
        const lastPos = lastPositionsRef.current.get(agent.id);
        
        if (lastPos) {
          interpolatedPositionsRef.current.set(agent.id, {
            current: { ...lastPos },
            target: agent.position,
            startTime: now,
            duration: 500, // Smooth over 500ms on reconnect
          });
          console.log(`[useAgentUpdatesSSE] Reconnect: agent ${agent.id} interpolating from`, lastPos, 'to', agent.position);
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
        // First connect: Normal initialization
        interpolatedPositionsRef.current.set(agent.id, {
          current: { ...agent.position },
          target: agent.targetPosition || { ...agent.position },
          startTime: now,
          duration: 100, // INTERPOLATION_DURATION
        });
      }
    });

    // Clear saved positions after using them
    if (isReconnect) {
      lastPositionsRef.current.clear();
    }

    onFullState?.(agents);
  }, [onFullState]);

  const handleDeltaUpdate = useCallback((update: SSEMessage) => {
    // Only process valid update types (not 'error' or 'ping')
    if (update.type !== 'delta' && update.type !== 'full') {
      return;
    }

    // Update interpolated positions
    if (update.agents) {
      update.agents.forEach((delta) => {
        if (delta.id && delta.position) {
          const current = interpolatedPositionsRef.current.get(delta.id);
          
          if (current) {
            current.current = { ...current.target };
            current.target = delta.position;
            current.startTime = performance.now();
            current.duration = 100;
          } else {
            interpolatedPositionsRef.current.set(delta.id, {
              current: { ...delta.position },
              target: delta.position,
              startTime: performance.now(),
              duration: 100,
            });
          }
        }
      });
    }

    onDeltaUpdate?.(update);
  }, [onDeltaUpdate]);

  const sse = useRealmSSE({
    onFullState: handleFullState,
    onDeltaUpdate: handleDeltaUpdate,
    onPing: (latency) => {
      // Track connection state
      wasConnectedRef.current = true;
    },
    onDisconnect: () => {
      // Save all current positions before disconnect
      console.log('[useAgentUpdatesSSE] Disconnect: Saving positions...');
      interpolatedPositionsRef.current.forEach((pos, id) => {
        lastPositionsRef.current.set(id, { ...pos.current });
      });
      console.log('[useAgentUpdatesSSE] Saved positions for', lastPositionsRef.current.size, 'agents');
    },
  });

  return {
    ...sse,
    interpolatedPositions: interpolatedPositionsRef.current,
  };
}
