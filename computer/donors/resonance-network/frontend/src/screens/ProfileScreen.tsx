import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';

const ProfileScreen: React.FC = () => {
  const { displayName, profile, logout } = useAuth();

  if (!profile) return null;
  const { bodygraph, charts } = profile.natal_report;
  const sun = charts.tropical.find((p) => p.body === 'Sun' && p.stream === 'personality');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixel-dark via-gray-900 to-retro-purple safe-area-top safe-area-bottom pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-pixel text-white text-shadow-pixel mb-6">PROFILE</h1>

        <div className="pixel-card mb-6 animate-slide-up text-center">
          <div className="w-16 h-16 rounded-full bg-retro-purple mx-auto mb-3 flex items-center justify-center">
            <span className="font-pixel text-xl text-white">{(displayName || '?').slice(0, 2).toUpperCase()}</span>
          </div>
          <h2 className="font-pixel text-white text-lg">{displayName}</h2>
        </div>

        <div className="pixel-card mb-6 animate-slide-up">
          <h3 className="font-pixel text-retro-cyan text-sm mb-3">CHART SUMMARY</h3>
          <div className="space-y-2 text-sm font-pixel text-white/80">
            <div className="flex justify-between"><span>Sun Gate</span><span className="text-retro-cyan">{sun ? `${sun.gate}.${sun.line}` : '--'}</span></div>
            <div className="flex justify-between"><span>Definition</span><span className="text-retro-cyan">{bodygraph.definition}</span></div>
            <div className="flex justify-between"><span>Active Gates</span><span className="text-retro-cyan">{bodygraph.active_gates.length}</span></div>
            <div className="flex justify-between"><span>Network Coherence</span><span className="text-retro-cyan">{Math.round(profile.network_coherence * 100)}%</span></div>
          </div>
        </div>

        <button onClick={logout} className="w-full pixel-button bg-retro-red hover:bg-retro-red/80">
          <i className="fa fa-sign-out-alt mr-2"></i>LOG OUT
        </button>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ProfileScreen;
