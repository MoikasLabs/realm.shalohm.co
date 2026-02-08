'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Box, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Agent } from '@/types/agent';

interface DragonAvatarProps {
  agent: Agent;
  isLocal?: boolean;
}

export function DragonAvatar({ agent, isLocal = false }: DragonAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wingsRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  // Gentle floating animation
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const floatY = Math.sin(time * 0.5) * 0.3;
    
    groupRef.current.position.y = agent.position.y + floatY;
    groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.1;

    // Wing flutter
    if (wingsRef.current) {
      wingsRef.current.rotation.z = Math.sin(time * 3) * 0.1;
    }

    // Glow pulse
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(time * 2) * 0.5;
    }
  });

  const glowColor = agent.avatar.glowColor || '#ff6b35';
  const bodyColor = agent.avatar.color || '#6366f1';

  return (
    <group 
      ref={groupRef} 
      position={[agent.position.x, agent.position.y, agent.position.z]}
      scale={agent.avatar.scale * 0.5}
    >
      {/* Dragon Glow */}
      <pointLight 
        ref={glowRef}
        color={glowColor}
        intensity={2}
        distance={20}
        decay={2}
      />

      {/* Dragon Body - Main */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[1.5, 3, 4, 8]} />
        <meshStandardMaterial 
          color={bodyColor}
          metalness={0.3}
          roughness={0.4}
          emissive={glowColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Dragon Head */}
      <group position={[0, 2.5, 0.5]}>
        <mesh>
          <coneGeometry args={[1, 2, 6]} />
          <meshStandardMaterial 
            color={bodyColor}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.4, 0.3, 0.5]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.4, 0.3, 0.5]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Wings */}
      <group ref={wingsRef}>
        {/* Left Wing */}
        <mesh position={[-2, 0.5, -1]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[3, 0.1, 2]} />
          <meshStandardMaterial 
            color={bodyColor}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Right Wing */}
        <mesh position={[2, 0.5, -1]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[3, 0.1, 2]} />
          <meshStandardMaterial 
            color={bodyColor}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Tail */}
      <mesh position={[0, -2, -1]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.8, 3, 6]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Status Indicator */}
      {agent.status === 'working' && (
        <mesh position={[0, 4.5, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      )}

      {/* Name Label */}
      {isLocal && (
        <Html position={[0, 5, 0]} center>
          <div className="bg-black/50 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {agent.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Need to import Html for labels
import { Html } from '@react-three/drei';
