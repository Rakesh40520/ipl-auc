import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { BentoCatalog } from '../components/BentoCatalog';
import { PageTransition } from '../components/PageTransition';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface ModelsPageProps {
  onInspectCar: (car: CarModel) => void;
}

export const ModelsPage: React.FC<ModelsPageProps> = ({ onInspectCar }) => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="pt-24 min-h-screen">
        {/* Top Breadcrumb Header */}
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
            <span className="text-blue-400">Models Portfolio (8)</span>
          </div>
        </div>

        {/* Bento Catalog */}
        <BentoCatalog onInspectCar={onInspectCar} />

        {/* Next Page Banner */}
        <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto text-center border-t border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-4">
            <span>Next Page</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Inspect the Design Architecture
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 font-light">
            Understand how our aerodynamic wind tunnel testing and historic kidney grille evolution drive modern road dynamics.
          </p>
          <button
            onClick={() => {
              sound.playNavSwitch();
              navigate('/architecture');
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-8 py-3.5 rounded-full border border-white/20 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Go to Design Architecture</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </PageTransition>
  );
};
