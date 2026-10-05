import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';

const CreateScreen: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'post' | 'project' | 'request'>('post');
  return (
    <div className="min-h-screen bg-[#060713] text-white pb-24 safe-area-top">
      <div className="max-w-md mx-auto px-4 py-5">
        <p className="text-[11px] tracking-[0.35em] text-fuchsia-300">CREATE IN THE FIELD</p>
        <h1 className="text-3xl font-serif mt-1 mb-5">Put something into motion.</h1>

        <div className="flex gap-2 mb-4">
          {(['post', 'project', 'request'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-full border text-sm capitalize ${mode === m ? 'border-fuchsia-400 bg-fuchsia-500/15 text-white' : 'border-white/10 text-white/50'}`}>{m}</button>
          ))}
        </div>

        <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-[#101225] to-[#090a14] p-4 shadow-[0_0_40px_rgba(168,85,247,.10)]">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'project' ? 'What are you building, and what does it need?' : mode === 'request' ? 'What kind of person, skill, resource, or connection would help?' : 'Share an update with your resonance field…'} className="w-full min-h-[170px] bg-transparent outline-none resize-none text-base placeholder:text-white/30" />
          <div className="border-t border-white/10 pt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full border border-white/10 text-cyan-300"><i className="fa fa-image"></i></button>
              <button className="w-9 h-9 rounded-full border border-white/10 text-violet-300"><i className="fa fa-link"></i></button>
              <button className="w-9 h-9 rounded-full border border-white/10 text-fuchsia-300"><i className="fa fa-location-dot"></i></button>
            </div>
            <button disabled={!text.trim()} className="px-5 py-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 disabled:opacity-30">Publish</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={() => navigate('/builder-hub')} className="rounded-2xl border border-white/10 p-4 text-left bg-white/[0.03]">
            <i className="fa fa-hammer text-amber-300"></i>
            <div className="font-serif text-lg mt-3">Builder Hub</div>
            <div className="text-xs text-white/50 mt-1">Develop a project and find complements.</div>
          </button>
          <button onClick={() => navigate('/pods')} className="rounded-2xl border border-white/10 p-4 text-left bg-white/[0.03]">
            <i className="fa fa-users text-emerald-300"></i>
            <div className="font-serif text-lg mt-3">Start a Pod</div>
            <div className="text-xs text-white/50 mt-1">Create a smaller shared resonance space.</div>
          </button>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default CreateScreen;
