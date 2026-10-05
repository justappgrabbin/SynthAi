import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConsciousness } from "../../lib/stores/useConsciousness";

export default function ParticleEffects() {
  const particlesRef = useRef<THREE.Points>(null);
  const { getActiveField } = useConsciousness();
  
  const particleCount = 200;
  
  // Create particle system
  const { positions, colors, originalPositions } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a sphere around origin
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = Math.random() * 15 + 2;
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      
      originalPositions[i3] = x;
      originalPositions[i3 + 1] = y;
      originalPositions[i3 + 2] = z;
      
      // Default white color
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }
    
    return { positions, colors, originalPositions };
  }, []);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const activeField = getActiveField();
    const time = state.clock.elapsedTime;
    
    // Update particle colors based on active field
    if (activeField) {
      const fieldColor = new THREE.Color(activeField.particleColor);
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        colors[i3] = fieldColor.r;
        colors[i3 + 1] = fieldColor.g;
        colors[i3 + 2] = fieldColor.b;
      }
    }
    
    // Animate particles with flowing motion
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Original position
      const origX = originalPositions[i3];
      const origY = originalPositions[i3 + 1];
      const origZ = originalPositions[i3 + 2];
      
      // Add flowing motion
      const wave1 = Math.sin(time * 0.5 + i * 0.1) * 2;
      const wave2 = Math.cos(time * 0.3 + i * 0.05) * 1.5;
      
      positions[i3] = origX + wave1;
      positions[i3 + 1] = origY + Math.sin(time + i * 0.2) * 2;
      positions[i3 + 2] = origZ + wave2;
    }
    
    // Update geometry attributes
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
