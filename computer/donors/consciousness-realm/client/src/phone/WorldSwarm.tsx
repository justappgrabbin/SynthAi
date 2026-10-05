import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePhone, EMPTY_THEME } from './PhoneBridge';
import * as THREE from 'three';

function SwarmPiece({ piece, index, theme }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const position = usePhone((state: any) => state.position);
  const profileId = usePhone((state: any) => state.session?.profile?.id);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const origin = piece.ownerId === profileId ? position : piece.position;
    const phase = piece.phase + clock.elapsedTime * (.12 + piece.address.tone / 60);
    const radius = 3 + piece.address.gate / 14;
    mesh.current.position.set((origin?.[0] ?? 0) + Math.cos(phase + index) * radius,
      1 + piece.address.line / 2 + Math.sin(phase * 2) * .3,
      (origin?.[2] ?? 0) + Math.sin(phase + index) * radius);
    mesh.current.rotation.set(phase, phase / 2, 0);
    mesh.current.scale.setScalar(.13 + piece.amplitude * .26);
  });
  // Only the third stage and above enter visible geometry. Earlier stages
  // remain inspectable as the donor's symbolic state, not guessed physics.
  if (['Movement', 'Evolution'].includes(piece.dimension)) return null;
  return <mesh ref={mesh}>
    {piece.expression.structure.trigrams[0]?.[0] ? <octahedronGeometry /> : <icosahedronGeometry args={[1, 0]} />}
    <meshStandardMaterial color={piece.expression.channels?.color.hex ?? theme.accent ?? '#ed72c8'} emissive={piece.expression.channels?.color.hex ?? theme.accent ?? '#ed72c8'} emissiveIntensity={.55 + piece.amplitude} metalness={theme.material === 'metal' ? .8 : .2} roughness={.25} transparent opacity={.8} />
  </mesh>;
}

export function WorldSwarm() {
  const swarm = usePhone((state: any) => state.session?.swarm);
  const theme = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere ?? EMPTY_THEME);
  if (!swarm) return null;
  return <group>{swarm.pieces.map((piece: any, index: number) => <group key={piece.id}>
    <SwarmPiece piece={piece} index={index} theme={theme} />
    {!['Movement', 'Evolution'].includes(piece.dimension) && <group position={[Math.cos(piece.address.arc / 1296000 * Math.PI * 2) * (15 + index % 3), 0, Math.sin(piece.address.arc / 1296000 * Math.PI * 2) * (15 + index % 3)]}>
      {piece.expression.structure.bits.map((bit: number, level: number) => <group key={level} position={[0, .3 + level * .35, 0]}>
        {bit ? <mesh><boxGeometry args={[1.6, .14, .35]} /><meshStandardMaterial color={theme.accent ?? '#ed72c8'} emissive={theme.accent ?? '#ed72c8'} emissiveIntensity={.2 + piece.amplitude} /></mesh>
          : [-.5, .5].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.6, .14, .35]} /><meshStandardMaterial color={theme.path ?? '#8b6885'} emissive={theme.accent ?? '#ed72c8'} emissiveIntensity={.3} /></mesh>)}
      </group>)}
    </group>}
  </group>)}</group>;
}
