import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Sparkles, Layers } from 'lucide-react';
import { CARS } from '../data/cars';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface CinematicHeroProps {
  onInspectCar: (car: CarModel) => void;
  onExploreCatalog: () => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({ onInspectCar, onExploreCatalog }) => {
  // 4 premier cinematic cars from user's folder
  const cinemaChapters = [
    {
      car: CARS[0], // White M4 Coupé
      subtitle: 'CHAPTER 01 // RACECRAFT MEETS ROAD',
      headline: 'The Architecture of Aerodynamic Defiance.',
      meta: '4K ANAMORPHIC • S58 TWIN-TURBO • CFRP COMPOSITE',
    },
    {
      car: CARS[1], // Matte Black M3 Competition
      subtitle: 'CHAPTER 02 // STEALTH SUPREMACY',
      headline: 'Frozen Silhouette. Uncompromising Power.',
      meta: '4K ANAMORPHIC • 503 HP • M XDRIVE TORQUE',
    },
    {
      car: CARS[2], // Concept 8 Series
      subtitle: 'CHAPTER 03 // THE MODERN GRAND TOURER',
      headline: 'Fluidity in Motion. Pure Grand Touring Luxury.',
      meta: '4K ANAMORPHIC • V8 TWINPOWER • BARCELONA CHROME',
    },
    {
      car: CARS[5], // E30 M3 Classic
      subtitle: 'CHAPTER 04 // THE GENESIS OF AN ICON',
      headline: 'Born on the Nürburgring. Immortalized Forever.',
      meta: 'HISTORIC ARCHIVE • 1988 CLASSIC • S14 HIGH-REV',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const currentChapter = cinemaChapters[activeIndex];

  // Auto-progress cinematic sequence
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cinemaChapters.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [cinemaChapters.length]);

  const selectChapter = (idx: number) => {
    sound.playNavSwitch();
    setActiveIndex(idx);
  };

  return (
    <section id="hero-premiere" className="relative min-h-screen flex flex-col justify-between pt-24 pb-8 overflow-hidden bg-black cinema-letterbox">
      
      {/* Fullscreen Backdrop Imagery with Anamorphic Ken-Burns Motion */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChapter.car.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            className="w-full h-full relative"
          >
            <img
              src={currentChapter.car.image}
              alt={currentChapter.car.name}
              className="w-full h-full object-cover object-center brightness-70 select-none"
            />
            {/* DG Cinema letterbox gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-transparent to-black/70 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080b]/90 via-[#07080b]/30 to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Top Meta Tagline (DG Cinema style) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4">
        <div className="flex items-center justify-between text-[11px] font-medium tracking-widest text-slate-400 uppercase border-b border-white/10 pb-3">
          <span className="flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            BMW CINEMATIC ATELIER
          </span>
          <span className="hidden sm:inline font-mono">
            {currentChapter.meta}
          </span>
          <span>
            {String(activeIndex + 1).padStart(2, '0')} / {String(cinemaChapters.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Center Cinematic Editorial Focus */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-10">
        <div className="max-w-3xl">
          
          {/* Chapter Subtitle Pill */}
          <motion.div
            key={`sub-${currentChapter.car.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-wider text-blue-400 backdrop-blur-md mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentChapter.subtitle}</span>
          </motion.div>

          {/* Main Car Name */}
          <motion.h2
            key={`carname-${currentChapter.car.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-300 mb-1"
          >
            {currentChapter.car.name}
          </motion.h2>

          {/* Editorial Headline */}
          <motion.h1
            key={`headline-${currentChapter.car.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight mb-6"
          >
            {currentChapter.headline}
          </motion.h1>

          <motion.p
            key={`tagline-${currentChapter.car.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-8 max-w-xl"
          >
            {currentChapter.car.tagline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            key={`actions-${currentChapter.car.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <button
              onClick={() => {
                sound.playTick();
                onInspectCar(currentChapter.car);
              }}
              className="bg-white hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-slate-900" />
              <span>Inspect Design & Specs</span>
            </button>

            <button
              onClick={() => {
                sound.playTick();
                onExploreCatalog();
              }}
              className="bg-black/50 hover:bg-white/10 text-white border border-white/20 text-xs sm:text-sm font-semibold px-6 py-3 rounded-full backdrop-blur-md transition-all hover:border-white/40 cursor-pointer flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>View All 8 Vehicles</span>
            </button>
          </motion.div>

        </div>
      </div>

      {/* Bottom Timeline Chapter Scrubber (DG Cinema Signature) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {cinemaChapters.map((chapter, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={chapter.car.id}
                onClick={() => selectChapter(idx)}
                className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-white/10 border-white/30 backdrop-blur-md shadow-lg'
                    : 'bg-black/40 border-white/5 opacity-60 hover:opacity-100 hover:bg-white/5'
                }`}
              >
                {/* Active progress bar indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="cinemaProgress"
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"
                  />
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>0{idx + 1}</span>
                  <span className="truncate">{chapter.car.categoryLabel}</span>
                </div>

                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  {chapter.car.name}
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 truncate hidden sm:block">
                  {chapter.car.specs.power} • {chapter.car.startingPrice}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
};
