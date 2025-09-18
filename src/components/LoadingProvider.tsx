'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  loadingStage: string;
  details: string;
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (isLoading: boolean) => void;
  setProgress: (progress: number) => void;
  setLoadingStage: (stage: string, details?: string) => void;
  updateLoadingState: (updates: Partial<LoadingState>) => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    loadingStage: '',
    details: ''
  });

  const setLoading = (isLoading: boolean) => {
    setLoadingStateInternal(prev => ({ 
      ...prev, 
      isLoading,
      progress: isLoading ? 0 : 100 
    }));
  };

  const setProgress = (progress: number) => {
    setLoadingStateInternal(prev => ({ ...prev, progress: Math.min(100, Math.max(0, progress)) }));
  };

  const setLoadingStage = (stage: string, details: string = '') => {
    setLoadingStateInternal(prev => ({ ...prev, loadingStage: stage, details }));
  };

  const updateLoadingState = (updates: Partial<LoadingState>) => {
    setLoadingStateInternal(prev => ({ ...prev, ...updates }));
  };

  return (
    <LoadingContext.Provider value={{
      loadingState,
      setLoading,
      setProgress,
      setLoadingStage,
      updateLoadingState
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// 3D Scene Loading Animation Component with Frosted Glass Effect
export function SceneLoadingOverlay() {
  const { loadingState } = useLoading();

  if (!loadingState.isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-black via-[#0A0A0A] to-[#0F0F12] flex items-center justify-center">
      {/* Enhanced Background Effects - Using project's glass color system */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(240,245,250,0.03),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(200,220,240,0.02),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,230,240,0.01),transparent_80%)]"></div>
        <div className="terminal-grid opacity-30"></div>
      </div>

      {/* Main Glass Container */}
      <div className="relative z-10">
        {/* Frosted Glass Loading Panel - Using project's glass-slab styling */}
        <div className="relative bg-gradient-to-br from-[rgba(240,245,250,0.08)] via-[rgba(200,220,240,0.12)] to-[rgba(180,200,220,0.08)] backdrop-blur-[28px] saturate-110 border border-[rgba(220,230,240,0.15)] rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18),0_4px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.12)] overflow-hidden">
          
          {/* Glass Panel Top Highlight */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(240,245,250,0.2)] to-transparent"></div>
          
          {/* Inner Content with Padding */}
          <div className="relative px-12 py-16 text-center space-y-8">
            
            {/* Logo Animation with Enhanced Glass Effect */}
            <div className="flex items-center justify-center space-x-4 mb-10">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/60 to-white/15 backdrop-blur-sm border border-white/20 shadow-[0_0_32px_rgba(200,200,220,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] animate-pulse"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <h1 className="text-5xl font-extrabold tracking-[0.25em] uppercase silver-glow animate-pulse">
                Pavilion
              </h1>
            </div>

            {/* Enhanced 3D Loader with Multi-layered Glass Effect */}
            <div className="relative w-36 h-36 mx-auto mb-10">
              {/* Outer Glass Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(220,230,240,0.25)] bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm"></div>
              
              {/* Primary Spinning Glass Ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/70 border-r-white/30 animate-spin backdrop-blur-sm"
                style={{ animationDuration: '1.8s' }}
              ></div>
              
              {/* Secondary Inner Glass Ring */}
              <div 
                className="absolute inset-3 rounded-full border border-[rgba(200,215,230,0.20)] border-r-white/50 border-b-white/30 animate-spin bg-gradient-to-br from-white/3 to-transparent backdrop-blur-sm"
                style={{ animationDuration: '2.5s', animationDirection: 'reverse' }}
              ></div>
              
              {/* Center Glass Orb with Enhanced Shadow */}
              <div className="absolute top-1/2 left-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-sm border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] animate-pulse"></div>
            </div>

            {/* Glass Progress Section with Enhanced Styling */}
            <div className="w-96 mx-auto space-y-6">
              {/* Progress Bar Container with Glass Effect */}
              <div className="relative h-2 bg-gradient-to-r from-[rgba(200,215,230,0.15)] via-[rgba(220,230,240,0.20)] to-[rgba(200,215,230,0.15)] rounded-full overflow-hidden backdrop-blur-sm border border-[rgba(220,230,240,0.1)] shadow-inner">
                {/* Progress Fill with Enhanced Glass Effect */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[rgba(240,245,250,0.8)] via-white/90 to-[rgba(240,245,250,0.8)] rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  style={{ width: `${loadingState.progress}%` }}
                />
                {/* Progress Shimmer Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse"></div>
              </div>
              
              {/* Text Content with Enhanced Glass Typography */}
              <div className="text-center space-y-3">
                <p className="text-xl font-semibold tracking-wide text-white/95 silver-glow drop-shadow-sm">
                  {loadingState.loadingStage || 'Initializing 3D Scene...'}
                </p>
                {loadingState.details && (
                  <p className="text-sm text-white/70 tracking-wider font-medium">
                    {loadingState.details}
                  </p>
                )}
                <p className="text-xs text-white/60 tracking-[0.25em] uppercase font-mono">
                  {loadingState.progress}% Complete
                </p>
              </div>
            </div>

          </div>

          {/* Glass Panel Bottom Highlight */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(200,215,230,0.15)] to-transparent"></div>
        </div>

        {/* Enhanced Ambient Particle Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-ping"
              style={{
                background: `radial-gradient(circle, rgba(240,245,250,${0.6 - i * 0.03}) 0%, transparent 70%)`,
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2.5 + Math.random() * 1.5}s`
              }}
            />
          ))}
        </div>

        {/* Subtle Glass Reflection Effects */}
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-radial from-white/10 to-transparent rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-radial from-[rgba(200,220,240,0.15)] to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
    </div>
  );
}