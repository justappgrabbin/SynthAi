import { Html } from '@react-three/drei';
import { usePhone } from './PhoneBridge';

export function AddressSwarm() {
  const session = usePhone((state: any) => state.session);
  const encoding = usePhone((state: any) => state.encoding);
  const addresses = session?.profile?.addresses ?? [];
  if (!addresses.length) return null;
  return <Html position={[0, 1.8, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
    <div className="ontological-swarm" aria-label="Resolved ontological addresses">
      {addresses.map((item: any, i: number) => <div key={item.id} className="ontological-strand" title={item.expression.source} style={{
        animationDelay: `${i * -0.4}s`, color: item.expression.channels?.color.hex ?? '#b8ffd8',
        left: `${95 + Math.cos((item.expression.address.arc ?? i * 49846) / 1296000 * Math.PI * 2) * (65 + i % 3 * 12)}px`,
        top: `${85 + Math.sin((item.expression.address.arc ?? i * 49846) / 1296000 * Math.PI * 2) * (65 + i % 3 * 12)}px`,
      }}>
        <span>{item.expression[encoding]}</span>
      </div>)}
    </div>
  </Html>;
}
