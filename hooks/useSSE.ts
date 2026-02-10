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
  onFullState?: (agents: AgentState[]) => void;
  onDeltaUpdate?: (update: WorldDeltaUpdate) => void;
  onPing?: (latency: number) => void;
} = {}) {
  const { onFullState, onDeltaUpdate, onPing } = options;

  return useSSE({
    autoConnect: true,
    autoReconnect: true,
    onFullState,
    onDeltaUpdate: (update) => {
      // Only pass 'delta' and 'full' messages, not 'error' or 'ping'
      if (update.type === 'delta' || update.type === 'full') {
        onDeltaUpdate?.(update as WorldDeltaUpdate);
      }
    },
    onMessage: (data) => {
      if (data.type === 'ping' && data.timestamp) {
        onPing?.(Date.now() - data.timestamp);
      }
    },
  });
}

/**
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

  const handleFullState = useCallback((agents: AgentState[]) => {
    const now = performance.now();
    
    // Initialize interpolated positions
    agents.forEach((agent: AgentState) => {
      interpolatedPositionsRef.current.set(agent.id, {
        current: { ...agent.position },
        target: agent.targetPosition || { ...agent.position },
        startTime: now,
        duration: 100, // INTERPOLATION_DURATION
      });
    });

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
  });

  return {
    ...sse,
    interpolatedPositions: interpolatedPositionsRef.current,
  };
}
