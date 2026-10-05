import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const QuestionnaireScreen: React.FC = () => {
  const [currentState, setCurrentState] = useState('');
  const [challenge, setChallenge] = useState('');
  const [dream, setDream] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { createOrLoadProfile } = useAuth();

  const stateOptions = [
    { value: 'happy', label: 'Happy & Thriving', icon: 'fa-smile' },
    { value: 'neutral', label: 'Neutral & Stable', icon: 'fa-meh' },
    { value: 'stuck', label: 'Stuck & Seeking', icon: 'fa-frown' },
  ];

  const skillOptions = [
    'communication', 'problem-solving', 'creativity', 'leadership', 
    'empathy', 'analysis', 'organization', 'teaching', 'healing', 'innovation'
  ];

  const needOptions = [
    'connection', 'clarity', 'support', 'inspiration', 'growth', 
    'balance', 'purpose', 'community', 'guidance', 'transformation'
  ];

  const handleSkillToggle = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleNeedToggle = (need: string) => {
    setNeeds(prev => 
      prev.includes(need) 
        ? prev.filter(n => n !== need)
        : [...prev, need]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = sessionStorage.getItem('pending_email') || '';
      const name = sessionStorage.getItem('pending_name') || 'Explorer';
      const birthRaw = sessionStorage.getItem('pending_birth');
      if (!birthRaw) {
        throw new Error('Missing birth data -- please start over');
      }
      const birth = JSON.parse(birthRaw);

      await createOrLoadProfile({
        email,
        displayName: name,
        birth,
        currentState,
        challenge,
        dream,
        skills,
        needs,
      });

      navigate('/home');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save questionnaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-pink safe-area-top safe-area-bottom">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <i className="fa fa-clipboard-question text-6xl text-retro-cyan mb-4 animate-pixel-pulse"></i>
          <h1 className="text-3xl font-pixel text-white text-shadow-pixel mb-2">
            QUESTIONNAIRE
          </h1>
          <p className="text-white/80 font-pixel text-sm">
            Help us understand your resonance patterns
          </p>
        </div>

        <div className="pixel-card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current State */}
            <div>
              <label className="block text-retro-cyan font-pixel text-sm mb-3">
                <i className="fa fa-face-smile mr-2"></i>
                CURRENT STATE
              </label>
              <div className="space-y-2">
                {stateOptions.map((option) => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="currentState"
                      value={option.value}
                      checked={currentState === option.value}
                      onChange={(e) => setCurrentState(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`flex items-center w-full p-3 border-2 transition-all ${
                      currentState === option.value
                        ? 'bg-retro-cyan/20 border-retro-cyan text-retro-cyan'
                        : 'border-gray-600 text-white hover:border-retro-cyan/50'
                    }`}>
                      <i className={`fa ${option.icon} mr-3`}></i>
                      <span className="font-pixel text-sm">{option.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Challenge */}
            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-triangle-exclamation mr-2"></i>
                WHAT'S HOLDING YOU BACK?
              </label>
              <textarea
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                className="w-full pixel-input h-20 resize-none"
                placeholder="Describe your main challenge..."
                required
              />
            </div>

            {/* Dream */}
            <div>
              <label className="block text-retro-yellow font-pixel text-sm mb-2">
                <i className="fa fa-star mr-2"></i>
                YOUR BIGGEST DREAM
              </label>
              <textarea
                value={dream}
                onChange={(e) => setDream(e.target.value)}
                className="w-full pixel-input h-20 resize-none"
                placeholder="What do you dream of achieving..."
                required
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-retro-green font-pixel text-sm mb-3">
                <i className="fa fa-tools mr-2"></i>
                SKILLS YOU OFFER
              </label>
              <div className="grid grid-cols-2 gap-2">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    className={`p-2 border-2 font-pixel text-xs transition-all ${
                      skills.includes(skill)
                        ? 'bg-retro-green/20 border-retro-green text-retro-green'
                        : 'border-gray-600 text-white hover:border-retro-green/50'
                    }`}
                  >
                    {skill.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Needs */}
            <div>
              <label className="block text-retro-pink font-pixel text-sm mb-3">
                <i className="fa fa-hand-holding-heart mr-2"></i>
                WHAT YOU NEED
              </label>
              <div className="grid grid-cols-2 gap-2">
                {needOptions.map((need) => (
                  <button
                    key={need}
                    type="button"
                    onClick={() => handleNeedToggle(need)}
                    className={`p-2 border-2 font-pixel text-xs transition-all ${
                      needs.includes(need)
                        ? 'bg-retro-pink/20 border-retro-pink text-retro-pink'
                        : 'border-gray-600 text-white hover:border-retro-pink/50'
                    }`}
                  >
                    {need.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-retro-red/20 border-2 border-retro-red p-3 text-retro-red font-pixel text-sm">
                <i className="fa fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !currentState || !challenge || !dream}
              className="w-full pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fa fa-spinner animate-pixel-spin mr-2"></i>
                  SAVING PROFILE...
                </>
              ) : (
                <>
                  <i className="fa fa-check mr-2"></i>
                  COMPLETE SETUP
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireScreen;