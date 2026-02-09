'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Agent, Position } from '@/types/agent';
import { useVillageStore } from '@/lib/store/villageStore';
import { pathfinder } from '@/lib/village/pathfinding';
import { scheduleGenerator } from '@/lib/village/schedules';
import { socialSystem } from '@/lib/village/social';

interface VillageAgentProps {
  agent: Agent;
  isDragon?: boolean;
}

export function VillageAgent({ agent, isDragon = false }: VillageAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const store = useVillageStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [path, setPath] = useState<Position[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  
  const baseScale = isDragon ? 2.2 : 1;
  const color = agent.avatar.color || (isDragon ? '#6366f1' : '#22c55e');
  const glowColor = agent.avatar.glowColor || color;

  // Memoize store methods to avoid dependency issues
  const selectAgent = useCallback(() => store.selectAgent(agent.id), [store, agent.id]);
  const updatePosition = useCallback((pos: Position) => store.updateAgentPosition(agent.id, pos), [store, agent.id]);
  const updateStatus = useCallback((status: Agent['status'], building?: string) => store.updateAgentStatus(agent.id, status, building), [store, agent.id]);
  const updateMonologue = useCallback((mono: string) => store.updateInternalMonologue(agent.id, mono), [store, agent.id]);
  const getAgent = useCallback((id: string) => store.getAgent(id), [store]);

  // Schedule-based movement
  useEffect(() => {
    if (agent.isAdminControlled) return;
    
    const interval = setInterval(() => {
      const currentHour = store.timeOfDay;
      const currentTask = scheduleGenerator.getCurrentTask(agent, currentHour);
      const currentAgent = getAgent(agent.id);
      
      if (currentTask) {
        const building = store.getBuilding(currentTask.building);
        if (building && agent.currentBuilding !== currentTask.building) {
          const targetPos = pathfinder.getEntrance(building, agent.position);
          const newPath = pathfinder.findPath(agent.position, targetPos);
          setPath(newPath);
          setCurrentStep(0);
          setIsMoving(true);
          updateStatus('traveling', currentTask.building);
        } else if (building && currentAgent?.status !== 'working') {
          updateStatus('working', currentTask.building);
          updateMonologue(socialSystem.generateMonologue(agent));
        }
      } else if (currentHour >= 22 || currentHour < 6) {
        if (agent.currentBuilding !== 'residences') {
          updateStatus('sleeping', 'residences');
        }
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [agent.id, agent.isAdminControlled, agent.currentBuilding, agent.position, store, updateStatus, updateMonologue, getAgent]);

  // Movement animation
  useFrame((state) => {
    if (!groupRef.current || !bodyRef.current || !eyesRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    if (isMoving && path.length > 0 && currentStep < path.length) {
      const targetPos = path[currentStep];
      const currentPos = agent.position;
      
      const speed = 3;
      const dx = targetPos.x - currentPos.x;
      const dz = targetPos.z - currentPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < 0.5) {
        if (currentStep < path.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsMoving(false);
          updatePosition(targetPos);
        }
      } else {
        const moveX = (dx / dist) * speed * 0.016;
        const moveZ = (dz / dist) * speed * 0.016;
        
        store.updateAgentPosition(agent.id, {
          x: currentPos.x + moveX,
          y: 0.8,
          z: currentPos.z + moveZ
        });
      }
    }
    
    if (isMoving) {
      const hopHeight = Math.abs(Math.sin(time * 8)) * 1.2;
      groupRef.current.position.y = agent.position.y + hopHeight;
      
      const stretch = 1 + hopHeight * 0.2;
      bodyRef.current.scale.set(
        baseScale * (1 / stretch),
        baseScale * stretch,
        baseScale * (1 / stretch)
      );
    } else {
      const idleY = Math.sin(time * 2) * 0.1;
      groupRef.current.position.y = agent.position.y + idleY;
      
      const idleScale = 1 + Math.sin(time * 3) * 0.03;
      bodyRef.current.scale.set(
        baseScale * idleScale,
        baseScale / idleScale,
        baseScale * idleScale
      );
    }
    
    eyesRef.current.position.y = 0.6 + Math.sin(time * 5) * 0.02;
    eyesRef.current.rotation.y = Math.sin(time * 1.5) * 0.1;
  });

  // Generate internal monologue periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!agent.isAdminControlled && Math.random() > 0.7) {
        const monologue = socialSystem.generateMonologue(agent);
        updateMonologue(monologue);
      }
    }, 8000);
    
    return () => clearInterval(interval);
  }, [agent.isAdminControlled, updateMonologue]);

  return (
    <group 
      ref={groupRef}
      position={[agent.position.x, agent.position.y, agent.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        selectAgent();
      }}
    >
      <pointLight 
        color={glowColor}
        intensity={isDragon ? 2 : 1}
        distance={isDragon ? 12 : 6}
        position={[0, -0.5, 0]}
      />

      <mesh ref={bodyRef} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.3}
          metalness={0.1}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      <group ref={eyesRef} position={[0, 0.6, 0.45]}>
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.05]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[-0.2, 0, 0.03]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.05]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[0.2, 0, 0.03]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      </group>

      <mesh position={[-0.35, 0.1, 0.48]}>
        <boxGeometry args={[0.1, 0.05, 0.02]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.35, 0.1, 0.48]}>
        <boxGeometry args={[0.1, 0.05, 0.02]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.6} />
      </mesh>

      {agent.status === 'working' && (
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      )}
      {agent.status === 'traveling' && (
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
        </mesh>
      )}
      {agent.status === 'sleeping' && (
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1} />
        </mesh>
      )}

      {isDragon && (
        <Html position={[0, 1.8, 0]} center>
          <div className="bg-black/60 text-white px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm font-bold">
            👑 {agent.name}
          </div>
        </Html>
      )}
    </group>
  );
}
