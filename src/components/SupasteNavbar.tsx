import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, ChevronRight, Menu, X } from 'lucide-react';
import { sound } from '../utils/audio';

export const SupasteNavbar: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    { path: '/', label: 'Cinema' },
    { path: '/models', label: 'Models (8)' },
    { path: '/filmstrip', label: 'Filmstrip' },
    { path: '/architecture', label: 'Architecture' },
  ];

  const handleNavClick = (path: string) => {
    sound.playTick();
    setIsMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="fixed top-4 sm:top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="supaste-pill rounded-full px-3 sm:px-4 py-2 flex items-center justify-between gap-3 sm:gap-6 max-w-4xl w-full pointer-events-auto transition-all shadow-2xl">
        
        {/* Left: Brand Pill */}
        <Link
          to="/"
          onClick={() => sound.playTick()}
          className="flex items-center gap-2.5 group cursor-pointer text-left pl-1"
        >
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg"
              alt="BMW"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-bold text-white block leading-none">
              BMW
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Design Atelier
            </span>
          </div>
        </Link>

        {/* Center: Real Page Navigation Tabs (Supaste Signature) */}
        <nav className="hidden sm:flex items-center gap-1 bg-black/30 p-1 rounded-full border border-white/5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="supasteNavPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white/15 rounded-full border border-white/20 shadow-sm"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Sound Synthesizer + Next Page Button */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Soundscape"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="w-0.5 h-2 bg-cyan-400 animate-pulse rounded-full" />
              </div>
            )}
          </button>

          {/* Page Switch Button */}
          <button
            onClick={() => handleNavClick('/models')}
            className="hidden xs:flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <span>Explore 8 Models</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="sm:hidden p-1.5 rounded-full text-slate-300 hover:text-white bg-white/5"
            aria-label="Menu"
          >
            {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 left-4 right-4 bg-[#0d0f16]/95 border border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl pointer-events-auto sm:hidden"
          >
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => handleNavClick('/models')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <span>View Full Model Portfolio</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
