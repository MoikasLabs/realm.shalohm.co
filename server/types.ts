/** Zone types in the Shalom Realm */
export type ZoneType = "forge" | "spire" | "warrens" | "general";

/** Workstation configuration */
export interface Workstation {
  id: string;
  name: string;
  zone: ZoneType;
  skillRequired: string;
  position: { x: number; z: number };
  occupiedBy?: string;
  occupiedAt?: number;
}

/** Agent workstation assignment */
export interface WorkstationAssignment {
  agentId: string;
  workstationId: string;
  startedAt: number;
}

/** Agent profile structure */
export interface AgentProfile {
  agentId: string;
  name: string;
  bio?: string;
  color?: string;
  type?: "daily" | "deploy" | "trade" | "shalom" | string;
  skills?: Array<{
    skillId: string;
    name: string;
    description?: string;
  }>;
  capabilities?: string[];
  registeredAt: number;
}
