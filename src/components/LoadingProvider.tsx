'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  backgroundAnimating: boolean;
  preloadingModels: boolean; // New state for model preloading
  preloadProgress: number; // Progress of preloading (0-100)
  preloadStage: string; // Description of current preload stage
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (isLoading: boolean) => void;
  setPreloading: (preloading: boolean, progress?: number, stage?: string) => void; // New preloading control
}

const LoadingContext = createContext<LoadingContextType | null>(null);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>({
    isLoading: false,
    backgroundAnimating: false,
    preloadingModels: false,
    preloadProgress: 0,
    preloadStage: ''
  });

  const setLoading = useCallback((isLoading: boolean) => {
    setLoadingStateInternal(prev => ({ 
      ...prev,
      isLoading,
      backgroundAnimating: isLoading // Auto-trigger background animation with loading
    }));
  }, []);

  const setPreloading = useCallback((preloading: boolean, progress: number = 0, stage: string = '') => {
    setLoadingStateInternal(prev => ({
      ...prev,
      preloadingModels: preloading,
      preloadProgress: progress,
      preloadStage: stage,
      backgroundAnimating: preloading // Keep background animation during preload
    }));
    
    console.log(`🎬 Preloading state: ${preloading}, progress: ${progress}%, stage: ${stage}`);
  }, []);

  return (
    <LoadingContext.Provider value={{
      loadingState,
      setLoading,
      setPreloading
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
