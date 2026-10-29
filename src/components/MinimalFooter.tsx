import React from 'react';
import { ArrowUp, Globe } from 'lucide-react';
import { sound } from '../utils/audio';

export const MinimalFooter: React.FC = () => {
  const scrollToTop = () => {
    sound.playTick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-[#050608] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Mission */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shadow-sm">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg"
              alt="BMW"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">
              BMW AG
            </div>
            <div className="text-xs text-slate-500 font-normal mt-0.5">
              The Ultimate Driving Machine • Munich, Germany
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <a href="#hero-premiere" className="hover:text-white transition-colors">Cinema</a>
          <a href="#models-bento" className="hover:text-white transition-colors">All 8 Models</a>
          <a href="#cinema-reel" className="hover:text-white transition-colors">Filmstrip Archive</a>
          <a href="#design-bento" className="hover:text-white transition-colors">Design Architecture</a>
          <span className="flex items-center gap-1 text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>Global English</span>
          </span>
        </div>

        {/* Back to top */}
        <button
          onClick={scrollToTop}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
        >
          <span>Back to Top</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 text-center text-[11px] text-slate-600 font-normal">
        © 2026 Bayerische Motoren Werke Aktiengesellschaft. All photography sourced from personal archive & Munich press collection.
      </div>
    </footer>
  );
};
