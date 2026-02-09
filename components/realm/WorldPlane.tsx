'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Island } from '@/types/agent';

interface WorldPlaneProps {
  islands: Island[];
  children?: React.ReactNode;
}

export function WorldPlane({ islands, children }: WorldPlaneProps) {
  const planeRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  // Subtle breathing animation for the ground
  useFrame((state) => {
    if (!planeRef.current) return;
    const time = state.clock.getElapsedTime();
    // Very subtle pulse effect on the ground
    const intensity = 0.5 + Math.sin(time * 0.2) * 0.02;
    (planeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity * 0.1;
  });

  return (
    <group>
      {/* Main ground plane */}
      <mesh 
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#1e293b"
          roughness={0.8}
          metalness={0.2}
          emissive="#3b82f6"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Grid overlay for that "digital world" feel */}
      <gridHelper 
        ref={gridRef}
        args={[200, 50, '#475569', '#334155']} 
        position={[0, 0.01, 0]}
      />

      {/* Ground zone markers (replacing floating islands) */}
      {islands.map((island) => (
        <GroundZone key={island.id} island={island} />
      ))}

      {children}
    </group>
  );
}

// Ground zone marker (flat circle/hex on the ground)
function GroundZone({ island }: { island: Island }) {
  const zoneRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!zoneRef.current || !glowRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Gentle pulse for active zones
    const pulse = 1 + Math.sin(time * 2 + island.position.x * 0.1) * 0.05;
    zoneRef.current.scale.setScalar(pulse);
    
    // Glow intensity follows pulse
    glowRef.current.intensity = 1 + Math.sin(time * 2) * 0.3;
  });

  return (
    <group 
      ref={zoneRef}
      position={[island.position.x, 0.05, island.position.z]}
    >
      {/* Zone glow light */}
      <pointLight 
        ref={glowRef}
        color={island.color}
        intensity={1}
        distance={island.radius * 3}
        position={[0, 2, 0]}
      />

      {/* Flat zone indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[island.radius, 32]} />
        <meshStandardMaterial 
          color={island.color}
          transparent
          opacity={0.3}
          roughness={0.5}
        />
      </mesh>

      {/* Zone border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[island.radius * 0.9, island.radius, 64]} />
        <meshStandardMaterial 
          color={island.color}
          emissive={island.color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Zone pillar (low, for height reference) */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
        <meshStandardMaterial 
          color={island.color}
          emissive={island.color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Floating zone label */}
      <ZoneLabel name={island.name} position={[0, 3, 0]} />

      {/* Particle effect for mystical feel */}
      <ZoneParticles color={island.color} radius={island.radius} />

      {/* Special marker for portal */}
      {island.type === 'portal' && <PortalMarker color={island.color} />}
    </group>
  );
}

// Zone label that floats above
function ZoneLabel({ name, position }: { name: string; position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Background plate for text */}
      <mesh>
        <planeGeometry args={[4, 0.6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
      {/* Note: Real text rendering would need @react-three/drei Text component */}
    </group>
  );
}

// Particles rising from zones
function ZoneParticles({ color, radius }: { color: string; radius: number }) {
  const count = 8;
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * radius * 1.5,
      z: (Math.random() - 0.5) * radius * 1.5,
      speed: 0.3 + Math.random() * 0.4,
      delay: Math.random() * 3,
      size: 0.05 + Math.random() * 0.05
    }));
  }, [radius]);

  return (
    <group>
      {particles.map((p) => (
        <ZoneParticle 
          key={p.id}
          x={p.x}
          z={p.z}
          speed={p.speed}
          delay={p.delay}
          size={p.size}
          color={color}
        />
      ))}
    </group>
  );
}

function ZoneParticle({ x, z, speed, delay, size, color }: {
  x: number;
  z: number;
  speed: number;
  delay: number;
  size: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() + delay;
    meshRef.current.position.y = (time * speed) % 4;
    meshRef.current.position.x = x + Math.sin(time) * 0.2;
    meshRef.current.position.z = z + Math.cos(time * 0.7) * 0.2;
    
    const opacity = Math.max(0, 1 - meshRef.current.position.y / 4);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[x, 0, z]}>
      <sphereGeometry args={[size, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

// Portal zone special effects
function PortalMarker({ color }: { color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const time = state.clock.getElapsedTime();
    ringRef.current.rotation.z += 0.01;
    ringRef.current.position.y = 0.5 + Math.sin(time) * 0.1;
  });

  return (
    <group position={[0, 0.5, 0]}>
      {/* Rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.15, 8, 32]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* Inner glow orb */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color="#fff"
          emissive={color}
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}
