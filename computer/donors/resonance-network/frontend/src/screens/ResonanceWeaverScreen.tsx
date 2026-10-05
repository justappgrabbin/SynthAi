import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ResonanceWeaver, WeaverState, ElementType,
  ELEMENT_COLORS, ELEMENT_ICONS,
} from '../game/resonanceWeaver';
import BottomNavigation from '../components/BottomNavigation';

const ELEMENTS: ElementType[] = ['fire', 'water', 'earth', 'metal', 'wood', 'aether', 'wind'];

const LOOP_COLOR: Record<string, string> = {
  harmonic: '#10d474', growth: '#f5c518', dissonant: '#e8921a', decay: '#ff5959',
};

const ResonanceWeaverScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const weaverRef = useRef<ResonanceWeaver | null>(null);
  const [state, setState] = useState<WeaverState | null>(null);
  const [selectedElement, setSelectedElement] = useState<ElementType>('fire');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!profile?.natal_report?.bodygraph || weaverRef.current) return;

    const weaver = new ResonanceWeaver(9);
    const fields = profile.field_state;
    // Real Mind/Body/Heart coherence -- not synthetic, straight from
    // resonance.py's already-computed field data.
    weaver.setRealFieldState(
      fields.Mind?.coherence ?? 0.5,
      fields.Body?.coherence ?? 0.5,
      fields.Heart?.coherence ?? 0.5,
    );

    const bg = profile.natal_report.bodygraph;
    const definedCenters = Object.entries(bg.centers)
      .filter(([, v]) => v === 'Defined')
      .map(([k]) => k);

    weaver.addRealCharacter({
      name: 'You', isPlayer: true, designType: bg.definition || 'Generator',
      activeGates: bg.active_gates, definedCenters, coherence: 0.6,
      position: { x: 4, y: 4 },
    });

    weaver.start();
    const unsub = weaver.subscribe(setState);
    weaverRef.current = weaver;
    setReady(true);

    return () => {
      weaver.stop();
      unsub();
    };
  }, [profile]);

  const handleCellClick = (x: number, y: number) => {
    weaverRef.current?.placeCondition(selectedElement, { x, y }, 2);
  };

  if (!ready || !state) {
    return (
      <div className="min-h-screen bg-pixel-dark flex items-center justify-center safe-area-top safe-area-bottom">
        <i className="fa fa-spinner animate-pixel-spin text-3xl text-retro-cyan"></i>
      </div>
    );
  }

  const player = state.characters.find((c) => c.isPlayer);
  const gridCells: { x: number; y: number }[] = [];
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) gridCells.push({ x, y });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom pb-24">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white min-h-[44px] min-w-[44px]">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">RESONANCE WEAVER</h1>
            <p className="font-pixel text-white/50 text-xs">place conditions, watch your gates respond</p>
          </div>
        </div>

        {/* Live global coherence */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-pixel text-[10px] text-white/50">FIELD COHERENCE</span>
          <span className="font-pixel text-sm text-retro-cyan">{Math.round(state.globalCoherence * 100)}%</span>
        </div>

        {/* The live grid -- this is the part that moves */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 mb-4">
          <div
            className="grid gap-px p-2"
            style={{ gridTemplateColumns: `repeat(${state.gridSize}, 1fr)` }}
          >
            {gridCells.map(({ x, y }) => {
              const cond = state.conditions.find((c) => Math.round(c.position.x) === x && Math.round(c.position.y) === y);
              const isPlayerHere = player && Math.round(player.position.x) === x && Math.round(player.position.y) === y;
              const cellLoops = state.loops.filter((l) => {
                const c = state.conditions.find((cd) => cd.id === l.conditionId);
                return c && Math.round(c.position.x) === x && Math.round(c.position.y) === y;
              });
              const intf = state.interferences.find((i) => Math.round(i.position.x) === x && Math.round(i.position.y) === y);

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  className="aspect-square relative rounded-sm transition-all duration-200 active:opacity-70"
                  style={{
                    backgroundColor: cond ? ELEMENT_COLORS[cond.element] + '30' : 'rgba(255,255,255,0.03)',
                    boxShadow: cellLoops.length > 0
                      ? `0 0 ${6 + cellLoops[0].strength * 12}px ${LOOP_COLOR[cellLoops[0].loopType]}80 inset`
                      : undefined,
                  }}
                >
                  {intf && (
                    <div
                      className="absolute inset-0 rounded-sm opacity-40"
                      style={{
                        background: `repeating-linear-gradient(45deg, transparent, transparent 3px, #ffffff20 3px, #ffffff20 6px)`,
                      }}
                    />
                  )}
                  {cond && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className={`fa ${ELEMENT_ICONS[cond.element]} text-[10px]`} style={{ color: ELEMENT_COLORS[cond.element] }}></i>
                    </div>
                  )}
                  {isPlayerHere && (
                    <div
                      className="absolute rounded-full border-2 border-white"
                      style={{
                        width: '60%', height: '60%', top: '20%', left: '20%',
                        backgroundColor: '#f5c518',
                        boxShadow: '0 0 10px #f5c51880',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Element picker -- tap an element, then tap a cell to place it */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {ELEMENTS.map((el) => (
            <button
              key={el}
              onClick={() => setSelectedElement(el)}
              className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 border-2 min-h-[44px]"
              style={{
                borderColor: selectedElement === el ? ELEMENT_COLORS[el] : 'rgba(255,255,255,0.2)',
                color: selectedElement === el ? ELEMENT_COLORS[el] : 'rgba(255,255,255,0.5)',
              }}
            >
              <i className={`fa ${ELEMENT_ICONS[el]}`}></i>
              <span className="font-pixel text-[8px]">{el.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Goals -- real, derived from real gates */}
        {player && (
          <div className="pixel-card">
            <p className="font-pixel text-white text-sm mb-3">
              <i className="fa fa-bullseye text-retro-yellow mr-2"></i>
              YOUR GOALS (from your real gates)
            </p>
            <div className="space-y-3">
              {player.goals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-[11px] text-white/80">
                      {g.completed && <i className="fa fa-circle-check text-retro-green mr-1"></i>}
                      {g.title}
                    </span>
                    <span className="font-pixel text-[10px] text-white/40">
                      {g.derivedFromGate > 0 ? `gate ${g.derivedFromGate}` : 'type goal'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 overflow-hidden">
                    <div
                      className={g.completed ? 'h-full bg-retro-green' : 'h-full bg-retro-cyan'}
                      style={{ width: `${g.currentValue}%`, transition: 'width 0.3s' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ResonanceWeaverScreen;
