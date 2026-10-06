import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';

const matches = [
  { name: 'Maya', role: 'Community Builder', why: 'Grounds your ideas', score: 94, tone: 'violet' },
  { name: 'Noah', role: 'Movement Coach', why: 'Energizes your vision', score: 89, tone: 'cyan' },
  { name: 'Lena', role: 'Herbalist', why: 'Deepens your impact', score: 86, tone: 'pink' },
  { name: 'Kai', role: 'Systems Designer', why: 'Complements your project', score: 97, tone: 'red' },
];

const projects = [
  { title: 'Seed Gardens Initiative', need: 'Systems + community design', fit: 'High complementarity' },
  { title: 'Open Learning Commons', need: 'Research + facilitation', fit: 'Strong trajectory match' },
  { title: 'Neighborhood Repair Lab', need: 'Builders + local organizers', fit: 'Active window' },
];

const toneClass: Record<string, string> = {
  violet: 'from-violet-500/25 to-fuchsia-500/10 border-violet-400/40',
  cyan: 'from-cyan-500/20 to-violet-500/10 border-cyan-400/40',
  pink: 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-400/40',
  red: 'from-rose-500/20 to-orange-500/10 border-rose-400/40',
};

const ConnectScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#060713] text-white pb-24 safe-area-top">
      <div className="max-w-md mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-violet-300">RESONANCE NETWORK</p>
            <h1 className="text-3xl font-serif mt-1">Connect by resonance.</h1>
          </div>
          <button onClick={() => navigate('/field')} className="w-11 h-11 rounded-full border border-violet-400/40 bg-violet-500/10">
            <i className="fa fa-wave-square text-violet-300"></i>
          </button>
        </div>

        <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-[#0c0d1c] to-fuchsia-500/10 p-5 mb-6 shadow-[0_0_45px_rgba(168,85,247,0.12)]">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Your field is forming</p>
          <div className="flex items-center gap-4 mt-4">
            <img src="/assets/resonance-planet.png" className="w-24 h-24 object-contain drop-shadow-[0_0_24px_rgba(217,70,239,.35)]" />
            <div>
              <div className="text-3xl font-serif">4 live matches</div>
              <p className="text-sm text-white/60 mt-1">1 project · 3 allies · updated from your current field</p>
              <button onClick={() => navigate('/field')} className="mt-3 text-sm text-fuchsia-300">Inspect resonance →</button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {matches.map((m) => (
            <button key={m.name} className={`min-w-[178px] text-left rounded-2xl border bg-gradient-to-br ${toneClass[m.tone]} p-4`}>
              <div className="w-12 h-12 rounded-full bg-black/30 border border-white/20 grid place-items-center text-lg font-semibold mb-4">{m.name[0]}</div>
              <div className="font-serif text-xl">{m.name}</div>
              <div className="text-xs text-white/60 mt-1">{m.role}</div>
              <div className="text-sm text-fuchsia-300 mt-3">{m.why}</div>
              <div className="text-[11px] text-white/50 mt-3">{m.score}% resonance</div>
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Open paths</h2>
          <button onClick={() => navigate('/pods')} className="text-xs text-violet-300">See pods</button>
        </div>
        <div className="space-y-3">
          {projects.map((p) => (
            <button key={p.title} onClick={() => navigate('/builder-hub')} className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.035] p-4 hover:border-violet-400/40 transition-colors">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-serif text-lg">{p.title}</div>
                  <div className="text-xs text-white/50 mt-1">{p.need}</div>
                </div>
                <span className="text-[10px] px-2 py-1 h-fit rounded-full border border-fuchsia-400/30 text-fuchsia-300">{p.fit}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ConnectScreen;
