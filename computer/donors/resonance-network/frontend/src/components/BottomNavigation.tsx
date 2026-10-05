import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [
    { path: '/home', icon: 'fa-house', label: 'Home' },
    { path: '/profile', icon: 'fa-user', label: 'Me' },
    { path: '/create', icon: 'fa-plus', label: 'Create', primary: true },
    { path: '/connect', icon: 'fa-link', label: 'Connect' },
    { path: '/builder-hub', icon: 'fa-seedling', label: 'Build' },
  ];

  const isActive = (path: string) => location.pathname === path || (path !== '/home' && location.pathname.startsWith(path));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#070812]/95 backdrop-blur-xl border-t border-violet-400/20 safe-area-bottom">
      <div className="flex justify-around items-end py-2 px-2 max-w-md mx-auto">
        {navItems.map((item) => (
          <button key={item.path} onClick={() => navigate(item.path)} className={`relative flex flex-col items-center justify-center min-w-[58px] min-h-[52px] ${item.primary ? '-mt-6' : ''}`}>
            <div className={`${item.primary ? 'w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_28px_rgba(217,70,239,.45)] border border-white/20' : 'w-9 h-9'} grid place-items-center ${isActive(item.path) ? 'text-fuchsia-300' : 'text-white/45'}`}>
              <i className={`fa ${item.icon} ${item.primary ? 'text-xl text-white' : 'text-base'}`}></i>
            </div>
            <span className={`text-[10px] mt-1 ${item.primary ? 'text-fuchsia-200' : isActive(item.path) ? 'text-fuchsia-300' : 'text-white/40'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
