import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Pod, MissionBrief } from '../services/apiService';
import BottomNavigation from '../components/BottomNavigation';

const feed = [
  { person: 'Maya', role: 'Community Builder', time: '8m', text: 'Looking for two people who want to help turn a neighborhood seed exchange into a repeatable local system.', tag: 'Project forming', reactions: 18 },
  { person: 'Kai', role: 'Systems Designer', time: '24m', text: 'Mapped the first infrastructure pass for Seed Gardens. The missing piece is someone who understands community onboarding.', tag: 'Complement needed', reactions: 31 },
  { person: 'Lena', role: 'Herbalist', time: '1h', text: 'Shared a field note from today’s garden session. Three patterns repeated across people who had never met before.', tag: 'Field note', reactions: 12 },
];

const HomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userId, displayName, profile } = useAuth();
  const [pods, setPods] = useState<Pod[]>([]);
  const [mission, setMission] = useState<MissionBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [podList, missionBrief] = await Promise.all([
          apiService.listPods().catch(() => []),
          apiService.getTodaysMission(userId).catch(() => null),
        ]);
        setPods(podList);
        setMission(missionBrief);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const coherence = profile?.network_coherence ?? 0.72;

  return (
    <div className="min-h-screen bg-[#060713] text-white pb-28 safe-area-top overflow-x-hidden">
      <div className="max-w-md mx-auto px-4 py-5">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] tracking-[0.38em] text-violet-300">RESONANCE NETWORK</p>
            <h1 className="text-[34px] leading-tight font-serif mt-1">Your field is forming.</h1>
            <p className="text-sm text-white/45 mt-1">{displayName ? `Good to see you, ${displayName}.` : 'People, projects, and paths moving with you.'}</p>
          </div>
          <button onClick={() => navigate('/field')} className="w-11 h-11 rounded-full border border-violet-400/40 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,.18)]">
            <i className="fa fa-compass text-violet-300"></i>
          </button>
        </header>

        <section className="rounded-[28px] border border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-[#0c0d1d] to-fuchsia-500/10 p-5 mb-5 shadow-[0_0_50px_rgba(168,85,247,.12)] relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <img src="/assets/resonance-planet.png" className="w-28 h-28 object-contain" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-fuchsia-300">Live field</p>
              <div className="text-4xl font-serif mt-1">{Math.round(coherence * 100)}%</div>
              <p className="text-xs text-white/50 mt-1">coherence across your current network</p>
              <button onClick={() => navigate('/connect')} className="mt-3 px-4 py-2 rounded-full bg-white/5 border border-violet-400/30 text-sm text-violet-200">See who’s resonating →</button>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-2xl">Around you</h2>
            <button onClick={() => navigate('/connect')} className="text-xs text-fuchsia-300">Open network</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['Maya','Noah','Lena','Kai'].map((n, i) => (
              <button key={n} onClick={() => navigate('/connect')} className="min-w-[78px] text-center">
                <div className={`w-16 h-16 mx-auto rounded-full p-[2px] bg-gradient-to-br ${i===3?'from-rose-400 to-fuchsia-500':'from-violet-400 to-cyan-400'}`}>
                  <div className="w-full h-full rounded-full bg-[#0d0f1c] grid place-items-center text-xl font-serif">{n[0]}</div>
                </div>
                <div className="text-xs mt-2 text-white/75">{n}</div>
                <div className="text-[9px] text-white/35">{[94,89,86,97][i]}%</div>
              </button>
            ))}
          </div>
        </section>

        {mission && (
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300">Today’s field assignment</p>
                <p className="text-sm mt-2 text-white/80 leading-relaxed">{mission.mission_text}</p>
              </div>
              <button onClick={() => navigate('/check-in')} className="w-10 h-10 rounded-full border border-amber-300/20 text-amber-300 shrink-0"><i className="fa fa-arrow-right"></i></button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          {feed.map((post) => (
            <article key={post.person + post.time} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 border border-white/10 grid place-items-center font-serif text-lg">{post.person[0]}</div>
                <div className="flex-1">
                  <div className="font-medium">{post.person}</div>
                  <div className="text-[11px] text-white/40">{post.role} · {post.time}</div>
                </div>
                <button className="text-white/30"><i className="fa fa-ellipsis"></i></button>
              </div>
              <p className="text-[15px] leading-relaxed text-white/80">{post.text}</p>
              <button onClick={() => navigate('/connect')} className="mt-4 px-3 py-1.5 rounded-full border border-fuchsia-400/20 text-[11px] text-fuchsia-300">{post.tag}</button>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8 text-white/40">
                <div className="flex gap-5 text-sm">
                  <button><i className="fa fa-heart mr-1"></i>{post.reactions}</button>
                  <button><i className="fa fa-comment mr-1"></i>Reply</button>
                  <button><i className="fa fa-share-nodes mr-1"></i>Share</button>
                </div>
                <button onClick={() => navigate('/field')} className="text-violet-300 text-xs">Why this?</button>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={() => navigate('/chart')} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left"><i className="fa fa-diagram-project text-cyan-300"></i><div className="font-serif text-lg mt-3">Your Chart</div><div className="text-[11px] text-white/40 mt-1">Bodygraph + resonance square</div></button>
          <button onClick={() => navigate('/weaver')} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left"><i className="fa fa-wand-magic-sparkles text-fuchsia-300"></i><div className="font-serif text-lg mt-3">Weaver</div><div className="text-[11px] text-white/40 mt-1">Play with your live gates</div></button>
          <button onClick={() => navigate('/pods')} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left"><i className="fa fa-users text-emerald-300"></i><div className="font-serif text-lg mt-3">Pods</div><div className="text-[11px] text-white/40 mt-1">{pods.length || 'Shared'} resonance spaces</div></button>
          <button onClick={() => navigate('/organism')} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left"><i className="fa fa-dna text-violet-300"></i><div className="font-serif text-lg mt-3">Organism</div><div className="text-[11px] text-white/40 mt-1">Original organism view preserved</div></button>
        </section>
      </div>
      {loading && <div className="fixed top-3 right-3 text-[10px] text-white/25">syncing field…</div>}
      <BottomNavigation />
    </div>
  );
};

export default HomeDashboard;
