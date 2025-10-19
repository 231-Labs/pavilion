import React from 'react';
import type { Mode } from '../../types/home';

interface ModeToggleProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div 
      className="slab-segment"
      style={{
        padding: 'clamp(8px, 2vw, 20px) clamp(12px, 2.5vw, 20px)'
      }}
    >
      <div 
        className="relative mx-auto rounded-lg border border-white/20 bg-white/5 overflow-hidden"
        style={{
          width: 'clamp(180px, 20vw, 220px)'
        }}
      >
        <div
          className="absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(50%-8px)] rounded-md bg-white/10 transition-transform duration-300"
          style={{ transform: mode === 'designer' ? 'translateX(100%)' : 'translateX(0%)' }}
          aria-hidden
        />
        <div className="relative z-10 grid grid-cols-2 text-center">
          <button
            onClick={() => setMode('collector')}
            aria-pressed={mode === 'collector'}
            className="py-2 text-xs uppercase tracking-widest font-semibold"
          >
            Collector
          </button>
          <button
            onClick={() => setMode('designer')}
            aria-pressed={mode === 'designer'}
            className="py-2 text-xs uppercase tracking-widest font-semibold"
          >
            Designer
          </button>
        </div>
      </div>
    </div>
  );
}
