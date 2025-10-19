'use client';

import React from 'react';
import { ControllableObject, Vector3Like } from '../../../types/controlPanel';

interface TransformControlsSectionProps {
  current: ControllableObject;
  canRotate: boolean;
  canScale: boolean;
  onResetAll: () => void;
  onChangePosition: (next: Vector3Like) => void;
  onResetPosition: () => void;
  onChangeRotation: (next: Vector3Like) => void;
  onResetRotation: () => void;
  onChangeScale: (next: Vector3Like) => void;
  onResetScale: () => void;
}

export function TransformControlsSection({
  current,
  canRotate,
  canScale,
  onResetAll,
  onChangePosition,
  onResetPosition,
  onChangeRotation,
  onResetRotation,
  onChangeScale,
  onResetScale,
}: TransformControlsSectionProps) {
  const position = current.position;
  const rotation = current.rotation || { x: 0, y: 0, z: 0 };
  const scale = current.scale || { x: 1, y: 1, z: 1 };

  return (
    <div className="space-y-3">
      {/* Transform Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
          <label className="text-xs font-semibold tracking-wider uppercase text-white/40">
            Transform
          </label>
        </div>
        <button
          onClick={onResetAll}
          className="px-2 py-1 text-[10px] text-white/60 hover:text-white/80 uppercase tracking-widest rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
        >
          Reset All
        </button>
      </div>

      <div className="pl-3.5 space-y-4">
          {/* Position */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium tracking-wider uppercase text-white/50">
                Position
              </label>
              <button
                onClick={onResetPosition}
                className="text-[9px] text-white/40 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="space-y-1.5">
                  <label className="block text-[10px] font-semibold tracking-wider text-center text-white/40 uppercase">
                    {axis}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={position[axis]}
                    onChange={(e) => {
                      const next = { ...position, [axis]: parseFloat(e.target.value) } as Vector3Like;
                      onChangePosition(next);
                    }}
                    className="w-full"
                    style={{ height: '4px' }}
                  />
                  <input
                    key={`${current.id}-pos-${axis}-${position[axis]}`}
                    type="text"
                    inputMode="decimal"
                    pattern="^-?\\d*(\\.\\d+)?$"
                    defaultValue={position[axis]}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                      const valueToUse = Number.isFinite(parsed) ? parsed : position[axis];
                      const next = { ...position, [axis]: valueToUse } as Vector3Like;
                      onChangePosition(next);
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-md bg-black/20 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-black/30 text-center text-white/80 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation */}
          {canRotate && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium tracking-wider uppercase text-white/50">
                  Rotation
                </label>
                <button
                  onClick={onResetRotation}
                  className="text-[9px] text-white/40 hover:text-white/60 uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div key={axis} className="space-y-1.5">
                    <label className="block text-[10px] font-semibold tracking-wider text-center text-white/40 uppercase">
                      {axis}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={((rotation[axis] || 0) * 180) / Math.PI % 360}
                      onChange={(e) => {
                        const degrees = parseFloat(e.target.value);
                        const radians = (degrees * Math.PI) / 180;
                        const next = { ...rotation, [axis]: radians } as Vector3Like;
                        onChangeRotation(next);
                      }}
                      className="w-full"
                      style={{ height: '4px' }}
                    />
                    <input
                      key={`${current.id}-rot-${axis}-${Math.round((((rotation[axis] || 0) * 180) / Math.PI) % 360)}`}
                      type="text"
                      inputMode="decimal"
                      pattern="^-?\\d*(\\.\\d+)?$"
                      defaultValue={Math.round((((rotation[axis] || 0) * 180) / Math.PI) % 360)}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                        const degrees = Number.isFinite(parsed) ? parsed : Math.round((((rotation[axis] || 0) * 180) / Math.PI) % 360);
                        const radians = (degrees * Math.PI) / 180;
                        const next = { ...rotation, [axis]: radians } as Vector3Like;
                        onChangeRotation(next);
                      }}
                      className="w-full px-2 py-1.5 text-xs rounded-md bg-black/20 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-black/30 text-center text-white/80 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scale */}
          {canScale && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium tracking-wider uppercase text-white/50">
                  Scale
                </label>
                <button
                  onClick={onResetScale}
                  className="text-[9px] text-white/40 hover:text-white/60 uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={scale.x || 1}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onChangeScale({ x: value, y: value, z: value });
                  }}
                  className="w-full"
                  style={{ height: '4px' }}
                />
                <input
                  key={`${current.id}-scale-${scale.x || 1}`}
                  type="text"
                  inputMode="decimal"
                  pattern="^-?\\d*(\\.\\d+)?$"
                  defaultValue={scale.x || 1}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                    const value = Number.isFinite(parsed) ? parsed : (scale.x || 1);
                    onChangeScale({ x: value, y: value, z: value });
                  }}
                  className="w-full px-2 py-1.5 text-xs rounded-md bg-black/20 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-black/30 text-center text-white/80 transition-colors"
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}


