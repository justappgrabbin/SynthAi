import { usePhone } from "../../phone/PhoneBridge";
import { AvatarSkin } from "../../phone/AvatarSkin";
import { MorphBody } from '../../phone/ProceduralMorph';
import { AddressSwarm } from "../../phone/AddressSwarm";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";

export default function Avatar() {
  const groupRef = useRef<THREE.Group>(null);
  const { getActiveField } = useConsciousness();
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Gentle floating animation
    groupRef.current.rotation.y += 0.01;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });
  
  const activeField = getActiveField();
  const hostColor = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.color);
  const skin = usePhone((state: any) => state.session?.avatar);
  const form = usePhone((state: any) => state.session?.world?.contract?.sceneMorph?.kind);
  const motion = usePhone((state: any) => state.motion);
  const requestedBody = form && form !== 'human';
  const avatarColor = hostColor || activeField?.avatarColor || '#888888';
  
  return (
    <group ref={groupRef}>
      {requestedBody ? <MorphBody kind={form} color={avatarColor} photo={skin?.photo} motion={motion} /> : <AvatarSkin />}
      <AddressSwarm />
      {/* Stylized humanoid avatar */}
      <group visible={!requestedBody && !skin?.photo && !skin?.spriteSheet}>
        {/* Body */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
        
        {/* Head */}
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
        
        {/* Arms */}
        <mesh position={[-0.4, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 4, 8]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
        <mesh position={[0.4, 0.3, 0]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 4, 8]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
        
        {/* Legs */}
        <mesh position={[-0.15, -0.8, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.9, 4, 8]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
        <mesh position={[0.15, -0.8, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.9, 4, 8]} />
          <meshLambertMaterial color={avatarColor} />
        </mesh>
      </group>
      
      {/* Field-specific aura effect */}
      {activeField && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial
            color={activeField.color}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Field energy rings */}
      {activeField && (
        <>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.4, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial
              color={activeField.particleColor}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
