'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Agent, TaskArtifact } from '@/types/agent';

interface KoboldAvatarProps {
  agent: Agent;
  isLocal?: boolean;
}

export function KoboldAvatar({ agent, isLocal = false }: KoboldAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const jumpRef = useRef(0);

  // Scurrying animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Quick scurry movement when traveling
    if (agent.status === 'traveling') {
      jumpRef.current += 0.2;
      groupRef.current.position.y = agent.position.y + Math.abs(Math.sin(jumpRef.current)) * 0.5;
      groupRef.current.rotation.y += Math.sin(time * 10) * 0.05;
    } else {
      // Idle bob
      groupRef.current.position.y = agent.position.y + Math.sin(time * 3) * 0.1;
      jumpRef.current = 0;
    }
  });

  const color = agent.avatar.color || '#22c55e';
  const scale = agent.avatar.scale * 0.3; // Kobolds are smaller

  return (
    <group 
      ref={groupRef} 
      position={[agent.position.x, agent.position.y, agent.position.z]}
      scale={scale}
    >
      {/* Kobold Body - Compact and rounded */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.2, 0.8]}>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Big Eyes */}
      <mesh position={[-0.3, 0.3, 0.6]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0.3, 0.3, 0.6]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.3, 0.3, 0.75]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.3, 0.3, 0.75]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#000" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.6, 0.8, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.2, 0.6, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.6, 0.8, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.2, 0.6, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Tail */}
      <mesh position={[0, -0.3, -0.8]} rotation={[0.8, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.05, 1, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Task Artifact (if working) */}
      {agent.currentTask && agent.currentTask.artifact && (
        <ArtifactOrb artifact={agent.currentTask.artifact} />
      )}

      {/* Status Glow */}
      {agent.status === 'working' && (
        <pointLight 
          color="#22c55e" 
          intensity={0.5} 
          distance={3}
          position={[0, 2, 0]}
        />
      )}
    </group>
  );
}

// Orb that kobolds carry when working
function ArtifactOrb({ artifact }: { artifact: TaskArtifact }) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!orbRef.current) return;
    const time = state.clock.getElapsedTime();
    orbRef.current.position.y = 1.5 + Math.sin(time * 3) * 0.2;
    orbRef.current.rotation.y += 0.02;
    orbRef.current.rotation.x = Math.sin(time) * 0.1;
  });

  const geometry = useMemo(() => {
    switch (artifact.type) {
      case 'coin': return <sphereGeometry args={[0.2, 8, 8]} />;
      case 'crystal': return <coneGeometry args={[0.15, 0.5, 4]} />;
      case 'scroll': return <boxGeometry args={[0.3, 0.4, 0.05]} />;
      default: return <sphereGeometry args={[0.2, 8, 8]} />;
    }
  }, [artifact.type]);

  return (
    <mesh ref={orbRef} position={[0, 1.5, 0]}>
      {geometry}
      <meshStandardMaterial 
        color={artifact.color}
        emissive={artifact.color}
        emissiveIntensity={artifact.glowIntensity}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}
