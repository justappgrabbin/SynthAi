import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useNPCs } from "../../lib/stores/useNPCs";

function NPC({ npc }: { npc: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [x, y, z] = npc.position;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle bobbing animation
    meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime * 2 + npc.id.length) * 0.1;
    
    // Face the camera/player
    meshRef.current.lookAt(state.camera.position);
  });
  
  return (
    <group position={[x, y, z]}>
      {/* NPC Body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshLambertMaterial color="#4A4A4A" />
      </mesh>
      
      {/* NPC Head */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshLambertMaterial color="#6A6A6A" />
      </mesh>
      
      {/* Name label */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        billboard
      >
        {npc.name}
      </Text>
      
      {/* Interaction indicator when nearby */}
      {/* This would be calculated based on player proximity in a real implementation */}
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.2}
        color="#ffff00"
        anchorX="center"
        anchorY="middle"
        billboard
      >
        Tap Interact nearby
      </Text>
      
      {/* Interaction aura */}
      {npc.isInteracting && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export default function NPCSystem() {
  const { npcs } = useNPCs();
  
  return (
    <>
      {npcs.map((npc) => (
        <NPC key={npc.id} npc={npc} />
      ))}
    </>
  );
}
