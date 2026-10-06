import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePhone, publishRealmEvent } from './PhoneBridge';
import * as THREE from 'three';

// A concrete mesh interaction: the same chair is sat on, stood from, lifted,
// thrown, and returned to rest. Temporary avatar poses follow actual effects.
export function WorldObjects() {
  const chair = useRef<THREE.Group>(null);
  const phase = useRef('rest');
  const motionTimer = useRef<any>(null);
  const velocity = useRef(new THREE.Vector3());
  const [label, setLabel] = useState('Sit');
  const color = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere?.accent ?? '#ed72c8');
  useEffect(() => {
    const perform = (position: number[]) => {
      if (!chair.current || chair.current.position.distanceTo(new THREE.Vector3(...position)) > 3.5) return false;
      const next: any = { rest: ['sit', 'seated', 'Stand'], seated: ['stand', 'standing', 'Lift'], standing: ['lift', 'held', 'Throw'], held: ['throw', 'flying', 'Recover'], flying: ['return', 'rest', 'Sit'] };
      const [action, state, nextLabel] = next[phase.current];
      phase.current = state; setLabel(nextLabel);
      clearTimeout(motionTimer.current);
      usePhone.setState({ contextualMotion: action, seat: action === 'sit' ? [chair.current.position.x, 1, chair.current.position.z] : null });
      if (action === 'throw') velocity.current.set(0, 5, -6);
      if (action === 'return') { chair.current.position.set(2, 0, 0); chair.current.rotation.set(0, 0, 0); }
      publishRealmEvent({ type: 'interaction', target: 'realm:chair:one', action, position: position.slice() });
      if (action !== 'sit' && action !== 'lift') motionTimer.current = setTimeout(() => usePhone.setState({ contextualMotion: null }), 800);
      return true;
    };
    usePhone.setState({ interactObject: perform });
    return () => { clearTimeout(motionTimer.current); usePhone.setState({ interactObject: null, contextualMotion: null, seat: null }); };
  }, []);
  useFrame((_, delta) => {
    if (!chair.current) return;
    if (phase.current === 'held') {
      const position = usePhone.getState().position;
      chair.current.position.set(position[0], position[1] + 2, position[2]);
    }
    if (phase.current === 'flying') {
      velocity.current.y -= 12 * delta;
      chair.current.position.addScaledVector(velocity.current, delta);
      chair.current.rotation.x += delta * 2;
      if (chair.current.position.y <= 0) {
        chair.current.position.y = 0; velocity.current.set(0, 0, 0); chair.current.rotation.set(0, 0, 0); phase.current = 'rest'; setLabel('Sit');
      }
    }
  });
  return <group ref={chair} position={[2, 0, 0]} name={`Chair · ${label}`}>
    <mesh position={[0, .65, 0]} castShadow><boxGeometry args={[1, .18, 1]} /><meshStandardMaterial color={color} metalness={.7} roughness={.25} /></mesh>
    <mesh position={[0, 1.3, -.45]} castShadow><boxGeometry args={[1, 1.1, .14]} /><meshStandardMaterial color={color} metalness={.7} roughness={.25} /></mesh>
    {[-.4, .4].flatMap(x => [-.4, .4].map(z => <mesh key={`${x}:${z}`} position={[x, .3, z]} castShadow><cylinderGeometry args={[.04, .04, .6]} /><meshStandardMaterial color="#c9b496" metalness={.8} roughness={.2} /></mesh>))}
  </group>;
}
