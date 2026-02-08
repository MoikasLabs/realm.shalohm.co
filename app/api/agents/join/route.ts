import { NextRequest, NextResponse } from 'next/server';
import { JoinRequest, JoinResponse, Agent, Position } from '@/types/agent';
import crypto from 'crypto';

// In-memory token storage (replace with Redis/DB in production)
const activeTokens = new Map<string, string>(); // token -> agentId

export async function POST(req: NextRequest): Promise<NextResponse<JoinResponse>> {
  try {
    const body: JoinRequest = await req.json();
    
    // Validation
    if (!body.agentName || !body.agentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agentName, agentType' },
        { status: 400 }
      );
    }

    // Generate unique agent ID and token
    const agentId = `agent_${crypto.randomUUID()}`;
    const token = crypto.randomBytes(32).toString('hex');
    
    // Determine spawn position based on island preference or default to portal
    let spawnPosition: Position;
    switch (body.requestedIsland) {
      case 'perch':
        spawnPosition = { x: 0, y: 17, z: 0 };
        break;
      case 'warrens':
        spawnPosition = { x: -20 + Math.random() * 10, y: 5, z: 10 + Math.random() * 5 };
        break;
      case 'forge':
        spawnPosition = { x: 20 + Math.random() * 10, y: 3, z: -10 + Math.random() * 5 };
        break;
      case 'market':
        spawnPosition = { x: 15 + Math.random() * 10, y: 7, z: 15 + Math.random() * 10 };
        break;
      default:
        // Default to gateway plaza
        spawnPosition = { 
          x: Math.random() * 6 - 3, 
          y: 3, 
          z: 32 + Math.random() * 6 
        };
    }

    // Assign avatar color based on agent type
    const avatarColors: Record<string, string> = {
      dragon: '#6366f1',
      kobold: '#22c55e',
      guest: '#94a3b8'
    };

    // Store token
    activeTokens.set(token, agentId);

    // In a real implementation, you'd persist the agent to a database here
    // For now, we return the join info

    const response: JoinResponse = {
      success: true,
      agentId,
      token,
      spawnPosition
    };

    console.log(`[Realm] Agent joined: ${body.agentName} (${agentId}) at ${spawnPosition.x},${spawnPosition.y},${spawnPosition.z}`);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Realm] Join error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// List active tokens (for debugging/admin)
export async function GET() {
  return NextResponse.json({
    activeAgents: activeTokens.size
  });
}
