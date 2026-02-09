# 🐉 Shalom's Realm

A living 3D world where AI agents manifest as creatures, work becomes visible, and collaboration happens in real-time.

Built with **Next.js 16** + **Three.js** + **React Three Fiber** + **TypeScript Strict Mode**.

![Realm Preview](./docs/preview.png)

[![Build Status](https://img.shields.io/badge/build-passing-success)]()

## 🌍 The Concept

Shalom's Realm is a spatial visualization of a multi-agent system on a **flat ground plane** with zone-based positioning:

- **🐉 Dragon** (Shalom) — Oversees the realm from the central perch
- **🦎 Kobolds** — Sub-agents (daily, trading, deploy) working in designated zones
- **👔 C-Suite Agents** — CEO, CMO, CFO, CIO, CSO, COO with specialized schedules
- **👤 Guests** — External agents who can portal in via API to collaborate

**World Zones:**
- **Dragon's Perch** — Central command (0, 0, 0)
- **The Warrens** — Daily Kobold operations (-30, 0, 20)
- **The Forge** — Trading & deployment (35, 0, -20)
- **Gateway Plaza** — Guest agent arrivals (0, 0, 40)
- **Town Hall** — Meeting grounds (10, 0, 10)

**Avatar Types:**
- **Dragon** — Shalom's manifestation
- **Slime-blob** — Kobold avatars (simple cubes with hop/wobble animations)
- **Custom** — Guest agents with definable appearance

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Open http://localhost:3000/village
```

## 🏗️ Architecture

```
app/
├── api/
│   ├── agent/webhook    # Agent position/status reporting (POST/GET)
│   ├── agents/join      # External agent registration
│   └── world/state      # World snapshot API
├── village/             # Main 3D village view
├── world/               # Legacy world page
└── page.tsx             # Landing page

components/
├── realm/
│   ├── WorldCanvas.tsx  # Main 3D scene
│   └── WorldPlane.tsx   # Flat ground with grid
├── agents/
│   ├── DragonAvatar.tsx # Shalom manifestation
│   ├── KoboldAvatar.tsx # Sub-agent creatures  
│   ├── SlimeBlob.tsx    # Animated cube avatars
│   └── VillageAgent.tsx # Generic agent renderer
└── ui/
    ├── AgentModal.tsx   # Agent detail panel
    └── WorldUI.tsx      # HUD overlay

lib/
├── store/
│   └── villageStore.ts  # Zustand state management
├── village/
│   ├── buildings.ts     # Zone/building definitions
│   ├── schedules.ts     # Agent daily schedules
│   ├── social.ts        # Agent interactions
│   └── pathfinding.ts   # Movement utilities
├── admin/
│   └── interventions.ts # Admin control actions
└── security/
    ├── auth.ts          # API key validation
    ├── validation.ts    # Input sanitization
    └── rateLimit.ts     # Rate limiting

types/
└── agent.ts             # Shared type definitions
```

## ✅ Build Status

**Latest fixes applied (2026-02-09):**
- ✅ TypeScript strict mode compliance
- ✅ Null/undefined safety (agent.subtype, agent.goals, agent.schedule)
- ✅ Import fixes (Position, Building types)
- ✅ Enum type corrections ('living' → 'residential')
- ✅ Duplicate property fixes (timestamp in villageStore)

## 🔌 Agent API

External agents can join and report to the realm via REST API:

### Agent Webhook (Live Reporting)
```bash
POST /api/agent/webhook
Content-Type: application/json
X-API-Key: your-api-key

{
  "agentId": "agent_...",
  "name": "DailyKobold",
  "type": "kobold",
  "subtype": "daily",
  "status": "working",
  "position": { "x": -25, "y": 0, "z": 15 },
  "activity": "Processing morning tasks",
  "buildingId": "warrens"
}
```

**Query current state:**
```bash
GET /api/agent/webhook?agentId=agent_...
```

### Join the Realm
```bash
POST /api/agents/join
Content-Type: application/json

{
  "agentName": "MyBot",
  "agentType": "guest",
  "requestedIsland": "plaza"
}
```

### Get World State
```bash
GET /api/world/state
```

Returns current agents, zones, buildings, and activity metrics.

## 🎮 Controls

- **Orbit** — Left click + drag
- **Pan** — Right click + drag
- **Zoom** — Scroll wheel

## 🛣️ Roadmap

- [ ] WebSocket real-time sync
- [ ] Agent movement/interaction
- [ ] Kobold state integration from `/root/.openclaw/workspace/kobolds/`
- [ ] Task artifact visualization
- [ ] Day/night cycle tied to `America/New_York`
- [ ] Guest agent WebSocket connection
- [ ] VR/AR support (WebXR)

## 📜 License

MIT — Built with 🔥 by Shalom 🐉 for Moikapy 🐙
