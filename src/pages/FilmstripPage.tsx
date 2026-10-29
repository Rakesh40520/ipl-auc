import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Film, Maximize2 } from 'lucide-react';
import { CARS } from '../data/cars';
import type { CarModel } from '../data/cars';
import { PageTransition } from '../components/PageTransition';
import { sound } from '../utils/audio';

interface FilmstripPageProps {
  onInspectCar: (car: CarModel) => void;
}

export const FilmstripPage: React.FC<FilmstripPageProps> = ({ onInspectCar }) => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="pt-24 min-h-screen">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <button
              onClick={() => {
                sound.playTick();
                navigate('/');
              }}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cinema</span>
            </button>
            <span>/</span>
            <span className="text-blue-400">Cinematic Filmstrip Gallery</span>
          </div>
        </div>

        {/* Page Hero Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-3">
            <Film className="w-3.5 h-3.5" />
            <span>4K Photographic Archive</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
            The Cinematic Filmstrip
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl font-light">
            Every photograph captured under natural lighting conditions at BMW proving grounds, showcasing the interplay between sculpted carbon fiber, laser optics, and aerodynamic downforce.
          </p>
        </div>

        {/* Full Gallery Grid (DG Cinema Style) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {CARS.map((car, idx) => (
              <div
                key={car.id}
                onClick={() => {
                  sound.playTick();
                  onInspectCar(car);
                }}
                className="supaste-card rounded-3xl overflow-hidden group cursor-pointer border border-white/10"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={car.image}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Frame index */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-white/10">
                    FRAME 0{idx + 1} // {car.categoryLabel.toUpperCase()}
                  </div>

                  {/* Inspect pill */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3.5 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xl">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Inspect Design</span>
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {car.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{car.subtitle} • {car.specs.power}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-400">{car.startingPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Page Banner */}
        <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto text-center border-t border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-4">
            <span>Next Page</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Explore Design Architecture
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 font-light">
            Dive into the technical CFD wind tunnel innovations and historic kidney grille evolution.
          </p>
          <button
            onClick={() => {
              sound.playNavSwitch();
              navigate('/architecture');
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-8 py-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Proceed to Architecture</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </PageTransition>
  );
};
