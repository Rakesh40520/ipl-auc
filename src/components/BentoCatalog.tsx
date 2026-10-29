import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { CARS, CATEGORIES } from '../data/cars';
import type { CarModel } from '../data/cars';
import { sound } from '../utils/audio';

interface BentoCatalogProps {
  onInspectCar: (car: CarModel) => void;
}

export const BentoCatalog: React.FC<BentoCatalogProps> = ({ onInspectCar }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredCars = activeCategory === 'all'
    ? CARS
    : CARS.filter((c) => c.category === activeCategory);

  const handleCategoryChange = (catId: string) => {
    sound.playTick();
    setActiveCategory(catId);
  };

  return (
    <section id="models-bento" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-3">
            <span>BMW Model Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            The Design Portfolio
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl font-normal leading-relaxed">
            Every vehicle in our collection represents a milestone of German aerodynamic sculpting and engineering precision. Select any model to inspect design details.
          </p>
        </div>

        {/* Category Filter Pills (Supaste Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-white/5 border border-white/10 self-start md:self-auto max-w-full">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bentoCategoryIndicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute inset-0 bg-blue-600 rounded-xl"
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredCars.map((car, index) => {
            const isFeatured = index === 0 && activeCategory === 'all';
            return (
              <motion.div
                key={car.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                onClick={() => {
                  sound.playTick();
                  onInspectCar(car);
                }}
                className={`supaste-card rounded-3xl overflow-hidden cursor-pointer group flex flex-col justify-between ${
                  isFeatured ? 'md:col-span-2' : ''
                }`}
              >
                {/* Photo Stage */}
                <div className={`relative overflow-hidden bg-black ${isFeatured ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
                  <img
                    src={car.image}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 select-none"
                  />

                  {/* Gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-transparent to-transparent pointer-events-none" />

                  {/* Category badge */}
                  <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-slate-200">
                    {car.categoryLabel}
                  </div>

                  {/* Hover Inspect Pill */}
                  <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold flex items-center gap-1 shadow-lg">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                      <span>{car.year} • {car.subtitle}</span>
                      <span className="font-bold text-white">{car.startingPrice}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {car.name}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {car.tagline}
                    </p>
                  </div>

                  {/* Bottom Specs Strip & Color Options */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-4 text-slate-300">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">Power</span>
                        <span className="font-bold text-white">{car.specs.power}</span>
                      </div>
                      <div className="h-4 w-px bg-white/10" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">0–60 MPH</span>
                        <span className="font-bold text-white">{car.specs.acceleration.split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Paint swatches */}
                    <div className="flex items-center gap-1.5">
                      {car.colorOptions.map((c) => (
                        <span
                          key={c.name}
                          title={c.name}
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

    </section>
  );
};
