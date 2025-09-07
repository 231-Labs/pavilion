'use client';

import { useState, useEffect } from 'react';
import { SculptureInstance } from '../types/sculpture';
import { SceneManager } from '../lib/three/SceneManager';
import * as THREE from 'three';

interface SculptureControlPanelProps {
  sculptures: SculptureInstance[];
  sceneManager?: SceneManager;
  onUpdatePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  onUpdateRotation?: (id: string, rotation: { x: number; y: number; z: number }) => void;
  onUpdateScale?: (id: string, scale: { x: number; y: number; z: number }) => void;
}

// Interface for controllable objects
interface ControllableObject {
  id: string;
  name: string;
  type: 'sculpture' | 'external';
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  object?: THREE.Object3D;
}

export function SculptureControlPanel({
  sculptures,
  sceneManager,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale
}: SculptureControlPanelProps) {
  const [selectedSculpture, setSelectedSculpture] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [glbPanelExpanded, setGlbPanelExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [controllableObjects, setControllableObjects] = useState<ControllableObject[]>([]);
  const [walrusBlobId, setWalrusBlobId] = useState<string>('');

  // Update controllable objects list
  useEffect(() => {
    const sculptureObjects: ControllableObject[] = sculptures.map(sculpture => ({
      id: sculpture.config.id,
      name: sculpture.config.name,
      type: 'sculpture' as const,
      position: sculpture.config.position,
      rotation: sculpture.config.rotation,
      scale: sculpture.config.scale,
      object: sculpture.mesh
    }));

    // Get external models from scene - avoid duplicates
    const externalObjects: ControllableObject[] = [];
    const seenIds = new Set<string>();

    if (sceneManager) {
      const scene = sceneManager.getScene();

      // Debug: Log all objects in scene
      const allSceneObjects: string[] = [];
      scene.traverse((child) => {
        if (child.name) {
          allSceneObjects.push(`${child.type}: ${child.name}`);
        }
      });
      console.log('All objects in scene:', allSceneObjects);

      scene.traverse((child) => {
        console.log('Checking object:', child.type, child.name, child instanceof THREE.Group);

        if (child instanceof THREE.Group &&
            child.name &&
            child.parent === scene) {

          const modelId = `external_${child.name}`;

          // Skip if we've already seen this model
          if (seenIds.has(modelId)) {
            console.log('Skipping duplicate model:', child.name);
            return;
          }

          seenIds.add(modelId);
          console.log('Found external model:', child.name);

          externalObjects.push({
            id: modelId,
            name: child.name,
            type: 'external' as const,
            position: { x: child.position.x, y: child.position.y, z: child.position.z },
            rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
            scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
            object: child
          });
        }
      });
    }

    const allObjects = [...sculptureObjects, ...externalObjects];
    setControllableObjects(allObjects);

    // Debug logging
    console.log('SculptureControlPanel - Updated controllable objects:', {
      sculptures: sculptureObjects.length,
      external: externalObjects.length,
      total: allObjects.length,
      externalNames: externalObjects.map(obj => obj.name),
      externalIds: externalObjects.map(obj => obj.id)
    });

    // Auto-select first object if none selected or if selected object no longer exists
    const selectedExists = allObjects.some(obj => obj.id === selectedSculpture);
    if (allObjects.length > 0 && (!selectedSculpture || !selectedExists)) {
      setSelectedSculpture(allObjects[0].id);
    }
  }, [sculptures, sceneManager, loadedModels, selectedSculpture]);

  // (removed) getExternalObjects was unused

  // GLB loading handler functions

  const loadAllModels = async () => {
    if (!sceneManager) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      const res = await fetch('/api/models');
      if (!res.ok) {
        throw new Error('Failed to list models');
      }
      const data: { files?: Array<{ name: string; url: string }>; error?: string } = await res.json();
      const files = data.files || [];

      if (files.length === 0) {
        setError('No models found in /public/models');
        return;
      }

      const modelsToLoad = files.map((file, index) => ({
        url: file.url,
        options: {
          name: file.name.replace(/\.(glb|gltf)$/i, ''),
          position: { x: (index - Math.floor(files.length / 2)) * 2.5, y: 1.5, z: 0 },
        },
      }));

      const groups = await sceneManager.loadMultipleGLBModels(modelsToLoad);
      const modelNames = modelsToLoad.map((m) => (m.options as { name: string }).name);
      setLoadedModels(prev => [...prev, ...modelNames]);
      console.log(`Loaded ${groups.length} models from /public/models`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loading failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalrusModel = async () => {
    if (!sceneManager) return;
    const blobId = walrusBlobId.trim();
    if (!blobId) {
      setError('Please enter a valid Walrus Blob ID');
      return;
    }

    // Limit the number of external models to avoid too many models in the scene
    const externalCount = loadedModels.length;
    if (externalCount >= 10) {
      setError('Too many external models loaded, please clear some models first');
      return;
    }

    const modelName = `Walrus_${blobId.slice(0, 8)}`;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      const url = `/api/walrus/${encodeURIComponent(blobId)}`;
      const model = await sceneManager.loadGLBModel(url, {
        position: { x: 0, y: 2, z: 0 },
        name: modelName,
        onProgress: (progress) => {
          if (progress.lengthComputable) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setLoadingProgress(percent);
          }
        }
      });

      setLoadedModels(prev => [...prev, modelName]);
      console.log('Walrus model loaded successfully:', modelName);
      setWalrusBlobId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Walrus loading failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllModels = () => {
    if (!sceneManager) return;

    // Clear all loaded models from scene
    sceneManager.removeAllLoadedModels();

    // Clear local state
    setLoadedModels([]);
    setError(null);

    // Clear current selection if it's an external model
    if (selectedSculpture && selectedSculpture.startsWith('external_')) {
      setSelectedSculpture(null);
    }

    console.log('All loaded models cleared');
  };

  // Handle external model position updates
  const handleExternalPositionUpdate = (objectId: string, position: { x: number; y: number; z: number }) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.position.set(position.x, position.y, position.z);
      controllableObj.position = position;
      setControllableObjects([...controllableObjects]);
    }
  };

  // Handle external model rotation updates
  const handleExternalRotationUpdate = (objectId: string, rotation: { x: number; y: number; z: number }) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.rotation.set(rotation.x, rotation.y, rotation.z);
      controllableObj.rotation = rotation;
      setControllableObjects([...controllableObjects]);
    }
  };

  // Handle external model scale updates
  const handleExternalScaleUpdate = (objectId: string, scale: { x: number; y: number; z: number }) => {
    const controllableObj = controllableObjects.find(obj => obj.id === objectId);
    if (controllableObj && controllableObj.object) {
      controllableObj.object.scale.set(scale.x, scale.y, scale.z);
      controllableObj.scale = scale;
      setControllableObjects([...controllableObjects]);
    }
  };

  const currentObject = controllableObjects.find(obj => obj.id === selectedSculpture);

  if (!currentObject) {
    return null;
  }

  return (
    <div className="glass-slab glass-slab--thermal rounded-xl control-panel max-w-xs min-w-[320px] overflow-hidden" style={{ fontSize: '14px' }}>
      {/* Title bar */}
      <div
        className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="elegant-title tracking-wider uppercase silver-glow">
          Objects
        </h3>
        <div className="flex items-center space-x-2">
          <span className="elegant-expand-text font-medium tracking-wide">
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
          <span className="elegant-expand-arrow" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Control panel content */}
      {isExpanded && (
        <div className="p-3 space-y-3" style={{ fontSize: '13px' }}>
          {/* Sculpture selector */}
          <div className="space-y-2">
            <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
              Select Object
            </label>
            <select
              value={selectedSculpture || ''}
              onChange={(e) => setSelectedSculpture(e.target.value)}
              className="w-full p-3 rounded-lg bg-transparent border border-white/10 focus:outline-none focus:border-white/40 control-select"
            >
              {/* Group sculptures */}
              {controllableObjects.filter(obj => obj.type === 'sculpture').length > 0 && (
                <optgroup label="🏛️ Sculptures">
                  {controllableObjects
                    .filter(obj => obj.type === 'sculpture')
                    .map(obj => (
                      <option
                        key={obj.id}
                        value={obj.id}
                        className="bg-black text-white"
                      >
                        {obj.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {/* Group external models */}
              {controllableObjects.filter(obj => obj.type === 'external').length > 0 && (
                <optgroup label="📦 External Models">
                  {controllableObjects
                    .filter(obj => obj.type === 'external')
                    .map(obj => (
                      <option
                        key={obj.id}
                        value={obj.id}
                        className="bg-black text-white"
                      >
                        {obj.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Position control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                Position Vector
              </label>
              <button
                onClick={() => {
                  if (currentObject.type === 'sculpture') {
                    onUpdatePosition(currentObject.id, { x: 0, y: 1, z: 0 });
                  } else {
                    handleExternalPositionUpdate(currentObject.id, { x: 0, y: 1, z: 0 });
                  }
                }}
                className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis} className="space-y-1">
                  <label className="block text-sm font-medium tracking-wide text-center control-label-axis">{axis.toUpperCase()}</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={currentObject.position[axis]}
                    onChange={(e) => {
                      const newPosition = { ...currentObject.position, [axis]: parseFloat(e.target.value) };
                      if (currentObject.type === 'sculpture') {
                        onUpdatePosition(currentObject.id, newPosition);
                      } else {
                        handleExternalPositionUpdate(currentObject.id, newPosition);
                      }
                    }}
                    className="w-full"
                    style={{ height: '6px' }}
                  />
                  <input
                    key={`${currentObject.id}-pos-${axis}-${currentObject.position[axis]}`}
                    type="text"
                    inputMode="decimal"
                    pattern="^-?\\d*(\\.\\d+)?$"
                    defaultValue={currentObject.position[axis]}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                      const valueToUse = Number.isFinite(parsed) ? parsed : currentObject.position[axis];
                      const newPosition = { ...currentObject.position, [axis]: valueToUse };
                      if (currentObject.type === 'sculpture') {
                        onUpdatePosition(currentObject.id, newPosition);
                      } else {
                        handleExternalPositionUpdate(currentObject.id, newPosition);
                      }
                    }}
                    className="w-full p-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation control */}
          {((onUpdateRotation && currentObject.type === 'sculpture') || currentObject.type === 'external') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                  Rotation Matrix
                </label>
                <button
                  onClick={() => {
                    if (currentObject.type === 'sculpture' && onUpdateRotation) {
                      onUpdateRotation(currentObject.id, { x: 0, y: 0, z: 0 });
                    } else {
                      handleExternalRotationUpdate(currentObject.id, { x: 0, y: 0, z: 0 });
                    }
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="space-y-1">
                    <label className="block text-sm font-medium tracking-wide text-center control-label-axis">{axis.toUpperCase()}</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={((currentObject.rotation?.[axis] || 0) * 180 / Math.PI) % 360}
                      onChange={(e) => {
                        const degrees = parseFloat(e.target.value);
                        const radians = degrees * Math.PI / 180;
                        const newRotation = { ...currentObject.rotation || { x: 0, y: 0, z: 0 }, [axis]: radians };
                        if (currentObject.type === 'sculpture' && onUpdateRotation) {
                          onUpdateRotation(currentObject.id, newRotation);
                        } else {
                          handleExternalRotationUpdate(currentObject.id, newRotation);
                        }
                      }}
                      className="w-full"
                    />
                    <input
                      key={`${currentObject.id}-rot-${axis}-${Math.round(((currentObject.rotation?.[axis] || 0) * 180 / Math.PI) % 360)}`}
                      type="text"
                      inputMode="decimal"
                      pattern="^-?\\d*(\\.\\d+)?$"
                      defaultValue={Math.round(((currentObject.rotation?.[axis] || 0) * 180 / Math.PI) % 360)}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                        const degrees = Number.isFinite(parsed) ? parsed : Math.round(((currentObject.rotation?.[axis] || 0) * 180 / Math.PI) % 360);
                        const radians = degrees * Math.PI / 180;
                        const newRotation = { ...currentObject.rotation || { x: 0, y: 0, z: 0 }, [axis]: radians };
                        if (currentObject.type === 'sculpture' && onUpdateRotation) {
                          onUpdateRotation(currentObject.id, newRotation);
                        } else {
                          handleExternalRotationUpdate(currentObject.id, newRotation);
                        }
                      }}
                      className="w-full p-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scale control */}
          {((onUpdateScale && currentObject.type === 'sculpture') || currentObject.type === 'external') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                  Scale Factor
                </label>
                <button
                  onClick={() => {
                    if (currentObject.type === 'sculpture' && onUpdateScale) {
                      onUpdateScale(currentObject.id, { x: 1, y: 1, z: 1 });
                    } else {
                      handleExternalScaleUpdate(currentObject.id, { x: 1, y: 1, z: 1 });
                    }
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors cursor-pointer"
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
                  value={currentObject.scale?.x || 1}
                  onChange={(e) => {
                    const scaleValue = parseFloat(e.target.value);
                    const newScale = { x: scaleValue, y: scaleValue, z: scaleValue };
                    if (currentObject.type === 'sculpture' && onUpdateScale) {
                      onUpdateScale(currentObject.id, newScale);
                    } else {
                      handleExternalScaleUpdate(currentObject.id, newScale);
                    }
                  }}
                  className="w-full"
                  style={{ height: '6px' }}
                />
                <input
                  key={`${currentObject.id}-scale-${currentObject.scale?.x || 1}`}
                  type="text"
                  inputMode="decimal"
                  pattern="^-?\\d*(\\.\\d+)?$"
                  defaultValue={currentObject.scale?.x || 1}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const parsed = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : parseFloat(raw);
                    const scaleValue = Number.isFinite(parsed) ? parsed : (currentObject.scale?.x || 1);
                    const newScale = { x: scaleValue, y: scaleValue, z: scaleValue };
                    if (currentObject.type === 'sculpture' && onUpdateScale) {
                      onUpdateScale(currentObject.id, newScale);
                    } else {
                      handleExternalScaleUpdate(currentObject.id, newScale);
                    }
                  }}
                  className="w-full p-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40 text-center"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLB Model Loader Panel */}
      {sceneManager && (
        <>
          <div className="border-t border-white/10"></div>

          {/* GLB Panel Header */}
          <div
            className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
            onClick={() => setGlbPanelExpanded(!glbPanelExpanded)}
          >
            <h3 className="elegant-title tracking-wider uppercase">
              External Models
            </h3>
            <div className="flex items-center space-x-2">
              <span className="elegant-expand-text font-medium tracking-wide">
                {glbPanelExpanded ? 'COLLAPSE' : 'EXPAND'}
              </span>
              <span className="elegant-expand-arrow" style={{ transform: glbPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </div>
          </div>

          {/* GLB Control Panel Content */}
          {glbPanelExpanded && (
            <div className="p-3 space-y-3">
              {/* GLB Loading Buttons */}
              <div className="space-y-2">
                {/* Walrus Blob Loader */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={walrusBlobId}
                    onChange={(e) => setWalrusBlobId(e.target.value)}
                    placeholder="Walrus Blob ID"
                    className="px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40 col-span-1"
                  />
                  <button
                    onClick={loadWalrusModel}
                    disabled={isLoading || !walrusBlobId.trim()}
                    className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white/80 border border-white/20 uppercase tracking-widest transition-colors col-span-1"
                  >
                    {isLoading ? 'Loading...' : 'Load Walrus Blob'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={clearAllModels}
                    className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors"
                  >
                    Clear Models
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={loadAllModels}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white/80 border border-white/20 uppercase tracking-widest transition-colors col-span-2"
                  >
                    {isLoading ? 'Loading...' : 'Load All Models (from /public/models)'}
                  </button>
                </div>
              </div>

              {/* Loading Progress */}
              {isLoading && (
                <div className="space-y-2">
                  <div className="bg-white/10 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center control-label-primary">
                    Loading Progress: {loadingProgress}%
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs">
                  <p>{error}</p>
                </div>
              )}

              {/* Loaded Models List */}
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
      )}
    </div>
  );
}
