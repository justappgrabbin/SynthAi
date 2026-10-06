import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FieldWave from '../components/FieldWave';
import { FIELD_COLOR, PATTERN_ICON, COUPLING } from '../lib/fieldVisuals';

const FieldScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen bg-pixel-dark flex items-center justify-center safe-area-top safe-area-bottom">
        <i className="fa fa-spinner animate-pixel-spin text-3xl text-retro-cyan"></i>
      </div>
    );
  }

  const fields = profile.field_state;
  const coherence = profile.network_coherence;

  // Live interference: coupling strength x how "loaded" (amplitude) each side
  // of the pair currently is. Same formula shape as resonance.py's model --
  // this just makes it visible instead of buried in a score.
  const interferences = COUPLING
    .map(([a, b, weight]) => {
      const fa = fields[a];
      const fb = fields[b];
      if (!fa || !fb) return null;
      const strength = weight * fa.amplitude * fb.amplitude;
      return { a, b, weight, strength };
    })
    .filter((x): x is { a: string; b: string; weight: number; strength: number } => x !== null)
    .sort((x, y) => Math.abs(y.strength) - Math.abs(x.strength));

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom pb-10">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white min-h-[44px] min-w-[44px]">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">INTERFERENCE PATTERN</h1>
            <p className="font-pixel text-white/50 text-xs">your 9 fields, live</p>
          </div>
        </div>

        {/* Overall coherence */}
        <div className="pixel-card mb-5 text-center animate-slide-up">
          <p className="font-pixel text-white/60 text-xs mb-1">FIELD COHERENCE</p>
          <p className="font-pixel text-4xl text-retro-cyan">{Math.round(coherence * 100)}%</p>
          <p className="font-pixel text-white/40 text-[10px] mt-1">
            {coherence > 0.7 ? 'Strong resonance — waves reinforcing' : coherence > 0.45 ? 'Mixed signal — some friction present' : 'High interference — fields pulling apart'}
          </p>
        </div>

        {/* Wave rows, one per field */}
        <div className="pixel-card mb-5 animate-slide-up">
          <div className="space-y-3">
            {Object.values(fields).map((f) => (
              <div key={f.field_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-pixel text-xs text-${FIELD_COLOR[f.field_type] || 'retro-cyan'}`}>
                    <i className={`fa ${PATTERN_ICON[f.pattern] || 'fa-wave-square'} mr-1.5`}></i>
                    {f.field_type.toUpperCase()}
                  </span>
                  <span className="font-pixel text-[10px] text-white/40">
                    {Math.round(f.coherence * 100)}% coherent
                  </span>
                </div>
                <FieldWave field={f} />
              </div>
            ))}
          </div>
        </div>

        {/* Coupling / interference readout */}
        <div className="pixel-card animate-slide-up">
          <p className="font-pixel text-white text-sm mb-3">
            <i className="fa fa-arrows-left-right mr-2 text-retro-yellow"></i>
            HOW YOUR FIELDS INTERACT
          </p>
          <div className="space-y-3">
            {interferences.map(({ a, b, weight, strength }) => {
              const constructive = weight > 0;
              return (
                <div key={`${a}-${b}`} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-pixel text-[11px] text-white/80">{a} ↔ {b}</p>
                    <div className="h-1.5 bg-white/10 mt-1 overflow-hidden">
                      <div
                        className={constructive ? 'h-full bg-retro-green' : 'h-full bg-retro-red'}
                        style={{ width: `${Math.min(100, Math.abs(strength) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-pixel text-[10px] ${constructive ? 'text-retro-green' : 'text-retro-red'}`}>
                    {constructive ? 'BOOSTS' : 'DAMPENS'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="font-pixel text-white/40 text-[10px] mt-4 leading-relaxed">
            Green pairs amplify each other when both are active — lean into those combinations.
            Red pairs pull against each other — expect friction there, not failure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FieldScreen;
