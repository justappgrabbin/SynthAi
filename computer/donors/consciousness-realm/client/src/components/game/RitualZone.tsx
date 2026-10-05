import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { useAudio } from "../../lib/stores/useAudio";

interface RitualZoneProps {
  position: [number, number, number];
  fieldId: string;
  name: string;
}

export default function RitualZone({ position, fieldId, name }: RitualZoneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isActive, setIsActive] = useState(false);
  const [playerNearby, setPlayerNearby] = useState(false);
  const { switchField, getActiveField, activeField } = useConsciousness();
  const { playSuccess } = useAudio();
  
  // Get field colors
  const field = useConsciousness((state) => state.fields.find(f => f.id === fieldId));
  const fieldColor = field?.color || '#ffffff';
  const particleColor = field?.particleColor || '#ffffff';
  
  // Load texture based on field type
  const grassTexture = useTexture('/realm/textures/grass.png');
  const woodTexture = useTexture('/realm/textures/wood.jpg');
  const sandTexture = useTexture('/realm/textures/sand.jpg');
  
  let zoneTexture = grassTexture;
  if (fieldId === 'mind') zoneTexture = sandTexture;
  if (fieldId === 'body') zoneTexture = woodTexture;
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Animate the ritual zone
    groupRef.current.rotation.y += 0.005;
    
    // Check player proximity (assuming player is at camera focus point)
    const playerPos = state.camera.position.clone();
    playerPos.y = 0; // Ground level
    const zonePos = new THREE.Vector3(...position);
    const distance = playerPos.distanceTo(zonePos);
    
    const wasNearby = playerNearby;
    const isNearby = distance < 4;
    setPlayerNearby(isNearby);
    
    // Trigger field switch when player enters zone
    if (isNearby && !wasNearby && activeField !== fieldId) {
      const success = switchField(fieldId);
      if (success) {
        setIsActive(true);
        playSuccess();
        setTimeout(() => setIsActive(false), 2000);
      }
    }
    
    // Pulsing effect when active
    if (isActive || isNearby) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      groupRef.current.scale.setScalar(scale);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Base platform */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3, 0.2, 32]} />
        <meshLambertMaterial map={zoneTexture} />
      </mesh>
      
      {/* Central pillar/altar */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 1, 2, 8]} />
        <meshLambertMaterial color={fieldColor} />
      </mesh>
      
      {/* Energy crystals around the zone */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 2.5;
        const z = Math.sin(angle) * 2.5;
        
        return (
          <mesh key={i} position={[x, 0.5, z]} castShadow>
            <coneGeometry args={[0.2, 1, 6]} />
            <meshLambertMaterial
              color={particleColor}
              emissive={particleColor}
              emissiveIntensity={playerNearby ? 0.3 : 0.1}
            />
          </mesh>
        );
      })}
      
      {/* Floating name text */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.5}
        color={fieldColor}
        anchorX="center"
        anchorY="middle"
        billboard
      >
        {name}
      </Text>
      
      {/* Activation prompt when nearby */}
      {playerNearby && activeField !== fieldId && (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          billboard
        >
          Enter to activate {field?.name} field
        </Text>
      )}
      
      {/* Active field indicator */}
      {activeField === fieldId && (
        <mesh position={[0, 0.1, 0]}>
          <ringGeometry args={[3.2, 3.8, 64]} />
          <meshBasicMaterial
            color={fieldColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
