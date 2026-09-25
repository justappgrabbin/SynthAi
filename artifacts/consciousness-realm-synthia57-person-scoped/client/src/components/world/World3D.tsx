import { useRef, useEffect, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { EmbodiedWorldEngine } from '../../engine/EmbodiedWorldEngine';
import type { Agent, Place } from '../../types/embodiedAgent';
import { ELEMENT_COLORS } from '../../types/embodiedAgent';
import type { RealmMorphVisual } from '../../integration/SynthiaRealm';

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#06060f]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-6 text-center max-w-sm">
            <div className="mb-3 text-3xl">◎</div>
            <p className="mb-1 text-sm font-medium text-white/70">3D World Unavailable</p>
            <p className="text-xs text-white/30">WebGL context could not be created in this environment. The simulation is still running in the background.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Place3D({ place }: { place: Place }) {
  const color = new THREE.Color(place.color);
  return (
    <group position={[place.position.x, 0, place.position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[place.size.width, place.size.depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.18} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[
          Math.min(place.size.width, place.size.depth) * 0.45,
          Math.min(place.size.width, place.size.depth) * 0.5,
          64
        ]} />
        <meshBasicMaterial color={place.color} transparent opacity={0.5} />
      </mesh>
      <PulsingGlow color={place.color} size={Math.min(place.size.width, place.size.depth) * 0.4} />
    </group>
  );
}

function PulsingGlow({ color, size }: { color: string; size: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.08;
    ref.current.scale.setScalar(s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.06 + Math.sin(clock.elapsedTime * 1.5) * 0.04;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[size, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} />
    </mesh>
  );
}

function SynthiaMorphBody({ agent, emissiveIntensity }: { agent: Agent; emissiveIntensity: number }) {
  const morph = agent.morphSignature;
  const form = morph?.form ?? 'field';
  const scale = morph?.scale ?? 1;
  const ringCount = Math.max(1, Math.min(5, morph?.base ?? 3));
  const pulseSpeed = morph?.pulseSpeed ?? 1;
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const t = clock.elapsedTime * pulseSpeed;
    const breathe = 1 + Math.sin(t) * 0.055;
    bodyRef.current.scale.setScalar(scale * breathe);
    bodyRef.current.rotation.y += 0.003 + ((morph?.tone ?? 1) * 0.0008);
  });

  return (
    <group ref={bodyRef}>
      <mesh position={[0, 0.95, 0]} castShadow>
        {form === 'orb' && <sphereGeometry args={[0.48, 24, 24]} />}
        {form === 'column' && <capsuleGeometry args={[0.30, 1.15, 8, 16]} />}
        {form === 'diamond' && <octahedronGeometry args={[0.62, 1]} />}
        {form === 'crystal' && <dodecahedronGeometry args={[0.58, 0]} />}
        {form === 'field' && <icosahedronGeometry args={[0.64, 1]} />}
        <meshStandardMaterial
          color={agent.appearance.color}
          emissive={agent.appearance.auraColor}
          emissiveIntensity={emissiveIntensity + 0.35}
          roughness={0.22}
          metalness={0.7}
          transparent
          opacity={0.92}
        />
      </mesh>

      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial
          color={agent.appearance.auraColor}
          emissive={agent.appearance.color}
          emissiveIntensity={emissiveIntensity + 0.55}
          roughness={0.18}
          metalness={0.72}
        />
      </mesh>

      {Array.from({ length: ringCount }).map((_, index) => (
        <mesh
          key={index}
          position={[0, 1.03, 0]}
          rotation={[
            Math.PI / 2 + index * 0.24,
            (morph?.line ?? 1) * 0.14 + index * 0.36,
            index * 0.28,
          ]}
        >
          <torusGeometry args={[0.72 + index * 0.08, 0.012 + index * 0.003, 8, 48]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? agent.appearance.color : agent.appearance.auraColor}
            transparent
            opacity={0.30 + Math.min(0.45, (morph?.intensity ?? 0.7) * 0.25)}
          />
        </mesh>
      ))}

      <pointLight
        position={[0, 1.05, 0]}
        intensity={1.1 + (morph?.intensity ?? 0.7)}
        distance={8}
        color={agent.appearance.color}
      />
    </group>
  );
}

function AgentAvatar3D({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const auraRef   = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseColors = ELEMENT_COLORS[agent.element];
  const colors = {
    primary: agent.appearance?.color || baseColors.primary,
    glow: agent.appearance?.auraColor || baseColors.glow,
    aura: agent.appearance?.auraColor || baseColors.aura,
  };

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const idOff = Math.sin(t * 0.7 + agent.id.charCodeAt(0) * 0.1) * 0.04;

    switch (agent.animationState) {
      case 'walking':
        groupRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.06 + idOff;
        break;
      case 'meditating':
        groupRef.current.position.y = Math.sin(t * 0.8) * 0.12 + 0.25;
        break;
      case 'talking':
        groupRef.current.rotation.z = Math.sin(t * 5) * 0.04;
        groupRef.current.position.y = idOff;
        break;
      default:
        groupRef.current.position.y = idOff;
    }

    groupRef.current.rotation.y +=
      (agent.rotation - groupRef.current.rotation.y) * 0.08;

    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(t * 2 + agent.id.charCodeAt(0)) * 0.06;
      const s = 1 + Math.sin(t * 1.5) * 0.05;
      auraRef.current.scale.setScalar(s);
    }
  });

  const emissiveIntensity = isSelected ? 0.8 : hovered ? 0.5 : 0.25;

  return (
    <group
      ref={groupRef}
      position={[agent.position.x, 0, agent.position.z]}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={auraRef} position={[0, 1, 0]}>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshBasicMaterial color={colors.aura} transparent opacity={0.15} />
      </mesh>

      {agent.residentType === 'synthia' ? (
        <SynthiaMorphBody agent={agent} emissiveIntensity={emissiveIntensity} />
      ) : (
        <>
          <mesh position={[0, 0.75, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.9, 4, 8]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.glow}
              emissiveIntensity={emissiveIntensity}
              roughness={0.35}
              metalness={0.55}
            />
          </mesh>

          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.23, 16, 16]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.glow}
              emissiveIntensity={emissiveIntensity + 0.2}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>

          <mesh position={[-0.09, 1.6, 0.17]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.09, 1.6, 0.17]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {(isSelected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : colors.glow}
            transparent
            opacity={isSelected ? 0.9 : 0.6}
          />
        </mesh>
      )}

      {agent.currentActivity && (
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial
            color={
              agent.animationState === 'talking'    ? '#4ade80' :
              agent.animationState === 'meditating' ? '#a78bfa' :
              agent.animationState === 'creating'   ? '#fb923c' : '#fbbf24'
            }
          />
        </mesh>
      )}
    </group>
  );
}

function RealmMorphField({ realmMorph }: { realmMorph?: RealmMorphVisual | null }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !realmMorph) return;
    const t = clock.elapsedTime * realmMorph.pulseSpeed;
    ref.current.rotation.y = t * 0.045;
    ref.current.rotation.x = Math.sin(t * 0.17) * 0.12;
    const pulse = 1 + Math.sin(t * 0.42) * (0.025 + realmMorph.intensity * 0.02);
    ref.current.scale.setScalar(pulse);
  });
  if (!realmMorph) return null;
  const form = realmMorph.form;
  return (
    <group ref={ref} position={[0, 20, -10]}>
      <mesh>
        {form === 'orb' && <sphereGeometry args={[23, 24, 24]} />}
        {form === 'column' && <cylinderGeometry args={[15, 22, 42, 12, 1, true]} />}
        {form === 'diamond' && <octahedronGeometry args={[26, 1]} />}
        {form === 'crystal' && <dodecahedronGeometry args={[25, 1]} />}
        {form === 'field' && <icosahedronGeometry args={[27, 2]} />}
        <meshBasicMaterial color={realmMorph.primary} wireframe transparent opacity={0.055 + realmMorph.intensity * 0.03} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[Math.PI / 2 + index * 0.42, index * 0.55, index * 0.3]}>
          <torusGeometry args={[31 + index * 6, 0.08 + index * 0.025, 8, 96]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? realmMorph.primary : realmMorph.secondary}
            transparent
            opacity={0.09 - index * 0.015}
          />
        </mesh>
      ))}
    </group>
  );
}

function Environment({ realmMorph }: { realmMorph?: RealmMorphVisual | null }) {
  const background = realmMorph?.background ?? '#06060f';
  const fog = realmMorph?.fog ?? '#06060f';
  const ground = realmMorph?.ground ?? '#0d0d1a';
  const grid = realmMorph?.grid ?? '#1e1e3a';
  const primary = realmMorph?.primary ?? '#8888ff';
  const secondary = realmMorph?.secondary ?? '#ec4899';
  const intensity = realmMorph?.intensity ?? 0.6;
  return (
    <>
      <color attach="background" args={[background]} />
      <RealmMorphField realmMorph={realmMorph} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={ground} roughness={0.95} />
      </mesh>

      <Grid
        position={[0, -0.04, 0]}
        args={[600, 600]}
        cellSize={10}
        cellThickness={0.4}
        cellColor={grid}
        sectionSize={50}
        sectionThickness={0.8}
        sectionColor={realmMorph?.secondary ?? "#2a2a50"}
        fadeDistance={220}
        fadeStrength={1.2}
        infiniteGrid
      />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[60, 100, 60]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 60, 0]} intensity={0.35 + intensity * 0.45} color={primary} />
      <pointLight position={[-80, 20, -40]} intensity={0.2 + intensity * 0.25} color={primary} />
      <pointLight position={[80, 20, -40]}  intensity={0.2 + intensity * 0.25} color={secondary} />
      <pointLight position={[0, 20, -90]}   intensity={0.2 + intensity * 0.2} color={realmMorph?.primary ?? "#14b8a6"} />

      <fog attach="fog" color={fog} near={120} far={280} />
    </>
  );
}

function CameraController({
  mode,
  target,
}: {
  mode: 'orbit' | 'follow' | 'pov';
  target: Agent | null;
}) {
  const { camera } = useThree();
  useFrame(() => {
    if (mode === 'follow' && target) {
      const tp = new THREE.Vector3(target.position.x, target.position.y + 6, target.position.z + 12);
      camera.position.lerp(tp, 0.04);
      camera.lookAt(target.position.x, target.position.y + 1, target.position.z);
    } else if (mode === 'pov' && target) {
      camera.position.set(target.position.x, target.position.y + 1.7, target.position.z);
      camera.rotation.y = target.rotation;
    }
  });
  return null;
}

interface World3DProps {
  engine: EmbodiedWorldEngine;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  cameraMode: 'orbit' | 'follow' | 'pov';
  realmMorph?: RealmMorphVisual | null;
}

export function World3D({ engine, selectedAgent, onSelectAgent, cameraMode, realmMorph }: World3DProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    setAgents(Array.from(engine.agents.values()));
    setPlaces(Array.from(engine.places.values()));

    engine.onUpdate(() => {
      setAgents(Array.from(engine.agents.values()));
      setPlaces(Array.from(engine.places.values()));
    });
  }, [engine]);

  return (
    <div className="w-full h-full">
      <CanvasErrorBoundary>
      <Canvas
        shadows
        camera={{ position: [0, 65, 110], fov: 55 }}
        style={{ background: realmMorph?.background ?? '#06060f' }}
        gl={{ powerPreference: 'high-performance', antialias: false }}
        onPointerMissed={() => onSelectAgent(null)}
      >
        <Environment realmMorph={realmMorph} />

        {places.map(p => (
          <Place3D key={p.id} place={p} />
        ))}

        {agents.map(a => (
          <AgentAvatar3D
            key={a.id}
            agent={a}
            isSelected={selectedAgent?.id === a.id}
            onClick={() => onSelectAgent(a)}
          />
        ))}

        <CameraController mode={cameraMode} target={selectedAgent} />

        {cameraMode === 'orbit' && (
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={15}
            maxDistance={220}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        )}
      </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
