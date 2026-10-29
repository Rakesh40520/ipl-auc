import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShieldCheck, ChevronRight } from 'lucide-react';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface CarInspectionModalProps {
  car: CarModel | null;
  onClose: () => void;
}

export const CarInspectionModal: React.FC<CarInspectionModalProps> = ({ car, onClose }) => {
  const [activeTab, setActiveTab] = useState<'design' | 'specs' | 'colors'>('design');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isReserved, setIsReserved] = useState(false);

  if (!car) return null;

  const handleTabChange = (tab: 'design' | 'specs' | 'colors') => {
    sound.playTick();
    setActiveTab(tab);
  };

  const handleReserve = () => {
    sound.playDriveMode('track');
    setIsReserved(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-5xl bg-[#0e1017] border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)] my-auto"
        >
          {/* Close Button */}
          <button
            onClick={() => {
              sound.playTick();
              onClose();
            }}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-md"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Full-Bleed Photograph Stage */}
          <div className="relative aspect-[16/9] max-h-[440px] overflow-hidden bg-black">
            <img
              src={car.image}
              alt={car.name}
              className="w-full h-full object-cover object-center select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-transparent to-black/40 pointer-events-none" />

            {/* Overlaid Title & Price */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold text-blue-300 backdrop-blur-md mb-2">
                  <span>{car.categoryLabel}</span>
                  <span>•</span>
                  <span>{car.year} Model</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
                  {car.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 font-light max-w-lg">
                  {car.tagline}
                </p>
              </div>

              <div className="bg-black/60 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Starting MSRP</span>
                <span className="text-xl sm:text-2xl font-bold text-white block">{car.startingPrice}</span>
              </div>
            </div>
          </div>

          {/* Modal Tab Controls (Supaste style pill tabs) */}
          <div className="px-6 sm:px-8 pt-6 pb-2 border-b border-white/10 flex items-center gap-2">
            {[
              { id: 'design', label: 'Design Architecture' },
              { id: 'specs', label: 'Technical Specifications' },
              { id: 'colors', label: 'Colorway Palette' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as typeof activeTab)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-6 sm:p-8 min-h-[220px]">
            {activeTab === 'design' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {car.designHighlights.map((hl, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <span className="text-xs font-mono text-blue-400 block mb-1">
                      FEATURE 0{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white mb-1.5">
                      {hl.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      {hl.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Power</span>
                  <span className="text-2xl font-bold text-white block mt-1">{car.specs.power}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">0–60 MPH</span>
                  <span className="text-2xl font-bold text-white block mt-1">{car.specs.acceleration}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Top Speed</span>
                  <span className="text-2xl font-bold text-white block mt-1">{car.specs.topSpeed}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Propulsion</span>
                  <span className="text-sm font-bold text-white block mt-1 leading-snug">{car.specs.engine}</span>
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div>
                <p className="text-xs text-slate-400 mb-4 font-normal">
                  Select an authentic BMW multi-layer exterior finish:
                </p>
                <div className="flex flex-wrap gap-3">
                  {car.colorOptions.map((c, idx) => {
                    const isSelected = selectedColorIdx === idx;
                    return (
                      <button
                        key={c.name}
                        onClick={() => {
                          sound.playTick();
                          setSelectedColorIdx(idx);
                        }}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/15 border-white text-white shadow-lg'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 sm:px-8 py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40">
            <span className="text-xs text-slate-400 font-normal">
              Official demonstration vehicle allocation for 2026.
            </span>

            {!isReserved ? (
              <button
                onClick={handleReserve}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Request Demonstration Drive</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>Test Drive Request Confirmed • Allocation Specialist Assigned</span>
              </div>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
