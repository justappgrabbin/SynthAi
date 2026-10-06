import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePhone, EMPTY_THEME } from './PhoneBridge';
import * as THREE from 'three';

const EMPTY_PIECES: any[] = [];
const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function OrbitPieces({ pieces, theme, octahedron }: any) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    pieces.forEach((piece: any, i: number) => { tint.set(piece.expression.channels?.color.hex ?? theme.accent ?? '#ed72c8'); mesh.current!.setColorAt(i, tint); });
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [pieces, theme]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const phone = usePhone.getState();
    pieces.forEach((piece: any, i: number) => {
      const origin = piece.ownerId === phone.session?.profile?.id ? phone.position : piece.position;
      const phase = piece.phase + clock.elapsedTime * (.12 + piece.address.tone / 60);
      const radius = 3 + piece.address.gate / 14;
      dummy.position.set((origin?.[0] ?? 0) + Math.cos(phase + i) * radius,
        1 + piece.address.line / 2 + Math.sin(phase * 2) * .3,
        (origin?.[2] ?? 0) + Math.sin(phase + i) * radius);
      dummy.rotation.set(phase, phase / 2, 0); dummy.scale.setScalar(.13 + piece.amplitude * .26); dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  if (!pieces.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, pieces.length]} frustumCulled={false}>
    {octahedron ? <octahedronGeometry /> : <icosahedronGeometry args={[1, 0]} />}
    <meshStandardMaterial color="white" emissive={theme.accent ?? '#ed72c8'} emissiveIntensity={.35} metalness={theme.material === 'metal' ? .8 : .2} roughness={.25} transparent opacity={.8} />
  </instancedMesh>;
}

function HexagramStructures({ pieces, theme }: any) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bars = useMemo(() => pieces.flatMap((piece: any, index: number) => {
    const angle = (piece.address.arc ?? piece.address.gate * 20250) / 1296000 * Math.PI * 2;
    const x = Math.cos(angle) * (15 + index % 3), z = Math.sin(angle) * (15 + index % 3);
    return piece.expression.structure.bits.flatMap((bit: number, level: number) => (bit ? [0] : [-.5, .5]).map(offset => ({ x: x + offset, y: .3 + level * .35, z, width: bit ? 1.6 : .6, color: bit ? piece.expression.channels?.color.hex ?? theme.accent : theme.path })));
  }), [pieces, theme]);
  useEffect(() => {
    if (!mesh.current) return;
    bars.forEach((bar: any, i: number) => {
      dummy.position.set(bar.x, bar.y, bar.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(bar.width, .14, .35); dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix); tint.set(bar.color ?? '#ed72c8'); mesh.current!.setColorAt(i, tint);
    });
    mesh.current.instanceMatrix.needsUpdate = true; if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [bars]);
  if (!bars.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, bars.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="white" emissive={theme.accent ?? '#ed72c8'} emissiveIntensity={.25} /></instancedMesh>;
}

export function WorldSwarm() {
  const source = usePhone((state: any) => state.session?.swarm?.pieces ?? EMPTY_PIECES);
  const theme = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere ?? EMPTY_THEME);
  const requestedArchitecture = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.architecture?.kind);
  // Units span all five fields. Geometry uses Being; Space is the observer.
  const visible = useMemo(() => source.filter((piece: any) => piece.fields?.Being), [source]);
  const octahedra = useMemo(() => visible.filter((piece: any) => piece.expression.structure.trigrams[0]?.[0]), [visible]);
  const other = useMemo(() => visible.filter((piece: any) => !piece.expression.structure.trigrams[0]?.[0]), [visible]);
  return <group><OrbitPieces pieces={octahedra} theme={theme} octahedron /><OrbitPieces pieces={other} theme={theme} octahedron={false} />{!requestedArchitecture && <HexagramStructures pieces={visible} theme={theme} />}</group>;
}
