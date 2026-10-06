import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, BirthData, ProfileResponse } from '../services/apiService';

interface AuthContextType {
  userId: string | null;
  displayName: string | null;
  profile: ProfileResponse | null;
  isAuthenticated: boolean;
  restored: boolean;
  hasProfile: boolean;
  createOrLoadProfile: (params: {
    email: string;
    displayName: string;
    birth: BirthData;
    currentState?: string;
    challenge?: string;
    dream?: string;
    skills?: string[];
    needs?: string[];
  }) => Promise<void>;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('resonance_user_id');
    const storedName = localStorage.getItem('resonance_display_name');
    const storedProfile = localStorage.getItem('resonance_profile');
    if (storedUserId) setUserId(storedUserId);
    if (storedName) setDisplayName(storedName);
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch {
        localStorage.removeItem('resonance_profile');
      }
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || window.parent === window || !document.referrer) return;
    const parentUrl = new URL(document.referrer);
    if (!['appassets.androidplatform.net', '127.0.0.1', 'localhost'].includes(parentUrl.hostname)) return;
    window.parent.postMessage({ type: 'resonance:profile', userId }, parentUrl.origin);
  }, [userId, restored]);

  const createOrLoadProfile: AuthContextType['createOrLoadProfile'] = async (params) => {
    const response = await apiService.createProfile({
      email: params.email,
      display_name: params.displayName,
      birth: params.birth,
      current_state: params.currentState,
      challenge: params.challenge,
      dream: params.dream,
      skills: params.skills,
      needs: params.needs,
    });
    setUserId(response.user_id);
    setDisplayName(params.displayName);
    setProfile(response);
    localStorage.setItem('resonance_user_id', response.user_id);
    localStorage.setItem('resonance_display_name', params.displayName);
    localStorage.setItem('resonance_profile', JSON.stringify(response));
  };

  const login = async (email: string): Promise<boolean> => {
    try {
      const response = await apiService.loginByEmail(email);
      setUserId(response.user_id);
      setDisplayName(response.display_name || null);
      setProfile(response);
      localStorage.setItem('resonance_user_id', response.user_id);
      if (response.display_name) localStorage.setItem('resonance_display_name', response.display_name);
      localStorage.setItem('resonance_profile', JSON.stringify(response));
      return true;
    } catch {
      // No account found for this email -- not an error the caller needs
      // a stack trace for, just "try signing up instead."
      return false;
    }
  };

  const logout = () => {
    setUserId(null);
    setDisplayName(null);
    setProfile(null);
    localStorage.removeItem('resonance_user_id');
    localStorage.removeItem('resonance_display_name');
    localStorage.removeItem('resonance_profile');
  };

  const value: AuthContextType = {
    userId,
    displayName,
    profile,
    isAuthenticated: !!userId,
    restored,
    hasProfile: !!profile,
    createOrLoadProfile,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
