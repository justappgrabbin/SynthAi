import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, BuilderProject } from '../services/apiService';
import BottomNavigation from '../components/BottomNavigation';

const CATEGORIES = ['app', 'business', 'art', 'research', 'tool', 'community', 'other'];
const CENTERS = ['Head', 'Ajna', 'Throat', 'G', 'Ego', 'Spleen', 'Solar', 'Sacral', 'Root'];

const CATEGORY_ICON: Record<string, string> = {
  app: 'fa-mobile-screen', business: 'fa-briefcase', art: 'fa-palette',
  research: 'fa-flask', tool: 'fa-wrench', community: 'fa-people-group', other: 'fa-star',
};

type View = 'browse' | 'create';

const BuilderHubScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();

  const [view, setView] = useState<View>('browse');
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [fits, setFits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('app');
  const [centersNeeded, setCentersNeeded] = useState<string[]>([]);
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.browseBuilderProjects(filterCategory || undefined);
      setProjects(res.projects);
      if (userId && res.projects.length > 0) {
        const results = await Promise.all(
          res.projects.map((p) => apiService.getBuilderProjectFit(p.id, userId).catch(() => null))
        );
        const fitMap: Record<string, number> = {};
        results.forEach((r, i) => { if (r) fitMap[res.projects[i].id] = r.fit_score; });
        setFits(fitMap);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCategory]);

  const toggleCenter = (c: string) => {
    setCentersNeeded((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const submitProject = async () => {
    if (!userId || !title || !description || centersNeeded.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await apiService.createBuilderProject({
        creator_id: userId, title, description, category,
        centers_needed: centersNeeded, link: link || undefined,
      });
      setNotice('Project posted! People with complementary centers can now find it.');
      setTitle(''); setDescription(''); setCentersNeeded([]); setLink('');
      setView('browse');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not post project');
    } finally {
      setSubmitting(false);
    }
  };

  const support = async (projectId: string) => {
    if (!userId) return;
    try {
      await apiService.supportBuilderProject(projectId, userId);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-yellow safe-area-top safe-area-bottom pb-24">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/home')} className="mr-3 p-2 text-white/60 active:text-white min-h-[44px] min-w-[44px]">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-pixel text-white text-shadow-pixel">BUILDER&apos;S HUB</h1>
            <p className="font-pixel text-white/50 text-xs">real projects, real complements</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setView('browse')}
            className={`py-3 font-pixel text-xs border-2 min-h-[44px] ${
              view === 'browse' ? 'bg-retro-yellow/20 border-retro-yellow text-retro-yellow' : 'border-gray-600 text-white/70'
            }`}
          >
            <i className="fa fa-compass mr-2"></i>BROWSE
          </button>
          <button
            onClick={() => setView('create')}
            className={`py-3 font-pixel text-xs border-2 min-h-[44px] ${
              view === 'create' ? 'bg-retro-green/20 border-retro-green text-retro-green' : 'border-gray-600 text-white/70'
            }`}
          >
            <i className="fa fa-plus mr-2"></i>POST A PROJECT
          </button>
        </div>

        {view === 'browse' && (
          <div className="animate-slide-up">
            {/* Category filter -- horizontal scroll, thumb-friendly chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
              <button
                onClick={() => setFilterCategory(null)}
                className={`shrink-0 px-3 py-2 font-pixel text-[10px] border-2 min-h-[44px] ${
                  !filterCategory ? 'border-retro-yellow text-retro-yellow' : 'border-gray-600 text-white/50'
                }`}
              >
                ALL
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`shrink-0 px-3 py-2 font-pixel text-[10px] border-2 min-h-[44px] ${
                    filterCategory === c ? 'border-retro-yellow text-retro-yellow' : 'border-gray-600 text-white/50'
                  }`}
                >
                  <i className={`fa ${CATEGORY_ICON[c]} mr-1`}></i>{c.toUpperCase()}
                </button>
              ))}
            </div>

            {loading && (
              <div className="text-center py-8">
                <i className="fa fa-spinner animate-pixel-spin text-2xl text-retro-yellow"></i>
              </div>
            )}

            {!loading && projects.length === 0 && (
              <div className="pixel-card text-center text-white/60 font-pixel text-xs">
                No projects yet. Be the first to post one.
              </div>
            )}

            <div className="space-y-3">
              {projects.map((p) => {
                const fit = fits[p.id];
                return (
                  <div key={p.id} className="pixel-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <i className={`fa ${CATEGORY_ICON[p.category] || 'fa-star'} text-retro-yellow`}></i>
                        <span className="font-pixel text-white text-sm">{p.title}</span>
                      </div>
                      {fit !== undefined && (
                        <span className={`font-pixel text-[10px] px-2 py-1 border-2 shrink-0 ml-2 ${
                          fit > 0.5 ? 'border-retro-green text-retro-green' : fit > 0.2 ? 'border-retro-yellow text-retro-yellow' : 'border-gray-600 text-white/40'
                        }`}>
                          {Math.round(fit * 100)}% FIT
                        </span>
                      )}
                    </div>
                    <p className="font-pixel text-white/60 text-xs mb-2 leading-relaxed">{p.description}</p>
                    <p className="font-pixel text-[10px] text-white/40 mb-3">by {p.creator_name}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.centers_needed.map((c) => (
                        <span key={c} className="font-pixel text-[9px] px-2 py-1 border border-retro-cyan/50 text-retro-cyan">
                          NEEDS {c.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => support(p.id)}
                        className="flex-1 pixel-button !py-2 !text-xs"
                      >
                        <i className="fa fa-hand-holding-heart mr-1"></i>
                        SUPPORT ({p.support_count})
                      </button>
                      {p.link && (
                        <a
                          href={p.link} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-2 border-2 border-white/30 text-white/70 font-pixel text-xs min-h-[44px] flex items-center"
                        >
                          <i className="fa fa-arrow-up-right-from-square"></i>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="pixel-card space-y-4 animate-slide-up">
            <input
              className="w-full pixel-input"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full pixel-input h-24 resize-none"
              placeholder="What are you building?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="w-full pixel-input"
              placeholder="Link (optional -- GitHub, landing page, etc.)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />

            <div>
              <label className="block font-pixel text-xs text-white/60 mb-2">CATEGORY</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`py-2 font-pixel text-[9px] border-2 min-h-[44px] ${
                      category === c ? 'border-retro-yellow text-retro-yellow bg-retro-yellow/10' : 'border-gray-600 text-white/60'
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-pixel text-xs text-white/60 mb-2">
                WHICH CENTERS DO YOU NEED HELP WITH?
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CENTERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCenter(c)}
                    className={`py-2 font-pixel text-[10px] border-2 min-h-[44px] ${
                      centersNeeded.includes(c) ? 'border-retro-cyan text-retro-cyan bg-retro-cyan/10' : 'border-gray-600 text-white/60'
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="font-pixel text-[10px] text-white/40 mt-2">
                People whose charts complement these gaps will see a high fit score.
              </p>
            </div>

            <button
              onClick={submitProject}
              disabled={submitting || !title || !description || centersNeeded.length === 0}
              className="w-full pixel-button disabled:opacity-50"
            >
              {submitting ? <><i className="fa fa-spinner animate-pixel-spin mr-2"></i>POSTING...</> : 'POST PROJECT'}
            </button>
          </div>
        )}

        {notice && (
          <div className="mt-4 bg-retro-green/20 border-2 border-retro-green p-3 text-retro-green font-pixel text-xs">
            <i className="fa fa-circle-check mr-2"></i>{notice}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-retro-red/20 border-2 border-retro-red p-3 text-retro-red font-pixel text-xs">
            <i className="fa fa-exclamation-triangle mr-2"></i>{error}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default BuilderHubScreen;
