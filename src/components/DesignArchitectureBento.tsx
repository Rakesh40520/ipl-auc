import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

export const DesignArchitectureBento: React.FC = () => {
  const [activeEra, setActiveEra] = useState<'classic' | 'modern'>('modern');

  const toggleEra = (era: 'classic' | 'modern') => {
    sound.playTick();
    setActiveEra(era);
  };

  return (
    <section id="design-bento" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>BMW Design DNA</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          The Pillars of Design Architecture
        </h2>
        <p className="text-slate-400 text-sm sm:text-base mt-2 font-normal leading-relaxed">
          How decades of continuous racing aerodynamic testing shaped the iconic BMW silhouette into modern roadcraft.
        </p>
      </div>

      {/* 3-Card Supaste Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Card 1: Kidney Grille Evolution */}
        <div className="supaste-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-semibold">
                Architecture 01
              </span>
              <div className="flex bg-black/40 p-1 rounded-full border border-white/10 text-[10px] font-semibold">
                <button
                  onClick={() => toggleEra('classic')}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    activeEra === 'classic' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Classic (1988)
                </button>
                <button
                  onClick={() => toggleEra('modern')}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    activeEra === 'modern' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Modern (2026)
                </button>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              The Kidney Grille Evolution
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              {activeEra === 'modern'
                ? 'Modern frameless vertical cooling architecture engineered to feed high-velocity induction air directly into dual intercoolers.'
                : 'Classic compact dual chrome kidney grilles flanked by sealed quad round headlamps, establishing the iconic Bavarian face.'}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Air Induction Volume</span>
            <span className="text-blue-400 font-mono">
              {activeEra === 'modern' ? '+15% Track Efficiency' : 'Historic Baseline'}
            </span>
          </div>
        </div>

        {/* Card 2: Active Aerodynamics */}
        <div className="supaste-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold mb-4">
              Architecture 02
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Computational Aerodynamics
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Sculpted double-bubble carbon fiber roofs, front wheelarch air curtains, and four contoured underbody venturi tunnels create high-speed road adhesion.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Drag Coefficient</span>
              <span className="text-white font-bold">0.28 Cd</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-gradient-to-r from-blue-500 to-cyan-400" />
            </div>
          </div>
        </div>

        {/* Card 3: Driver Cockpit */}
        <div className="supaste-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold mb-4">
              Architecture 03
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Driver-Centric Cockpit
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Ergonomic curved digital instrumentation angled precisely toward the driver's eyeline, flanked by red anodized M paddle shifters and carbon bucket seating.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Cockpit Alignment Angle</span>
            <span className="text-amber-400 font-mono">7.2° Inward Tilt</span>
          </div>
        </div>

      </div>

    </section>
  );
};
