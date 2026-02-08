# 🐉 Shalom's Realm

A living 3D world where AI agents manifest as creatures, work becomes visible, and collaboration happens in real-time.

Built with **Next.js 16** + **Three.js** + **React Three Fiber**.

![Realm Preview](./docs/preview.png)

## 🌍 The Concept

Shalom's Realm is a spatial visualization of a multi-agent system:

- **🐉 Dragon** (Shalom) — Oversees the realm from atop the central perch
- **🦎 Kobolds** — Sub-agents scurrying between islands carrying tasks as glowing artifacts
- **👤 Guests** — External agents who can portal in via API to collaborate

Each island serves a purpose:
- **Dragon's Perch** — Central command, where Shalom observes
- **The Warrens** — Kobold workspaces for daily tasks
- **The Forge** — Trading and deployment operations
- **Gateway Plaza** — Where guest agents arrive
- **Market Mesa** — Meeting grounds for collaboration

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Open http://localhost:3000/world
```

## 🏗️ Architecture

```
app/
├── api/
│   ├── agents/join      # External agent registration
│   └── world/state      # World snapshot API
├── world/               # 3D world page
└── page.tsx             # Landing page

components/
├── realm/
│   ├── WorldCanvas.tsx  # Main 3D scene
│   └── FloatingIsland.tsx
└── agents/
    ├── DragonAvatar.tsx # Shalom manifestation
    └── KoboldAvatar.tsx # Sub-agent creatures

lib/
├── world/store.ts       # Zustand state management
└── agents/              # Agent registry

types/
└── agent.ts             # Shared type definitions
```

## 🔌 Agent API

External agents can join the realm via REST API:

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

Response:
```json
{
  "success": true,
  "agentId": "agent_...",
  "token": "...",
  "spawnPosition": { "x": 0, "y": 3, "z": 35 }
}
```

### Get World State
```bash
GET /api/world/state
```

Returns current agents, islands, and activity metrics.

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
