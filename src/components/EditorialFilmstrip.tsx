import React from 'react';
import { motion } from 'framer-motion';
import { Film, Maximize2 } from 'lucide-react';
import { CARS } from '../data/cars';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface EditorialFilmstripProps {
  onInspectCar: (car: CarModel) => void;
}

export const EditorialFilmstrip: React.FC<EditorialFilmstripProps> = ({ onInspectCar }) => {
  // Select dramatic visual gallery pieces
  const galleryItems = [
    CARS[4], // BMW Glowing Laserlight
    CARS[5], // BMW M6 GTLM Motorsport
    CARS[6], // BMW E30 M3 Classic
    CARS[7], // Vintage 2002 Turbo Inferno
    CARS[3], // BMW 740e iPerformance
  ];

  return (
    <section id="cinema-reel" className="py-24 bg-[#050608] border-y border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <span>Cinematic Visual Archive</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              The Filmstrip Gallery
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-lg font-normal">
              High-definition photographic studies capturing the intersection of light, carbon fiber, and historic racing heritage.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            SCROLL HORIZONTALLY TO INSPECT
          </span>
        </div>
      </div>

      {/* Horizontal Cinematic Film Rail */}
      <div className="flex items-center gap-6 overflow-x-auto px-4 sm:px-8 pb-8 no-scrollbar scroll-smooth">
        {galleryItems.map((item, idx) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              sound.playTick();
              onInspectCar(item);
            }}
            className="flex-none w-[320px] sm:w-[420px] rounded-3xl overflow-hidden supaste-card border border-white/10 group cursor-pointer"
          >
            {/* Anamorphic Frame */}
            <div className="relative aspect-[16/10] overflow-hidden bg-black">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-700 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

              {/* Film index marker */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300">
                FRAME 0{idx + 1}
              </div>

              {/* Click to expand pill */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold flex items-center gap-1 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Inspect</span>
              </div>
            </div>

            {/* Film Metadata Card */}
            <div className="p-5">
              <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider mb-1">
                {item.categoryLabel}
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {item.tagline}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
