import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasProfile } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (hasProfile) {
          navigate('/home');
        } else {
          navigate('/birth-data');
        }
      } else {
        navigate('/welcome');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, hasProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-retro-purple via-retro-pink to-retro-cyan safe-area-top safe-area-bottom">
      <div className="text-center px-4 w-full max-w-sm">
        <div className="animate-pixel-bounce mb-8">
          <i className="fa fa-sparkles text-8xl text-white text-shadow-pixel"></i>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-pixel text-white text-shadow-pixel mb-4 animate-fade-in">
          RESONANCE
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-pixel text-retro-yellow text-shadow-pixel mb-8 animate-fade-in">
          NETWORK
        </h2>
        
        <div className="flex justify-center space-x-2 animate-pixel-pulse">
          <div className="w-3 h-3 bg-white border border-retro-cyan"></div>
          <div className="w-3 h-3 bg-white border border-retro-cyan animation-delay-200"></div>
          <div className="w-3 h-3 bg-white border border-retro-cyan animation-delay-400"></div>
        </div>
        
        <p className="text-sm text-white/80 mt-8 font-pixel">
          Connecting through cosmic resonance...
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;