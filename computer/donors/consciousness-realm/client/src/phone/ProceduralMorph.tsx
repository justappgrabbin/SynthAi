import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePhone, publishRealmEvent } from './PhoneBridge';

const spectrum = ['#ff526c', '#ff9b45', '#ffe36b', '#76d9a0', '#72baff', '#8e8bff', '#cf8fff'];

export function MorphBody({ kind, color = '#e8a3df', photo, name, motion = 'idle' }: any) {
  const wings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (wings.current) {
      wings.current.rotation.y = Math.sin(clock.elapsedTime * (motion === 'walk' ? 12 : 5)) * .45;
      const target = motion === 'sit' ? .65 : motion === 'lift' || motion === 'reach' ? 1.2 : 1;
      wings.current.scale.y = THREE.MathUtils.lerp(wings.current.scale.y, target, .12);
    }
  });
  return <group name={`host-morph:${kind}`}>
    {kind === 'butterfly' ? <>
      <mesh scale={[.14, .65, .14]}><sphereGeometry args={[1, 12, 12]} /><meshStandardMaterial color="#3c294d" /></mesh>
      <group ref={wings}>
        {[-1, 1].flatMap(side => [0, 1].map(lobe => <mesh key={`${side}:${lobe}`} position={[side * (.62 - lobe * .12), .32 - lobe * .65, 0]} rotation={[0, 0, side * (.4 - lobe * .8)]} scale={[.68 - lobe * .12, .55 - lobe * .1, .06]}>
          <sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.15} metalness={.2} roughness={.4} />
        </mesh>))}
      </group>
      {[-1, 1].map(side => <mesh key={side} position={[side * .13, .86, 0]} rotation={[0, 0, side * -.35]}><cylinderGeometry args={[.018, .018, .42, 6]} /><meshStandardMaterial color={color} /></mesh>)}
    </> : kind === 'flower' ? <>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * .48, Math.sin(i * Math.PI / 4) * .48, 0]} rotation={[0, 0, i * Math.PI / 4]} scale={[.45, .24, .09]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color={color} /></mesh>)}
      <mesh><sphereGeometry args={[.3, 16, 12]} /><meshStandardMaterial color="#ffe36b" /></mesh>
    </> : kind === 'star' ? <Star color={color} /> : kind === 'crystal' ? <mesh scale={[.7, 1, .7]}><octahedronGeometry args={[1]} /><meshStandardMaterial color={color} metalness={.35} roughness={.1} transparent opacity={.85} /></mesh> : null}
    <Html position={[0, .7, .15]} center style={{ pointerEvents: 'none', width: 44 }}>
      {photo && <img src={photo} alt="Your identity in the host's form" style={{ width: 36, maxWidth: 'none', height: 44, display: 'block', borderRadius: '50%', objectFit: 'cover' }} />}
      {name && <span style={{ display: 'block', color: 'white', fontSize: 11 }}>{name}</span>}
    </Html>
  </group>;
}

function Star({ color }: any) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .42 : 1;
      if (!i) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    shape.closePath(); return shape;
  }, []);
  return <mesh><extrudeGeometry args={[geometry, { depth: .15, bevelEnabled: false }]} /><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>;
}

export function RequestedWorld() {
  const { scene, gl } = useThree();
  const lastReceipt = useRef('');
  const contract = usePhone((state: any) => state.session?.world?.contract);
  const pieces = usePhone((state: any) => state.session?.swarm?.pieces);
  const inhabitants = usePhone((state: any) => state.session?.inhabitants);
  const self = usePhone((state: any) => state.session?.profile?.id);
  const kind = contract?.hostExpression?.architecture?.kind;
  const form = contract?.sceneMorph?.kind;
  const color = contract?.hostExpression?.color ?? '#e8a3df';
  // Address coordinates supply placement/scale. The host grammar supplies the
  // visual form; changing a visitor's original addresses is never necessary.
  const anchors = (pieces ?? []).slice(0, 8);
  useFrame(() => {
    const key = `${contract?.worldId}:${kind}:${form}`;
    if (!kind || !form || lastReceipt.current === key || !gl.info.render.calls) return;
    let structures = 0, bodies = 0;
    scene.traverse(object => {
      if (object.name.startsWith('structure:')) structures++;
      if (object.name === `host-morph:${form}`) bodies++;
    });
    if (!structures || !bodies) return;
    lastReceipt.current = key;
    publishRealmEvent({ type: 'field-change', field: 'morph-rendered', worldId: contract.worldId, structureKind: kind, inhabitantKind: form, structures, bodies });
  });
  return <group name="request-driven-world">
    {anchors.map((piece: any, index: number) => {
      const angle = (piece.address.arc ?? piece.address.gate * 20250) / 1296000 * Math.PI * 2;
      const scale = 1.6 + piece.address.line / 6;
      return <group key={piece.id} position={[Math.cos(angle) * 12, 0, Math.sin(angle) * 12]} rotation={[0, -angle, 0]} name={`structure:${piece.id}:${kind}`}>
        {kind === 'rainbow' ? spectrum.map((band, i) => <mesh key={band} position={[0, .08, 0]}>
          <ringGeometry args={[scale + i * .22, scale + (i + 1) * .22, 36, 1, 0, Math.PI]} />
          <meshStandardMaterial color={band} emissive={band} emissiveIntensity={.25} side={THREE.DoubleSide} />
        </mesh>) : kind && <group position={[0, scale, 0]} scale={scale}><MorphBody kind={kind} color={color} /></group>}
      </group>;
    })}
    {(inhabitants ?? []).filter((person: any) => person.id !== self).map((person: any) => <group key={person.id} position={person.position ?? [0, 1, 0]} name={`visitor:${person.id}`}>
      <MorphBody kind={form} color={color} name={person.name} motion={person.motion} />
    </group>)}
  </group>;
}
