import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';

// The 9 real HD centers, grouped into a 3x3 grid. This grouping is a
// reasonable, defensible simplification of the real bodygraph's spatial
// logic (top = mental centers, middle = identity/awareness centers,
// bottom = motor/emotional centers) -- it is NOT yet confirmed
// cell-for-cell against the original Resonance Square reference design
// (Vertical=Alpha/Authority/Learning, Lateral=Voice/Heart/Mind,
// Diagonal=Martial). The DATA in every cell is real; the exact axis
// labels/positions may need adjusting once compared directly against
// the original reference image.
const RESONANCE_SQUARE_GRID: string[][] = [
  ['Head', 'Ajna', 'Throat'],
  ['Spleen', 'G', 'Ego'],
  ['Sacral', 'Solar', 'Root'],
];

const CENTER_COLOR: Record<string, string> = {
  Head: '#f5c518', Ajna: '#f5c518', Throat: '#10d474', G: '#c084fc',
  Ego: '#c084fc', Spleen: '#e8921a', Solar: '#ff5959', Sacral: '#ff5959', Root: '#e8921a',
};

const SYSTEM_LABELS: Record<string, string> = {
  tropical: 'Tropical (Body)',
  sidereal_mean: 'Sidereal Mean (Mind)',
  sidereal_true: 'Sidereal True',
  draconic_mean: 'Draconic Mean Node (Heart)',
  draconic_true: 'Draconic True Node',
};

const ChartScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile, displayName } = useAuth();
  const [activeSystem, setActiveSystem] = useState('tropical');

  if (!profile?.natal_report) {
    return (
      <div className="min-h-screen bg-pixel-dark flex items-center justify-center safe-area-top safe-area-bottom">
        <i className="fa fa-spinner animate-pixel-spin text-3xl text-retro-cyan"></i>
      </div>
    );
  }

  const { bodygraph, charts } = profile.natal_report;
  const activeGates = new Set(bodygraph.active_gates);

  // Real gates-per-center, for the Resonance Square cells and the
  // bodygraph list -- derived from the actual chart, not hardcoded.
  const CENTER_GATES: Record<string, number[]> = {
    Head: [64, 61, 63], Ajna: [47, 24, 4, 17, 11, 43],
    Throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
    G: [7, 1, 13, 10, 15, 2, 46, 25], Ego: [21, 51, 26, 40],
    Spleen: [57, 44, 50, 32, 28, 18, 48], Solar: [55, 49, 37, 22, 30, 36, 6],
    Sacral: [5, 14, 29, 59, 9, 3, 42, 27, 34], Root: [52, 19, 39, 41, 38, 54, 53, 60, 58],
  };

  const activeGatesInCenter = (center: string) =>
    (CENTER_GATES[center] || []).filter((g) => activeGates.has(g));

  const currentPlacements = charts[activeSystem] || [];
  const personalityPlacements = currentPlacements.filter((p: any) => p.stream === 'personality');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom pb-24">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white min-h-[44px] min-w-[44px]">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">{displayName}'S CHART</h1>
            <p className="font-pixel text-white/50 text-xs">{bodygraph.definition} Definition</p>
          </div>
        </div>

        {/* Resonance Square -- 3x3 grid of your real centers */}
        <div className="pixel-card mb-5">
          <p className="font-pixel text-white text-sm mb-3">
            <i className="fa fa-border-all text-retro-yellow mr-2"></i>
            RESONANCE SQUARE
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {RESONANCE_SQUARE_GRID.flat().map((center) => {
              const state = bodygraph.centers[center];
              const gates = activeGatesInCenter(center);
              const defined = state === 'Defined';
              return (
                <div
                  key={center}
                  className="aspect-square rounded-sm flex flex-col items-center justify-center p-1 border-2"
                  style={{
                    borderColor: defined ? CENTER_COLOR[center] : 'rgba(255,255,255,0.15)',
                    backgroundColor: defined ? CENTER_COLOR[center] + '25' : 'transparent',
                  }}
                >
                  <span
                    className="font-pixel text-[9px] text-center leading-tight"
                    style={{ color: defined ? CENTER_COLOR[center] : 'rgba(255,255,255,0.4)' }}
                  >
                    {center}
                  </span>
                  <span className="font-pixel text-[8px] text-white/40 mt-0.5">
                    {gates.length > 0 ? gates.join(',') : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="font-pixel text-white/40 text-[9px] mt-3 leading-relaxed">
            Filled = Defined center. Numbers are your real active gates in that
            center. Grid position is a working simplification of the original
            Resonance Square design -- not yet confirmed cell-for-cell.
          </p>
        </div>

        {/* Chart system tabs -- all 5 real systems */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {Object.keys(SYSTEM_LABELS).map((sys) => (
            <button
              key={sys}
              onClick={() => setActiveSystem(sys)}
              className={`shrink-0 px-3 py-2 font-pixel text-[10px] border-2 min-h-[44px] ${
                activeSystem === sys ? 'border-retro-cyan text-retro-cyan' : 'border-gray-600 text-white/50'
              }`}
            >
              {SYSTEM_LABELS[sys]}
            </button>
          ))}
        </div>

        {/* Real placements for the selected system */}
        <div className="pixel-card mb-5">
          <p className="font-pixel text-white text-sm mb-3">
            <i className="fa fa-globe text-retro-cyan mr-2"></i>
            {SYSTEM_LABELS[activeSystem]}
          </p>
          <div className="space-y-2">
            {personalityPlacements.map((p: any) => (
              <div key={p.body} className="flex items-center justify-between text-xs">
                <span className="font-pixel text-white/70">{p.body}</span>
                <span className="font-pixel text-retro-cyan">
                  Gate {p.gate}.{p.line} · C{p.color}T{p.tone}B{p.base}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bodygraph centers list */}
        <div className="pixel-card">
          <p className="font-pixel text-white text-sm mb-3">
            <i className="fa fa-diagram-project text-retro-green mr-2"></i>
            CENTERS
          </p>
          <div className="space-y-2">
            {Object.entries(bodygraph.centers).map(([center, state]) => (
              <div key={center} className="flex items-center justify-between">
                <span className="font-pixel text-xs text-white/70">{center}</span>
                <span
                  className="font-pixel text-[10px] px-2 py-1 border"
                  style={{
                    borderColor: state === 'Defined' ? '#10d474' : 'rgba(255,255,255,0.2)',
                    color: state === 'Defined' ? '#10d474' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {String(state).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ChartScreen;
