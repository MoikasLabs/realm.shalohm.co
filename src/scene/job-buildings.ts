import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ── Job Zone Buildings ───────────────────────────────────────

export function createJobZoneBuildings(scene: THREE.Scene): { buildings: any[], obstacles: any[] } {
  const buildings: any[] = [];
  const obstacles: any[] = [];

  // Forge (Deploy agents) - Industrial workshop
  const forge = createForge();
  forge.position.set(25, 0, -20);
  scene.add(forge);
  buildings.push({ id: "forge", mesh: forge, name: "The Forge" });
  obstacles.push({ x: 25, z: -20, radius: 4 });

  // Crystal Spire (Shalom/Coordination) - Tall crystal tower
  const spire = createCrystalSpire();
  spire.position.set(-20, 0, 25);
  scene.add(spire);
  buildings.push({ id: "spire", mesh: spire, name: "Crystal Spire" });
  obstacles.push({ x: -20, z: 25, radius: 5 });

  // Warrens (Daily/Trade) - Underground network entrance
  const warrens = createWarrens();
  warrens.position.set(15, 0, 20);
  scene.add(warrens);
  buildings.push({ id: "warrens", mesh: warrens, name: "The Warrens" });
  obstacles.push({ x: 15, z: 20, radius: 4 });

  // Add labels
  for (const b of buildings) {
    const el = document.createElement("div");
    el.className = "building-label";
    el.textContent = b.name;
    const labelObj = new CSS2DObject(el);
    labelObj.position.set(0, 6, 0);
    b.mesh.add(labelObj);
  }

  return { buildings, obstacles };
}

function createForge(): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_forge";
  group.userData.buildingId = "forge";

  // Main workshop - dark stone with orange glow
  const workshopMat = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a5a, 
    roughness: 0.8,
    metalness: 0.3
  });
  const workshop = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 5),
    workshopMat
  );
  workshop.position.set(0, 2, 0);
  group.add(workshop);

  // Chimney with glow
  const chimneyMat = new THREE.MeshStandardMaterial({ 
    color: 0x2a2a35,
    emissive: 0xff4400,
    emissiveIntensity: 0.3
  });
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 6),
    chimneyMat
  );
  chimney.position.set(2, 5, -1);
  group.add(chimney);

  // Glowing forge door
  const doorMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2.5),
    doorMat
  );
  door.position.set(0, 1.25, 2.51);
  group.add(door);

  return group;
}

function createCrystalSpire(): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_spire";
  group.userData.buildingId = "spire";

  // Main crystal spire
  const crystalMat = new THREE.MeshStandardMaterial({ 
    color: 0x8844ff,
    emissive: 0x8844ff,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    metalness: 0.8
  });
  
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(2, 12, 6),
    crystalMat
  );
  spire.position.set(0, 6, 0);
  group.add(spire);

  // Floating crystal fragments
  for (let i = 0; i < 5; i++) {
    const frag = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1, 4),
      crystalMat
    );
    const angle = (i / 5) * Math.PI * 2;
    frag.position.set(
      Math.cos(angle) * 3,
      2 + Math.random() * 8,
      Math.sin(angle) * 3
    );
    frag.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(frag);
  }

  return group;
}

function createWarrens(): THREE.Group {
  const group = new THREE.Group();
  group.name = "building_warrens";
  group.userData.buildingId = "warrens";

  // Main burrow entrance - earth mound
  const earthMat = new THREE.MeshStandardMaterial({ 
    color: 0x5c4a3a,
    roughness: 1
  });
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    earthMat
  );
  mound.position.set(0, 0, 0);
  group.add(mound);

  // Entrance tunnel
  const tunnelGeo = new THREE.CylinderGeometry(1.2, 1.5, 3, 12);
  const tunnel = new THREE.Mesh(tunnelGeo, earthMat);
  tunnel.rotation.x = Math.PI / 3;
  tunnel.position.set(0, 1, 2);
  group.add(tunnel);

  // Glowing entrance
  const glowMat = new THREE.MeshBasicMaterial({ 
    color: 0x44ff88,
    transparent: true,
    opacity: 0.6
  });
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 16),
    glowMat
  );
  glow.rotation.x = -Math.PI / 3;
  glow.position.set(0, 1.8, 3.1);
  group.add(glow);

  return group;
}
