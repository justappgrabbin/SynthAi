import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const DailyCheckIn: React.FC = () => {
  const [moodScore, setMoodScore] = useState(5);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  const navigate = useNavigate();
  const { userId } = useAuth();

  const availableTags = [
    'clarity', 'friction', 'creativity', 'connection', 'renewal',
    'transformation', 'balance', 'insight', 'flow', 'resistance',
    'breakthrough', 'harmony', 'challenge', 'growth', 'peace'
  ];

  useEffect(() => {
    checkExistingLog();
  }, [userId]);

  // Debounced: suggest tags from the note text as the user finishes typing,
  // instead of hitting the API on every keystroke.
  useEffect(() => {
    if (note.trim().length < 8) {
      setSuggestedTags([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const result = await apiService.analyzeText(note);
        setSuggestedTags(result.suggested_tags.map((t) => t.tag));
      } catch {
        setSuggestedTags([]);
      }
    }, 700);
    return () => clearTimeout(handle);
  }, [note]);

  const checkExistingLog = async () => {
    if (!userId) return;
    try {
      const logs = await apiService.getDailyLogs(userId);
      const today = new Date().toISOString().split('T')[0];
      const todayLog = logs.find((l: any) => l.log_date === today);
      if (todayLog) {
        setAlreadyLogged(true);
        setMoodScore(todayLog.mood_score);
        setNote(todayLog.note || '');
        setSelectedTags(JSON.parse(todayLog.selected_tags || '[]'));
        setResultScore(todayLog.resonance_score);
      }
    } catch (e) {
      console.error('Error checking existing log:', e);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const result = await apiService.createDailyLog(userId, moodScore, note, selectedTags);
      setResultScore(result.resonance_score);
      setAlreadyLogged(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save daily log');
    } finally {
      setLoading(false);
    }
  };

  const moodLabels = ['', 'Rough', 'Low', 'Off', 'Meh', 'Neutral', 'Okay', 'Good', 'Strong', 'Great', 'Peak'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-green safe-area-top safe-area-bottom">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center mb-8">
          <button onClick={() => navigate('/home')} className="mr-4 p-2 text-white/60 hover:text-white transition-colors">
            <i className="fa fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-2xl font-pixel text-white text-shadow-pixel">
              DAILY CHECK-IN
            </h1>
            <p className="text-retro-cyan font-pixel text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {resultScore !== null && (
          <div className="pixel-card mb-6 animate-slide-up text-center">
            <p className="font-pixel text-white/70 text-xs mb-1">TODAY'S RESONANCE SCORE</p>
            <p className="font-pixel text-4xl text-retro-cyan">{Math.round(resultScore * 100)}%</p>
            <p className="font-pixel text-white/50 text-xs mt-1">
              blended from your chart coherence and today's mood
            </p>
          </div>
        )}

        <div className="pixel-card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-retro-pink font-pixel text-sm mb-3">
                <i className="fa fa-face-smile mr-2"></i>
                MOOD: {moodLabels[moodScore]}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={moodScore}
                onChange={(e) => setMoodScore(parseInt(e.target.value))}
                className="pixel-slider w-full"
              />
              <div className="flex justify-between text-white/60 font-pixel text-xs mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-pen mr-2"></i>
                REFLECTION NOTE (OPTIONAL)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pixel-input h-24 resize-none"
                placeholder="How are you feeling today?"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-retro-purple font-pixel text-sm">
                  <i className="fa fa-tags mr-2"></i>
                  TODAY'S THEMES
                </label>
                {suggestedTags.some((t) => !selectedTags.includes(t)) && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags((prev) => [...new Set([...prev, ...suggestedTags])])}
                    className="font-pixel text-[10px] text-retro-cyan active:opacity-70 min-h-[44px] px-2"
                  >
                    <i className="fa fa-wand-magic-sparkles mr-1"></i>USE SUGGESTED
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableTags.map((tag) => {
                  const suggested = suggestedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`relative p-2 border-2 font-pixel text-xs transition-all min-h-[44px] ${
                        selectedTags.includes(tag)
                          ? 'bg-retro-purple/20 border-retro-purple text-retro-purple'
                          : suggested
                          ? 'border-retro-cyan/60 text-retro-cyan'
                          : 'border-gray-600 text-white hover:border-retro-purple/50'
                      }`}
                    >
                      {suggested && !selectedTags.includes(tag) && (
                        <i className="fa fa-star absolute top-1 right-1 text-[8px] text-retro-cyan"></i>
                      )}
                      {tag.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              {suggestedTags.length > 0 && (
                <p className="font-pixel text-white/40 text-[10px] mt-2">
                  <i className="fa fa-star text-retro-cyan mr-1"></i>starred = suggested from your note
                </p>
              )}
            </div>

            {error && (
              <div className="bg-retro-red/20 border-2 border-retro-red p-3 text-retro-red font-pixel text-sm">
                <i className="fa fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><i className="fa fa-spinner animate-pixel-spin mr-2"></i>SAVING LOG...</>
              ) : (
                <><i className="fa fa-paper-plane mr-2"></i>{alreadyLogged ? 'UPDATE LOG' : 'SAVE LOG'}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckIn;
