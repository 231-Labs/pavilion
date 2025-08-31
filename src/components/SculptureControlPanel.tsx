'use client';

import { useState, useEffect } from 'react';
import { SculptureInstance } from '../types/sculpture';

interface SculptureControlPanelProps {
  sculptures: SculptureInstance[];
  onUpdatePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  onUpdateRotation?: (id: string, rotation: { x: number; y: number; z: number }) => void;
  onUpdateScale?: (id: string, scale: { x: number; y: number; z: number }) => void;
}

export function SculptureControlPanel({ 
  sculptures, 
  onUpdatePosition, 
  onUpdateRotation, 
  onUpdateScale 
}: SculptureControlPanelProps) {
  const [selectedSculpture, setSelectedSculpture] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Automatically select the first sculpture when available
  useEffect(() => {
    if (sculptures.length > 0 && !selectedSculpture) {
      setSelectedSculpture(sculptures[0].config.id);
    }
  }, [sculptures, selectedSculpture]);

  const currentSculpture = sculptures.find(s => s.config.id === selectedSculpture);

  if (!currentSculpture) {
    return null;
  }

  return (
    <div className="glass-panel control-panel max-w-sm min-w-[360px] overflow-hidden glow">
      {/* Title bar */}
      <div
        className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="neon-text text-lg font-light tracking-wider uppercase">
          🎨 Sculpture Terminal
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 tracking-wide">
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
          <span className="text-gray-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Control panel content */}
      {isExpanded && (
        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Sculpture selector */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-300 tracking-wide uppercase">
              Select Sculpture
            </label>
            <select
              value={selectedSculpture || ''}
              onChange={(e) => setSelectedSculpture(e.target.value)}
              className="w-full p-3 glass-panel rounded-lg border border-white/20 bg-transparent text-gray-300"
            >
              {sculptures.map(sculpture => (
                <option
                  key={sculpture.config.id}
                  value={sculpture.config.id}
                  className="bg-black text-white"
                >
                  {sculpture.config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position control */}
          <div className="space-y-4">
            <label className="block text-sm font-light neon-text tracking-wide uppercase">
              📍 Position Vector
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis} className="space-y-2">
                  <label className="block text-xs text-gray-400 tracking-wide">{axis.toUpperCase()}</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={currentSculpture.config.position[axis]}
                    onChange={(e) => onUpdatePosition(currentSculpture.config.id, {
                      ...currentSculpture.config.position,
                      [axis]: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={currentSculpture.config.position[axis]}
                    onChange={(e) => onUpdatePosition(currentSculpture.config.id, {
                      ...currentSculpture.config.position,
                      [axis]: parseFloat(e.target.value) || 0
                    })}
                    className="w-full p-2 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation control */}
          {onUpdateRotation && (
            <div className="space-y-4">
              <label className="block text-sm font-light neon-text tracking-wide uppercase">
                🔄 Rotation Matrix
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="space-y-2">
                    <label className="block text-xs text-gray-400 tracking-wide">{axis.toUpperCase()}</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={((currentSculpture.config.rotation?.[axis] || 0) * 180 / Math.PI) % 360}
                      onChange={(e) => {
                        const degrees = parseFloat(e.target.value);
                        const radians = degrees * Math.PI / 180;
                        onUpdateRotation(currentSculpture.config.id, {
                          ...currentSculpture.config.rotation || { x: 0, y: 0, z: 0 },
                          [axis]: radians
                        });
                      }}
                      className="w-full"
                    />
                    <input
                      type="number"
                      step="1"
                      value={Math.round(((currentSculpture.config.rotation?.[axis] || 0) * 180 / Math.PI) % 360)}
                      onChange={(e) => {
                        const degrees = parseFloat(e.target.value) || 0;
                        const radians = degrees * Math.PI / 180;
                        onUpdateRotation(currentSculpture.config.id, {
                          ...currentSculpture.config.rotation || { x: 0, y: 0, z: 0 },
                          [axis]: radians
                        });
                      }}
                      className="w-full p-2 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scale control */}
          {onUpdateScale && (
            <div className="space-y-4">
              <label className="block text-sm font-light neon-text tracking-wide uppercase">
                📏 Scale Factor
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="space-y-2">
                    <label className="block text-xs text-gray-400 tracking-wide">{axis.toUpperCase()}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={currentSculpture.config.scale?.[axis] || 1}
                      onChange={(e) => onUpdateScale(currentSculpture.config.id, {
                        ...currentSculpture.config.scale || { x: 1, y: 1, z: 1 },
                        [axis]: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={currentSculpture.config.scale?.[axis] || 1}
                      onChange={(e) => onUpdateScale(currentSculpture.config.id, {
                        ...currentSculpture.config.scale || { x: 1, y: 1, z: 1 },
                        [axis]: parseFloat(e.target.value) || 1
                      })}
                      className="w-full p-2 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick reset buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => onUpdatePosition(currentSculpture.config.id, { x: 0, y: 1, z: 0 })}
              className="liquid-button flex-1 px-4 py-3 text-xs font-light tracking-wide uppercase neon-text"
            >
              Reset Position
            </button>
            {onUpdateRotation && (
              <button
                onClick={() => onUpdateRotation(currentSculpture.config.id, { x: 0, y: 0, z: 0 })}
                className="liquid-button flex-1 px-4 py-3 text-xs font-light tracking-wide uppercase neon-text"
              >
                Reset Rotation
              </button>
            )}
          </div>

          {/* Status indicator */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="tracking-wide uppercase">System Online</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
