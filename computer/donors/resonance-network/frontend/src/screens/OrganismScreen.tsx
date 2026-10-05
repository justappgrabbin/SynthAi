import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, HubCenterStatus } from '../services/apiService';

const MODE_COLOR: Record<string, string> = {
  active: 'text-retro-cyan border-retro-cyan',
  receptive: 'text-yellow-300 border-yellow-300/60',
  dormant: 'text-white/30 border-white/20',
};

const MODE_LABEL: Record<string, string> = {
  active: 'ACTIVE',
  receptive: 'RECEPTIVE',
  dormant: 'DORMANT',
};

const OrganismScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [centers, setCenters] = useState<HubCenterStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!userId) return;
    try {
      const res = await apiService.getOrganismStatus(userId);
      setCenters(res.centers);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load organism status.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const root = centers?.find((c) => c.center === 'Root');
  const unlocked = !!root?.external_reach_allowed;

  const handleFinalize = async () => {
    if (!userId || !summary.trim()) return;
    setBusy(true);
    try {
      await apiService.finalizeOrganismOutput(userId, summary.trim());
      await load();
      setSummary('');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Finalize failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await apiService.revokeOrganismOutput(userId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom pb-10">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white min-h-[44px] min-w-[44px]">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">THE ORGANISM</h1>
            <p className="font-pixel text-white/50 text-xs">your 9 centers, live</p>
          </div>
        </div>

        {error && (
          <div className="pixel-card mb-5 border border-red-500/40">
            <p className="font-pixel text-red-300 text-xs">{error}</p>
          </div>
        )}

        {!centers && !error && (
          <div className="flex justify-center py-10">
            <i className="fa fa-spinner animate-pixel-spin text-2xl text-retro-cyan"></i>
          </div>
        )}

        {centers && (
          <>
            <div className="pixel-card mb-5 animate-slide-up">
              <div className="space-y-2">
                {centers.map((c) => (
                  <div
                    key={c.center}
                    className={`flex items-center justify-between border rounded-lg px-3 py-2 ${MODE_COLOR[c.mode]}`}
                  >
                    <div>
                      <p className="font-pixel text-xs">{c.center.toUpperCase()}</p>
                      <p className="font-pixel text-[10px] text-white/50">{c.hub}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-pixel text-[10px]">{MODE_LABEL[c.mode]}</p>
                      <p className="font-pixel text-[9px] text-white/40">{c.center_state}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pixel-card mb-5 animate-slide-up">
              <p className="font-pixel text-white/60 text-xs mb-2">ROOT / MCP-HUB</p>
              <p className="font-pixel text-white/40 text-[10px] mb-3 leading-relaxed">
                This is the only center that talks to anything outside the organism. It stays
                dormant for you specifically until you finalize a coherent output below --
                nothing here reaches out on its own before that.
              </p>
              {unlocked ? (
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-retro-cyan text-xs">
                    <i className="fa fa-lock-open mr-1"></i>UNLOCKED
                  </span>
                  <button
                    onClick={handleRevoke}
                    disabled={busy}
                    className="font-pixel text-[10px] text-white/60 border border-white/30 rounded px-3 py-2 min-h-[44px] active:text-white"
                  >
                    LOCK AGAIN
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="What's the coherent output you're ready to hand off?"
                    className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white text-sm font-pixel mb-3 min-h-[80px]"
                  />
                  <button
                    onClick={handleFinalize}
                    disabled={busy || !summary.trim()}
                    className="w-full font-pixel text-xs bg-retro-cyan/20 border border-retro-cyan text-retro-cyan rounded-lg py-3 min-h-[44px] disabled:opacity-40"
                  >
                    <i className="fa fa-lock mr-2"></i>FINALIZE &amp; UNLOCK MCP-HUB
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrganismScreen;
