'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Building as BuildingType } from '@/lib/village/buildings';

interface BuildingProps {
  building: BuildingType;
  onClick?: (building: BuildingType) => void;
  showLabel?: boolean;
}

export function Building({ building, onClick, showLabel = true }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const pulseRef = useRef(0);

  const { width, depth, height } = building.size;
  const color = building.color;
  const glowColor = building.glowColor || color;

  // Animation - pulse glow when occupied
  useFrame((state) => {
    if (!groupRef.current || !glowRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    if (building.isOccupied) {
      // Pulsing glow when occupied
      pulseRef.current += 0.02;
      const pulse = 1 + Math.sin(pulseRef.current) * 0.15;
      glowRef.current.intensity = 2 * pulse;
      
      // Subtle float
      groupRef.current.position.y = building.position.y + Math.sin(time * 2) * 0.1;
    } else {
      // Gentle idle glow
      const idlePulse = 1 + Math.sin(time * 0.5) * 0.05;
      glowRef.current.intensity = 0.5 * idlePulse;
      groupRef.current.position.y = building.position.y;
    }
  });

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation();
    if (onClick) onClick(building);
  };

  // Generate windows
  const windows = useMemo(() => {
    const windows = [];
    const levels = Math.max(1, Math.floor(height / 3));
    const windowsPerWidth = Math.max(2, Math.floor(width / 5));
    const windowsPerDepth = Math.max(2, Math.floor(depth / 5));
    
    for (let level = 0; level < levels; level++) {
      const y = 2 + level * 3;
      
      // Front and back windows
      for (let i = 0; i < windowsPerWidth; i++) {
        const offset = (i - (windowsPerWidth - 1) / 2) * 3;
        
        // Front
        windows.push(
          <mesh key={`front-${level}-${i}`} position={[offset, y, depth / 2 + 0.1]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={building.isOccupied ? '#fff' : '#334155'}
              emissive={glowColor}
              emissiveIntensity={building.isOccupied ? 1.5 : 0.2}
            />
          </mesh>
        );
        
        // Back
        windows.push(
          <mesh key={`back-${level}-${i}`} position={[offset, y, -depth / 2 - 0.1]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={building.isOccupied ? '#fff' : '#334155'}
              emissive={glowColor}
              emissiveIntensity={building.isOccupied ? 1.5 : 0.2}
            />
          </mesh>
        );
      }
      
      // Side windows
      for (let i = 0; i < windowsPerDepth; i++) {
        const offset = (i - (windowsPerDepth - 1) / 2) * 3;
        
        // Left
        windows.push(
          <mesh key={`left-${level}-${i}`} position={[-width / 2 - 0.1, y, offset]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={building.isOccupied ? '#fff' : '#334155'}
              emissive={glowColor}
              emissiveIntensity={building.isOccupied ? 1.5 : 0.2}
            />
          </mesh>
        );
        
        // Right
        windows.push(
          <mesh key={`right-${level}-${i}`} position={[width / 2 + 0.1, y, offset]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={building.isOccupied ? '#fff' : '#334155'}
              emissive={glowColor}
              emissiveIntensity={building.isOccupied ? 1.5 : 0.2}
            />
          </mesh>
        );
      }
    }
    
    return windows;
  }, [width, depth, height, building.isOccupied, glowColor]);

  return (
    <group 
      ref={groupRef}
      position={[building.position.x, building.position.y, building.position.z]}
      onClick={handleClick}
    >
      {/* Main building body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, height + 1, 0]}>
        <boxGeometry args={[width + 1, 2, depth + 1]} />
        <meshStandardMaterial 
          color={new THREE.Color(color).multiplyScalar(0.8)}
          roughness={0.6}
        />
      </mesh>

      {/* Glow light */}
      <pointLight 
        ref={glowRef}
        color={glowColor}
        intensity={building.isOccupied ? 2 : 0.5}
        distance={width * 2}
        position={[0, height / 2, 0]}
        castShadow
      />

      {/* Windows */}
      {windows}

      {/* Door */}
      <mesh position={[0, 1.5, depth / 2 + 0.05]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial 
          color="#1e293b"
          roughness={0.3}
        />
      </mesh>

      {/* Occupancy indicator */}
      {building.isOccupied && (
        <mesh position={[0, height + 3, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial 
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={2}
          />
        </mesh>
      )}

      {/* Building label */}
      {showLabel && (
        <Html position={[0, height + 4, 0]} center>
          <div className="bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap backdrop-blur-sm border border-white/10 shadow-lg">
            <span className="font-semibold">{building.name}</span>
            {building.isOccupied && (
              <span className="ml-2 text-green-400">● {building.occupants.length}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
