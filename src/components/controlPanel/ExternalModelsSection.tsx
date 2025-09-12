'use client';

import React from 'react';

interface ExternalModelsSectionProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  walrusBlobId: string;
  onWalrusBlobIdChange: (val: string) => void;
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  loadedModels: string[];
  onLoadWalrus: () => void;
  onClearModels: () => void;
  onLoadAllModels: () => void;
}

export function ExternalModelsSection({
  expanded,
  onToggleExpanded,
  walrusBlobId,
  onWalrusBlobIdChange,
  isLoading,
  loadingProgress,
  error,
  loadedModels,
  onLoadWalrus,
  onClearModels,
  onLoadAllModels,
}: ExternalModelsSectionProps) {
  return (
    <>
      <div className="border-t border-white/10"></div>
      <div
        className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
        onClick={onToggleExpanded}
      >
        <h3 className="elegant-title tracking-wider uppercase">External Models</h3>
        <div className="flex items-center space-x-2">
          <span className="elegant-expand-text font-medium tracking-wide">
            {expanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
          <span className="elegant-expand-arrow" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-stretch gap-2">
              <input
                value={walrusBlobId}
                onChange={(e) => onWalrusBlobIdChange(e.target.value)}
                placeholder="Walrus Blob ID"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40"
              />
              <button
                type="button"
                onClick={onLoadWalrus}
                disabled={isLoading || !walrusBlobId.trim()}
                className="walrus-icon-button w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg bg-white/5 hover:bg-white/10 disabled:bg-white/5 border border-white/20 flex items-center justify-center transition-colors"
                aria-label="Load Walrus Blob"
                title="Load Walrus Blob"
              >
                {isLoading ? (
                  <span className="text-xs text-white/70">...</span>
                ) : (
                  <span className="walrus-glyph" aria-hidden="true"></span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={onClearModels}
                className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors"
              >
                Clear Models
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onLoadAllModels}
                disabled={isLoading}
                className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white/80 border border-white/20 uppercase tracking-widest transition-colors col-span-2"
              >
                {isLoading ? 'Loading...' : 'Load All Models (from /public/models)'}
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="bg-white/10 rounded-full h-2">
                <div
                  className="bg-white/80 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-center control-label-primary">Loading Progress: {loadingProgress}%</p>
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs">
              <p>{error}</p>
            </div>
          )}

          {loadedModels.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium tracking-wide uppercase control-label-primary">
                Loaded Models ({loadedModels.length})
              </label>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {loadedModels.map((modelName, index) => (
                  <div key={index} className="flex items-center text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span className="truncate">{modelName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}


