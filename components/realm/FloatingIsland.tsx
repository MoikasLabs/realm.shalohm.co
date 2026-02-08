'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Island } from '@/types/agent';

interface FloatingIslandProps {
  island: Island;
  children?: React.ReactNode;
}

export function FloatingIsland({ island, children }: FloatingIslandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rockRef = useRef<THREE.Mesh>(null);

  // Gentle floating
  useFrame((state) => {
    if (!groupRef.current || !rockRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const floatY = Math.sin(time * 0.3 + island.position.x * 0.1) * 0.5;
    
    groupRef.current.position.y = island.position.y + floatY;
    
    // Subtle rotation
    groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.02;
  });

  // Procedural rock shape
  const rockGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      island.radius, 
      island.radius * 0.7, 
      3, 
      7
    );
    
    // Deform vertices for organic shape
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Add noise to vertices
      const noise = Math.sin(vertex.x * 0.5) * Math.cos(vertex.z * 0.5) * 0.5;
      vertex.y += noise;
      
      // Taper bottom more
      if (vertex.y < 0) {
        vertex.x *= 0.7;
        vertex.z *= 0.7;
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, [island.radius]);

  return (
    <group 
      ref={groupRef} 
      position={[island.position.x, island.position.y, island.position.z]}
    >
      {/* Main rock mass */}
      <mesh ref={rockRef} geometry={rockGeometry} position={[0, -1, 0]}>
        <meshStandardMaterial 
          color={island.color}
          metalness={0.1}
          roughness={0.8}
          flatShading
        />
      </mesh>

      {/* Grass/grass top */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[island.radius * 0.95, island.radius * 0.9, 0.3, 7]} />
        <meshStandardMaterial 
          color="#4ade80"
          metalness={0}
          roughness={1}
        />
      </mesh>

      {/* Magical particles rising from island */}
      <IslandParticles color={island.color} />

      {/* Portal glow for island type */}
      {island.type === 'portal' && (
        <PortalGlow />
      )}

      {children}
    </group>
  );
}

// Particle effects
function IslandParticles({ color }: { color: string }) {
  const count = 20;
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
      speed: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 3
    }));
  }, []);

  return (
    <group>
      {particles.map((p) => (
        <Particle 
          key={p.id} 
          x={p.x} 
          z={p.z} 
          speed={p.speed}
          delay={p.delay}
          color={color}
        />
      ))}
    </group>
  );
}

function Particle({ x, z, speed, delay, color }: { x: number; z: number; speed: number; delay: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() + delay;
    meshRef.current.position.y = (time * speed) % 5 - 2;
    meshRef.current.position.x = x + Math.sin(time) * 0.5;
    meshRef.current.position.z = z + Math.cos(time * 0.7) * 0.5;
    
    // Fade out as it rises
    const opacity = Math.max(0, 1 - (meshRef.current.position.y + 2) / 5);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[x, -2, z]}>
      <sphereGeometry args={[0.05, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

// Portal glow effect
function PortalGlow() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const time = state.clock.getElapsedTime();
    ringRef.current.rotation.z += 0.005;
    ringRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
  });

  return (
    <group position={[0, 2, 0]}>
      {/* Main portal ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.1, 8, 32]} />
        <meshStandardMaterial 
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Inner glow */}
      <pointLight 
        color="#a855f7" 
        intensity={3} 
        distance={15}
      />
      
      {/* Center orb */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color="#fff"
          emissive="#a855f7"
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  );
}
