import React from 'react';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0e1a]/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
        <span className="text-xl">🏏</span>
      </div>
      <p className="text-xs font-black tracking-widest text-orange-400 uppercase animate-pulse">Loading Arena...</p>
    </div>
  );
};

export default PageLoader;
