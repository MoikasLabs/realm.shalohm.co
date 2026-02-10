import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ── Visual Workstations ─────────────────────────────────────
// 12 workstations matching the workstation-registry.ts

export function createVisualWorkstations(scene: THREE.Scene): { workstations: any[], obstacles: any[] } {
  const workstations: any[] = [];
  const obstacles: any[] = [];

  // FORGE ZONE - Infrastructure & Deployment (around 25, -20)
  // K8s Deployment Station
  const k8sStation = createTerminalStation("K8s Deploy", 0x00d4ff);
  k8sStation.position.set(22, 0, -18);
  scene.add(k8sStation);
  workstations.push({ id: "k8s-deployer", mesh: k8sStation, name: "K8s Deployment Station" });
  obstacles.push({ x: 22, z: -18, radius: 1.5 });

  // Terraform Workbench
  const terraformBench = createWorkbench("Terraform", 0x844fba);
  terraformBench.position.set(28, 0, -18);
  scene.add(terraformBench);
  workstations.push({ id: "terraform-station", mesh: terraformBench, name: "Terraform Workbench" });
  obstacles.push({ x: 28, z: -18, radius: 1.5 });

  // Docker Builder
  const dockerStation = createContainerStation("Docker", 0x2496ed);
  dockerStation.position.set(25, 0, -24);
  scene.add(dockerStation);
  workstations.push({ id: "docker-builder", mesh: dockerStation, name: "Docker Builder" });
  obstacles.push({ x: 25, z: -24, radius: 1.5 });

  // SPIRE ZONE - Security & Secrets (around -20, 25)
  // Vault Unlocker
  const vaultStation = createVaultStation();
  vaultStation.position.set(-23, 0, 22);
  scene.add(vaultStation);
  workstations.push({ id: "vault-unlocker", mesh: vaultStation, name: "Vault Unlocker" });
  obstacles.push({ x: -23, z: 22, radius: 1.5 });

  // Security Audit Helm
  const auditStation = createTerminalStation("Audit", 0xff6b6b);
  auditStation.position.set(-17, 0, 22);
  scene.add(auditStation);
  workstations.push({ id: "audit-helm", mesh: auditStation, name: "Security Audit Helm" });
  obstacles.push({ x: -17, z: 22, radius: 1.5 });

  // Crypto Analyzer
  const cryptoStation = createAnalyzerStation("Crypto", 0xffd93d);
  cryptoStation.position.set(-20, 0, 28);
  scene.add(cryptoStation);
  workstations.push({ id: "crypto-analyzer", mesh: cryptoStation, name: "Crypto Analyzer" });
  obstacles.push({ x: -20, z: 28, radius: 1.5 });

  // WARRENS ZONE - Trading & Markets (around 15, 20)
  // Trading Terminal
  const tradeTerminal = createTerminalStation("Trade", 0x22c55e);
  tradeTerminal.position.set(12, 0, 18);
  scene.add(tradeTerminal);
  workstations.push({ id: "trade-terminal", mesh: tradeTerminal, name: "Trading Terminal" });
  obstacles.push({ x: 12, z: 18, radius: 1.5 });

  // Chart Analysis Desk
  const chartDesk = createWorkbench("Charts", 0x3b82f6);
  chartDesk.position.set(18, 0, 18);
  scene.add(chartDesk);
  workstations.push({ id: "chart-analyzer", mesh: chartDesk, name: "Chart Analysis Desk" });
  obstacles.push({ x: 18, z: 18, radius: 1.5 });

  // Market Scanner
  const scannerStation = createAnalyzerStation("Scanner", 0xf97316);
  scannerStation.position.set(15, 0, 24);
  scene.add(scannerStation);
  workstations.push({ id: "market-scanner", mesh: scannerStation, name: "Market Scanner" });
  obstacles.push({ x: 15, z: 24, radius: 1.5 });

  // GENERAL ZONE - Command & Content (around 0, -10)
  // Command Nexus
  const commandNexus = createTerminalStation("Command", 0x9333ea);
  commandNexus.position.set(-3, 0, -8);
  scene.add(commandNexus);
  workstations.push({ id: "command-nexus", mesh: commandNexus, name: "Command Nexus" });
  obstacles.push({ x: -3, z: -8, radius: 1.5 });

  // Content Forge
  const contentForge = createWorkbench("Content", 0xec4899);
  contentForge.position.set(3, 0, -8);
  scene.add(contentForge);
  workstations.push({ id: "content-forge", mesh: contentForge, name: "Content Forge" });
  obstacles.push({ x: 3, z: -8, radius: 1.5 });

  // Memory Archive
  const memoryArchive = createVaultStation();
  memoryArchive.position.set(0, 0, -13);
  scene.add(memoryArchive);
  workstations.push({ id: "memory-archive", mesh: memoryArchive, name: "Memory Archive" });
  obstacles.push({ x: 0, z: -13, radius: 1.5 });

  // Add labels
  for (const ws of workstations) {
    const el = document.createElement("div");
    el.className = "workstation-label";
    el.textContent = ws.name;
    el.style.cssText = "background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;";
    const labelObj = new CSS2DObject(el);
    labelObj.position.set(0, 2.5, 0);
    ws.mesh.add(labelObj);
  }

  return { workstations, obstacles };
}

// Terminal-style workstation (screens, keyboards)
function createTerminalStation(label: string, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  
  // Desk
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x3d3d5c, roughness: 0.8 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), deskMat);
  desk.position.set(0, 0.5, 0);
  group.add(desk);

  // Screen
  const screenGeo = new THREE.BoxGeometry(1.2, 0.8, 0.1);
  const screenMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111,
    emissive: accentColor,
    emissiveIntensity: 0.3
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 1.6, -0.3);
  screen.rotation.x = 0.1;
  group.add(screen);

  // Glowing display
  const glowGeo = new THREE.PlaneGeometry(1, 0.6);
  const glowMat = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.4 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 1.6, -0.24);
  glow.rotation.x = 0.1;
  group.add(glow);

  // Keyboard
  const kb = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.05, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  kb.position.set(0, 1.05, 0.2);
  group.add(kb);

  return group;
}

// Workbench style (tools, equipment)
function createWorkbench(label: string, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  
  // Workbench surface
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 1.2), benchMat);
  bench.position.set(0, 0.55, 0);
  group.add(bench);

  // Tools/tools container
  const toolMat = new THREE.MeshStandardMaterial({ 
    color: accentColor,
    metalness: 0.6,
    roughness: 0.3
  });
  const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4), toolMat);
  tool.position.set(0.5, 1.3, 0);
  group.add(tool);

  // Holographic display
  const holoGeo = new THREE.ConeGeometry(0.3, 0.6, 4, 1, true);
  const holoMat = new THREE.MeshBasicMaterial({ 
    color: accentColor,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const holo = new THREE.Mesh(holoGeo, holoMat);
  holo.position.set(-0.5, 1.5, 0);
  group.add(holo);

  return group;
}

// Container/Docker station
function createContainerStation(label: string, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  
  // Podium
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a35, metalness: 0.5 })
  );
  base.position.set(0, 0.4, 0);
  group.add(base);

  // Container cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ 
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.9
    })
  );
  cube.position.set(0, 1.3, 0);
  group.add(cube);

  // Floating rings
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8 + i * 0.2, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.8 + i * 0.3, 0);
    group.add(ring);
  }

  return group;
}

// Vault/Security station
function createVaultStation(): THREE.Group {
  const group = new THREE.Group();
  
  // Vault door
  const doorMat = new THREE.MeshStandardMaterial({ 
    color: 0x444444,
    metalness: 0.8,
    roughness: 0.2
  });
  const door = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 16), doorMat);
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 1, 0);
  group.add(door);

  // Lock mechanism
  const lock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8),
    new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 1,
      roughness: 0.1
    })
  );
  lock.rotation.x = Math.PI / 2;
  lock.position.set(0, 1, 0.15);
  group.add(lock);

  // Glowing runes
  const runeGeo = new THREE.RingGeometry(0.4, 0.45, 8);
  const runeMat = new THREE.MeshBasicMaterial({ 
    color: 0x8844ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const runes = new THREE.Mesh(runeGeo, runeMat);
  runes.position.set(0, 1, 0.16);
  group.add(runes);

  // Base pedestal
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a40 })
  );
  pedestal.position.set(0, 0.25, 0);
  group.add(pedestal);

  return group;
}

// Analyzer/Scanner station
function createAnalyzerStation(label: string, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  
  // Scanner base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x333344 })
  );
  base.position.set(0, 0.25, 0);
  group.add(base);

  // Scanning beam (cone)
  const beamGeo = new THREE.ConeGeometry(0.5, 2, 8, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ 
    color: accentColor,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 1.5, 0);
  group.add(beam);

  // Floating data core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 1),
    new THREE.MeshStandardMaterial({ 
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.5
    })
  );
  core.position.set(0, 1.2, 0);
  group.add(core);

  return group;
}
