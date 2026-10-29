import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Shield, Cpu, Wind } from 'lucide-react';
import { DesignArchitectureBento } from '../components/DesignArchitectureBento';
import { PageTransition } from '../components/PageTransition';
import { sound } from '../utils/audio';

export const ArchitecturePage: React.FC = () => {
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
            <span className="text-blue-400">Design Architecture</span>
          </div>
        </div>

        {/* Bento Breakdown Component */}
        <DesignArchitectureBento />

        {/* Additional Technical Materials Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Advanced Lightweight Materials
            </h3>
            <p className="text-slate-400 text-sm max-w-xl font-light">
              Engineered with hybrid composite matrices to maximize torsional rigidity while shaving crucial kilograms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="supaste-card p-6 rounded-3xl border border-white/10">
              <Shield className="w-6 h-6 text-blue-400 mb-4" />
              <h4 className="text-lg font-bold text-white mb-1">Carbon Core Cell</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Carbon-fiber reinforced polymer (CFRP) passenger cell integrated into the roof bow and side sills for surgical cornering rigidity.
              </p>
            </div>

            <div className="supaste-card p-6 rounded-3xl border border-white/10">
              <Wind className="w-6 h-6 text-cyan-400 mb-4" />
              <h4 className="text-lg font-bold text-white mb-1">Air Curtain Ducting</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Vertical inlet apertures in the front apron guide airflow around the exterior of the front wheels, minimizing drag turbulence.
              </p>
            </div>

            <div className="supaste-card p-6 rounded-3xl border border-white/10">
              <Cpu className="w-6 h-6 text-amber-400 mb-4" />
              <h4 className="text-lg font-bold text-white mb-1">Adaptive M Chassis Pro</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Electromechanical roll stabilization responds in milliseconds to lateral G-forces, keeping the contact patch fully planar to the track.
              </p>
            </div>
          </div>
        </section>

        {/* Next Page Action */}
        <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto text-center border-t border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-4">
            <span>Cycle Complete</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Return to the Model Portfolio
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 font-light">
            Ready to select a vehicle or request an official demonstration drive?
          </p>
          <button
            onClick={() => {
              sound.playNavSwitch();
              navigate('/models');
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-8 py-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Browse All 8 Vehicles</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </PageTransition>
  );
};
