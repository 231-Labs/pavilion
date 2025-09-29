import React from 'react';
import { useLoading } from '../LoadingProvider';
import { usePreloadNavigation } from '../../hooks/usePreloadNavigation';

export function BrandSection() {
  const { loadingState } = useLoading();
  const { navigateToDemo } = usePreloadNavigation();

  return (
    <div 
      className="flex flex-col justify-center"
      style={{
        padding: 'clamp(24px, 5vw, 56px)'
      }}
    >
      <p className="text-xs tracking-[0.35em] uppercase text-white/60 mb-4">3D Kiosk Extension</p>
      <h2 
        className="font-extrabold tracking-[0.22em] uppercase leading-tight silver-glow"
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.75rem)'
        }}
      >
        Pavilion
      </h2>
      <p 
        className="mt-5 text-white/70 max-w-md"
        style={{
          fontSize: 'clamp(0.875rem, 1.2vw, 1rem)'
        }}
      >
        Turn your kiosk into a curated gallery.
      </p>

      {/* Demo Pavilion Section */}
      <div className="mt-6">
        <button
          onClick={navigateToDemo}
          disabled={loadingState.backgroundAnimating}
          className="group inline-flex items-center space-x-3 text-white/70 hover:text-white/90 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:pointer-events-none"
        >
          <div className="relative">
            <div className="text-sm font-medium tracking-wide silver-glow relative">
              Demo Pavilion
              <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="absolute inset-0 text-sm font-medium tracking-wide text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[0.5px]">
              Demo Pavilion
            </div>
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/20 group-hover:bg-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.2)]">
            {loadingState.backgroundAnimating ? (
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 text-current group-hover:translate-x-0.5 transition-transform duration-200"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
