import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Film } from 'lucide-react';
import { CinematicHero } from '../components/CinematicHero';
import { EditorialFilmstrip } from '../components/EditorialFilmstrip';
import { PageTransition } from '../components/PageTransition';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface CinemaPageProps {
  onInspectCar: (car: CarModel) => void;
}

export const CinemaPage: React.FC<CinemaPageProps> = ({ onInspectCar }) => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      {/* Fullscreen DG Cinema Premiere Stage */}
      <CinematicHero
        onInspectCar={onInspectCar}
        onExploreCatalog={() => {
          sound.playNavSwitch();
          navigate('/models');
        }}
      />

      {/* Filmstrip Reel Section */}
      <EditorialFilmstrip onInspectCar={onInspectCar} />

      {/* Next Page Banner Action (Supaste Style) */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto text-center border-t border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-4">
          <Film className="w-3.5 h-3.5" />
          <span>Next Experience</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
          Ready to Explore the 8 Vehicle Designs?
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8 font-light">
          Step into our complete portfolio featuring full technical telemetry, M Carbon bucket seating, and authentic multi-layer paints.
        </p>
        <button
          onClick={() => {
            sound.playNavSwitch();
            navigate('/models');
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-8 py-3.5 rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Models Portfolio</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>
    </PageTransition>
  );
};
