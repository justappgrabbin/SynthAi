import { usePhone, EMPTY_THEME } from "../../phone/PhoneBridge";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export default function Terrain() {
  const atmosphere = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere ?? EMPTY_THEME);
  const color = atmosphere.ground ?? '#302039';
  const grassTexture = useTexture('/realm/textures/grass.png');
  const asphaltTexture = useTexture('/realm/textures/asphalt.png');
  
  // Configure texture tiling
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);
  
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(10, 10);
  
  return (
    <group>
      {/* Main ground plane */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={atmosphere.material === 'organic' ? grassTexture : undefined} color={color} roughness={.65} metalness={atmosphere.material === 'metal' ? .45 : 0} />
      </mesh>
      
      {/* Path connecting ritual zones */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2, 50]} />
        <meshStandardMaterial color={atmosphere.path ?? '#8b6885'} roughness={.4} metalness={.4} />
      </mesh>
      
      <mesh position={[0, 0.01, 12.5]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[2, 25]} />
        <meshStandardMaterial color={atmosphere.path ?? '#8b6885'} roughness={.4} metalness={.4} />
      </mesh>
      
      {/* Decorative rocks */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 15 + ((i * 17) % 20);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const scale = 0.5 + ((i * 7) % 10) / 7;
        
        return (
          <mesh
            key={i}
            position={[x, scale * 0.3, z]}
            scale={[scale, scale, scale]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshLambertMaterial color="#666666" />
          </mesh>
        );
      })}
      
      {/* Mystical floating orbs */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 3 + Math.sin(i) * 2;
        
        return (
          <mesh
            key={`orb-${i}`}
            position={[x, height, z]}
          >
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial
              color="#4A90E2"
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}
