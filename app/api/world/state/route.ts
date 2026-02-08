import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Interface for processed kobold state
interface KoboldState {
  id: string;
  name: string;
  type: 'trading' | 'daily' | 'deploy' | 'custom';
  status: 'active' | 'paused' | 'error' | 'sleeping';
  lastRun?: string;
  stats?: {
    tasksCompleted?: number;
    tradesExecuted?: number;
    postsMade?: number;
  };
}

interface WorldSnapshot {
  timestamp: string;
  timezone: string;
  kobolds: KoboldState[];
  islands: {
    id: string;
    name: string;
    agentCount: number;
    activeTasks: number;
  }[];
  metrics: {
    totalAgents: number;
    activeTasks: number;
    completedToday: number;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<WorldSnapshot | { error: string }>> {
  try {
    // Load kobold state files
    const koboldStatePath = path.join('/root/.openclaw/workspace/kobolds', 'daily-kobold-state.json');
    const koboldConfigPath = path.join('/root/.openclaw/workspace/kobolds', 'daily-kobold-config.json');
    
    let kobolds: KoboldState[] = [];
    
    try {
      // Try to read the state file
      const stateData = await fs.readFile(koboldStatePath, 'utf-8');
      const state = JSON.parse(stateData);
      
      // Transform state into kobold entries
      if (state.activeKobolds) {
        kobolds = state.activeKobolds.map((id: string) => ({
          id,
          name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: 'daily',
          status: 'active',
          lastRun: state.lastRun,
          stats: state.stats
        }));
      }
    } catch {
      // If no state file, use defaults
      kobolds = [
        { id: 'daily-kobold', name: 'Daily Kobold', type: 'daily', status: 'active' },
        { id: 'trading-kobold', name: 'Trading Kobold', type: 'trading', status: 'active' },
      ];
    }

    // Island breakdown
    const islands = [
      { id: 'perch', name: "Dragon's Perch", agentCount: 1, activeTasks: 0 },
      { id: 'warrens', name: "The Warrens", agentCount: kobolds.filter(k => k.type === 'daily').length, activeTasks: 0 },
      { id: 'forge', name: "The Forge", agentCount: kobolds.filter(k => k.type === 'trading').length, activeTasks: 0 },
      { id: 'plaza', name: "Gateway Plaza", agentCount: 0, activeTasks: 0 },
      { id: 'market', name: "Market Mesa", agentCount: 0, activeTasks: 0 },
    ];

    const snapshot: WorldSnapshot = {
      timestamp: new Date().toISOString(),
      timezone: 'America/New_York',
      kobolds,
      islands,
      metrics: {
        totalAgents: kobolds.length + 1, // +1 for Shalom
        activeTasks: kobolds.filter(k => k.status === 'active').length,
        completedToday: 0 // Would sum from state files
      }
    };

    return NextResponse.json(snapshot, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=5' // Short cache for live feel
      }
    });

  } catch (error) {
    console.error('[Realm] State error:', error);
    return NextResponse.json(
      { error: 'Failed to load world state' },
      { status: 500 }
    );
  }
}
