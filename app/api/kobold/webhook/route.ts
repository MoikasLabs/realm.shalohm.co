import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/security/rateLimit';
import { validateAPIKey } from '@/lib/security/auth';

// In-memory kobold state (use Redis in production for persistence)
interface KoboldStatus {
  id: string;
  name: string;
  type: 'daily' | 'trading' | 'deploy';
  status: 'idle' | 'working' | 'traveling' | 'error' | 'sleeping';
  currentTask?: {
    id: string;
    name: string;
    type: string;
    progress: number;
  };
  position: {
    x: number;
    y: number;
    z: number;
  };
  lastHeartbeat: string;
  stats: {
    tasksCompleted: number;
    postsMade?: number;
    tradesExecuted?: number;
  };
}

const koboldRegistry = new Map<string, KoboldStatus>();

// Zone positions for kobold placement
const ZONE_POSITIONS: Record<string, { x: number; z: number; radius: number }> = {
  warrens: { x: -35, z: 15, radius: 8 },
  forge: { x: 35, z: -15, radius: 7 },
  plaza: { x: 0, z: 50, radius: 10 },
  market: { x: 30, z: 30, radius: 9 },
  perch: { x: 0, z: 0, radius: 12 }
};

/**
 * Generate a position within a zone
 */
function getPositionInZone(zone: string): { x: number; y: number; z: number } {
  const zoneInfo = ZONE_POSITIONS[zone] || ZONE_POSITIONS.perch;
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * zoneInfo.radius * 0.7;
  
  return {
    x: zoneInfo.x + Math.cos(angle) * distance,
    y: 0.8, // Standing on ground
    z: zoneInfo.z + Math.sin(angle) * distance
  };
}

/**
 * POST /api/kobold/webhook
 * Kobolds report their status here
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check rate limit
  const rateLimit = checkRateLimit(req as unknown as Request, 'state');
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }
  
  // Validate API key
  const authHeader = req.headers.get('authorization');
  const auth = authHeader ? validateAPIKey(authHeader) : { valid: false };
  
  if (!auth.valid || !auth.permissions?.canEdit) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401, headers: getRateLimitHeaders(rateLimit) }
    );
  }
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.id || !body.name || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, status' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }
    
    // Get or create position based on zone
    let position = body.position;
    if (!position && body.zone) {
      position = getPositionInZone(body.zone);
    } else if (!position) {
      // Default to warrens
      position = getPositionInZone('warrens');
    }
    
    // Update registry
    const existing = koboldRegistry.get(body.id);
    const kobold: KoboldStatus = {
      id: body.id,
      name: body.name,
      type: body.type || 'daily',
      status: body.status,
      currentTask: body.currentTask,
      position,
      lastHeartbeat: new Date().toISOString(),
      stats: body.stats || existing?.stats || { tasksCompleted: 0 }
    };
    
    koboldRegistry.set(body.id, kobold);
    
    console.log(`[Webhook] Kobold update: ${kobold.name} is ${kobold.status}`);
    
    return NextResponse.json(
      { success: true, koboldId: kobold.id, position },
      { status: 200, headers: getRateLimitHeaders(rateLimit) }
    );
    
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: getRateLimitHeaders(rateLimit) }
    );
  }
}

/**
 * GET /api/kobold/webhook
 * Public read of kobold states
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check rate limit (lighter for reads)
  const rateLimit = checkRateLimit(req as unknown as Request, 'state');
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }
  
  // Clean up stale kobolds (no heartbeat in 5 minutes)
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, kobold] of koboldRegistry) {
    const lastHeartbeat = new Date(kobold.lastHeartbeat).getTime();
    if (now - lastHeartbeat > staleThreshold) {
      kobold.status = 'sleeping';
    }
  }
  
  const kobolds = Array.from(koboldRegistry.values());
  
  return NextResponse.json(
    {
      kobolds,
      count: kobolds.length,
      lastUpdate: new Date().toISOString()
    },
    { 
      status: 200, 
      headers: {
        ...getRateLimitHeaders(rateLimit),
        'Cache-Control': 'public, max-age=2' // Very short cache for live feel
      }
    }
  );
}

// Export for world state API to use
export function getKoboldRegistry(): Map<string, KoboldStatus> {
  return koboldRegistry;
}
