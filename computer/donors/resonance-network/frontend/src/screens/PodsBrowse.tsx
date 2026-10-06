import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, Pod } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';

const PodsBrowse: React.FC = () => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [fits, setFits] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const { userId } = useAuth();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const podList = await apiService.listPods();
      setPods(podList);
      if (userId && podList.length > 0) {
        const results = await Promise.all(
          podList.map((p) => apiService.getPodFit(p.id, userId).catch(() => null))
        );
        const fitMap: Record<string, number | null> = {};
        results.forEach((r, i) => { if (r) fitMap[podList[i].id] = r.fit; });
        setFits(fitMap);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { id } = await apiService.createPod(name, description, theme);
      navigate(`/pod/${id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-green safe-area-top safe-area-bottom pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-pixel text-white text-shadow-pixel">PODS</h1>
          <button onClick={() => setShowCreate((s) => !s)} className="pixel-button px-4 py-2 text-xs">
            <i className="fa fa-plus mr-1"></i>NEW
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="pixel-card mb-6 space-y-3 animate-slide-up">
            <input
              className="w-full pixel-input"
              placeholder="Pod name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="w-full pixel-input h-20 resize-none"
              placeholder="What's this pod for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <input
              className="w-full pixel-input"
              placeholder="Resonance theme (e.g. Synthesis, Momentum)"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              required
            />
            <button type="submit" disabled={creating} className="w-full pixel-button disabled:opacity-50">
              {creating ? 'CREATING...' : 'CREATE POD'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12">
            <i className="fa fa-spinner animate-pixel-spin text-3xl text-retro-cyan"></i>
          </div>
        ) : pods.length === 0 ? (
          <p className="font-pixel text-white/50 text-sm text-center py-12">
            No pods yet. Start one above.
          </p>
        ) : (
          <div className="space-y-3">
            {pods.map((pod) => {
              const fit = fits[pod.id];
              return (
                <button
                  key={pod.id}
                  onClick={() => navigate(`/pod/${pod.id}`)}
                  className="w-full pixel-card text-left hover:border-retro-green transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-pixel text-retro-green text-sm">{pod.name}</h3>
                    {fit !== undefined && fit !== null && (
                      <span className={`font-pixel text-[10px] px-2 py-1 border-2 shrink-0 ml-2 ${
                        fit > 0.65 ? 'border-retro-green text-retro-green' : fit > 0.4 ? 'border-retro-yellow text-retro-yellow' : 'border-retro-red text-retro-red'
                      }`}>
                        {Math.round(fit * 100)}% FIT
                      </span>
                    )}
                  </div>
                  <p className="font-pixel text-white/60 text-xs mb-2">{pod.description}</p>
                  <span className="font-pixel text-retro-cyan text-xs">{pod.resonance_theme}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default PodsBrowse;
