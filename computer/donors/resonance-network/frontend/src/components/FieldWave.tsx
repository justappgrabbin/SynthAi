import React, { useMemo } from 'react';
import { FieldState } from '../services/apiService';
import { FIELD_HEX } from '../lib/fieldVisuals';

interface Props {
  field: FieldState;
}

const WIDTH = 200;
const HEIGHT = 36;
const MID = HEIGHT / 2;

function buildWavePath(amplitude: number, frequency: number, phase: number): string {
  const cycles = Math.max(0.5, Math.min(4, frequency)); // clamp so it stays readable on a small screen
  const amp = Math.max(2, Math.min(MID - 2, amplitude * (MID - 2)));
  const points: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * WIDTH;
    const t = (i / steps) * Math.PI * 2 * cycles + phase;
    const y = MID + Math.sin(t) * amp;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join(' L')}`;
}

const FieldWave: React.FC<Props> = ({ field }) => {
  const path = useMemo(
    () => buildWavePath(field.amplitude, field.frequency, field.phase),
    [field.amplitude, field.frequency, field.phase]
  );
  const color = FIELD_HEX[field.field_type] || '#f5c518';
  // Slower visual drift for low-frequency fields (Spirit, Soul), faster for high (Child) --
  // clamped so nothing spins too fast to read, or so slow it looks static, on a phone.
  const durationSec = Math.max(2, Math.min(10, 6 / Math.max(0.1, field.frequency)));

  return (
    <div className="relative w-full h-9 overflow-hidden" style={{ opacity: 0.4 + field.coherence * 0.6 }}>
      <svg
        width={WIDTH * 2}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH * 2} ${HEIGHT}`}
        className="absolute top-0 left-0"
        style={{ animation: `field-drift ${durationSec}s linear infinite` }}
      >
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} transform={`translate(${WIDTH},0)`} />
      </svg>
    </div>
  );
};

export default FieldWave;
