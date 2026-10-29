import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import type { CarModel } from './data/cars';
import { SupasteNavbar } from './components/SupasteNavbar';
import { CinemaPage } from './pages/CinemaPage';
import { ModelsPage } from './pages/ModelsPage';
import { FilmstripPage } from './pages/FilmstripPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { CarInspectionModal } from './components/CarInspectionModal';
import { MinimalFooter } from './components/MinimalFooter';
import { ScrollToTop } from './components/ScrollToTop';

// Inner component to access router location for AnimatePresence
const AnimatedAppContent: React.FC = () => {
  const location = useLocation();
  const [inspectedCar, setInspectedCar] = useState<CarModel | null>(null);

  return (
    <div className="relative min-h-screen bg-[#07080b] text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <ScrollToTop />
      
      {/* Supaste Floating Glass Pill Header */}
      <SupasteNavbar />

      {/* Multi-Page Animated Transitions */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CinemaPage onInspectCar={setInspectedCar} />} />
            <Route path="/models" element={<ModelsPage onInspectCar={setInspectedCar} />} />
            <Route path="/filmstrip" element={<FilmstripPage onInspectCar={setInspectedCar} />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Minimal Luxury Footer */}
      <MinimalFooter />

      {/* Detailed Vehicle Inspection Modal */}
      <CarInspectionModal
        car={inspectedCar}
        onClose={() => setInspectedCar(null)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <AnimatedAppContent />
    </BrowserRouter>
  );
};

export default App;
