'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { SculptureInstance } from '../../types/sculpture';
import { SceneManager } from '../../lib/three/SceneManager';
import { ControllableObject as ControllableObjectType } from '../../types/controlPanel';
import { KioskNftItemsSection } from './sections/KioskNftItemsSection';
import { ObjectSelector } from './sections/ObjectSelector';
import { TransformControlsSection } from './sections/TransformControlsSection';
import { useModelLoader } from '../../hooks/scene/useModelLoader';
import { useNftItemsManager } from '../../hooks/kiosk/useNftItemsManager';
import { useTransformControls } from '../../hooks/scene/useTransformControls';
import { kioskModelName, withKioskModelGroup } from '../../utils/sculptureHelpers';

interface SculptureControlPanelProps {
  sculptures: SculptureInstance[];
  sceneManager?: SceneManager;
  onUpdatePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  onUpdateRotation?: (id: string, rotation: { x: number; y: number; z: number }) => void;
  onUpdateScale?: (id: string, scale: { x: number; y: number; z: number }) => void;
  autoLoadBlobIds?: string[];
  kioskItems?: any[];
  kioskId?: string;
  kioskOwnerCapId?: string;
  onTrackChange?: (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => void;
  initialDisplayedItems?: Set<string>;
  initialTransforms?: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onListItems?: (items: Array<{ itemId: string; price: string }>) => Promise<void>;
  onDelistItem?: (itemId: string, itemType: string) => Promise<void>;
  mistToSui?: (mistAmount: string | number) => number;
}

interface ControllableObject extends ControllableObjectType {
  object?: THREE.Object3D;
}

export function SculptureControlPanel({
  sculptures,
  sceneManager,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  autoLoadBlobIds = [],
  kioskItems = [],
  onTrackChange,
  initialDisplayedItems,
  initialTransforms,
  onLoadingStateChange,
  onListItems,
  onDelistItem,
  mistToSui
}: SculptureControlPanelProps) {
  // UI state
  const [selectedSculpture, setSelectedSculpture] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [controllableObjects, setControllableObjects] = useState<ControllableObject[]>([]);
  const [activeTab, setActiveTab] = useState<'kiosk' | 'objects'>('kiosk');

  // Use model loader hook
  const modelLoader = useModelLoader(sceneManager);

  // Use NFT items manager hook
  const nftManager = useNftItemsManager({
    sceneManager,
    kioskItems,
    initialDisplayedItems,
    initialTransforms,
    onTrackChange,
    isLoading: modelLoader.isLoading,
    setIsLoading: modelLoader.setIsLoading,
    loadingProgress: modelLoader.loadingProgress,
    setLoadingProgress: modelLoader.setLoadingProgress,
    loadedModels: modelLoader.loadedModels,
    setLoadedModels: modelLoader.setLoadedModels,
    setError: modelLoader.setError,
  });

  // Use transform controls hook
  const transformControls = useTransformControls();

  // Normalize loading state
  useEffect(() => {
    if (!nftManager.displayedNftItems.size && modelLoader.isLoading) {
      modelLoader.setIsLoading(false);
    }
  }, [nftManager.displayedNftItems, modelLoader.isLoading]);

  // Report loading state changes
  useEffect(() => {
    onLoadingStateChange?.(modelLoader.isLoading);
  }, [modelLoader.isLoading, onLoadingStateChange]);

  // Set default tab on first load based on available content
  useEffect(() => {
    // Only auto-switch on initial load when default tab has no content
    if (activeTab === 'kiosk' && nftManager.kioskNftItems.length === 0 && controllableObjects.length > 0) {
      setActiveTab('objects');
    }
  }, []);  // Empty dependency array - only runs once on mount

  // Auto-load blob IDs
  useEffect(() => {
    if (autoLoadBlobIds.length > 0 && sceneManager && !modelLoader.isLoading) {
      const loadBlobIdsSequentially = async () => {
        for (const blobId of autoLoadBlobIds) {
          if (!blobId || typeof blobId !== 'string' || !blobId.trim()) {
            continue;
          }

          const modelName = `Walrus_${blobId.slice(0, 8)}`;
          if (modelLoader.loadedModels.includes(modelName)) {
            continue;
          }

          modelLoader.setWalrusBlobId(blobId);
          await modelLoader.loadWalrusModel(blobId);
        }
      };

      loadBlobIdsSequentially();
    }
  }, [autoLoadBlobIds, sceneManager, modelLoader.isLoading, modelLoader.loadedModels, modelLoader.loadWalrusModel]);

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

    const externalObjects: ControllableObject[] = [];
    const seenIds = new Set<string>();

    if (sceneManager) {
      const scene = sceneManager.getScene();
      if (scene) {
        try {
          scene.traverse((child) => {
            if (child instanceof THREE.Group &&
                child.name &&
                child.parent === scene) {

              if (child.name.startsWith('KioskNFT_')) {
                return;
              }

              const modelId = `external_${child.name}`;

              if (seenIds.has(modelId)) {
                return;
              }

              seenIds.add(modelId);

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
        } catch (error) {
          console.warn('Error traversing scene for external objects:', error);
        }
      }
    }

    const allObjects = [...sculptureObjects, ...externalObjects];
    setControllableObjects(allObjects);

    // Auto-select first object
    const selectedExistsInControllableObjects = allObjects.some(obj => obj.id === selectedSculpture);
    const displayedKioskNftItems = nftManager.kioskNftItems.filter(item => 
      nftManager.displayedNftItems.has(item.id)
    );
    const selectedExistsInKioskNfts = displayedKioskNftItems.some(item => item.id === selectedSculpture);

    if (!selectedSculpture || (!selectedExistsInControllableObjects && !selectedExistsInKioskNfts)) {
      if (allObjects.length > 0) {
        setSelectedSculpture(allObjects[0].id);
      } else if (displayedKioskNftItems.length > 0) {
        setSelectedSculpture(displayedKioskNftItems[0].id);
      }
    }
  }, [sculptures, sceneManager, modelLoader.loadedModels, selectedSculpture, nftManager.kioskNftItems, nftManager.displayedNftItems]);

  // Find current object
  const currentObject = controllableObjects.find(obj => obj.id === selectedSculpture);
  const currentNftItem = nftManager.kioskNftItems
    .filter(item => nftManager.displayedNftItems.has(item.id))
    .find(item => item.id === selectedSculpture);

  // Create unified controllable object
  const currentControllableObject = currentObject || (currentNftItem ? {
    id: currentNftItem.id,
    name: kioskModelName(currentNftItem.name, currentNftItem.id),
    type: 'kiosk_nft' as const,
    ...(nftManager.kioskNftTransforms.get(currentNftItem.id) || {
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }),
    object: null
  } : null);

  return (
    <div className="glass-slab glass-slab--thermal rounded-xl control-panel max-w-xs min-w-[320px] overflow-hidden" style={{ fontSize: '14px' }}>
      {/* Title bar */}
      <div
        className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="elegant-title tracking-wider uppercase silver-glow">
          Scene
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
        <div className="space-y-3" style={{ fontSize: '13px' }}>
          {/* Tab Navigation */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('kiosk')}
              className={`relative flex-1 py-3 px-4 text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                activeTab === 'kiosk'
                  ? 'text-white/85'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Assets
              {nftManager.kioskNftItems.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === 'kiosk' ? 'bg-white/15' : 'bg-white/10'
                }`}>
                  {nftManager.kioskNftItems.length}
                </span>
              )}
              {activeTab === 'kiosk' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/0 via-white/50 to-white/0"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('objects')}
              className={`relative flex-1 py-3 px-4 text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                activeTab === 'objects'
                  ? 'text-white/85'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Editor
              {controllableObjects.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full ${
                  activeTab === 'objects' ? 'bg-white/15' : 'bg-white/10'
                }`}>
                  {controllableObjects.length}
                </span>
              )}
              {activeTab === 'objects' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/0 via-white/50 to-white/0"></div>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-2 px-3 pb-3">
            {/* Assets Tab */}
            {activeTab === 'kiosk' && (
              nftManager.kioskNftItems.length > 0 ? (
                <KioskNftItemsSection
                  items={nftManager.kioskNftItems}
                  displayedItemIds={nftManager.displayedNftItems}
                  isLoading={modelLoader.isLoading}
                  loadingProgress={modelLoader.loadingProgress}
                  loadingItemId={selectedSculpture}
                  onToggleItem={nftManager.handleNftItemDisplayToggle}
                  onListItems={onListItems}
                  onDelistItem={onDelistItem}
                  mistToSui={mistToSui}
                />
              ) : (
                <div className="text-xs text-white/50 text-center py-8">
                  No assets available
                </div>
              )
            )}

            {/* Editor Tab */}
            {activeTab === 'objects' && (
              <div className="space-y-3">
                {controllableObjects.length > 0 || nftManager.displayedNftItems.size > 0 ? (
                  <>
                    <ObjectSelector
                      selectedId={selectedSculpture}
                      onChangeSelected={(id) => setSelectedSculpture(id)}
                      displayedKioskItems={nftManager.kioskNftItems.filter((nftItem) => 
                        nftManager.displayedNftItems.has(nftItem.id)
                      )}
                      controllableObjects={controllableObjects}
                    />
                    
                    {/* Transform controls */}
                    {currentControllableObject && (
                      <TransformControlsSection
                        current={currentControllableObject as any}
                        canRotate={(!!onUpdateRotation && currentControllableObject.type === 'sculpture') || 
                                   currentControllableObject.type === 'external' || 
                                   currentControllableObject.type === 'kiosk_nft'}
                        canScale={(!!onUpdateScale && currentControllableObject.type === 'sculpture') || 
                                  currentControllableObject.type === 'external' || 
                                  currentControllableObject.type === 'kiosk_nft'}
                        onResetAll={() => {
                          if (currentControllableObject.type === 'sculpture') {
                            onUpdatePosition?.(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                            onUpdateRotation?.(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                            onUpdateScale?.(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                          } else if (currentControllableObject.type === 'kiosk_nft') {
                            const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                            withKioskModelGroup(sceneManager, modelName, (child) => {
                              child.position.set(0, 2, 0);
                              child.rotation.set(0, 0, 0);
                              child.scale.set(1, 1, 1);
                            }, 'Error resetting Kiosk NFT transforms:');
                            nftManager.setKioskNftTransforms(prev => {
                              const newMap = new Map(prev);
                              newMap.set(currentControllableObject.id, {
                                position: { x: 0, y: 2, z: 0 },
                                rotation: { x: 0, y: 0, z: 0 },
                                scale: { x: 1, y: 1, z: 1 }
                              });
                              return newMap;
                            });
                          } else {
                            transformControls.handleExternalPositionUpdate(
                              currentControllableObject.id, 
                              { x: 0, y: 1, z: 0 }, 
                              controllableObjects, 
                              setControllableObjects
                            );
                            transformControls.handleExternalRotationUpdate(
                              currentControllableObject.id, 
                              { x: 0, y: 0, z: 0 }, 
                              controllableObjects, 
                              setControllableObjects
                            );
                            transformControls.handleExternalScaleUpdate(
                              currentControllableObject.id, 
                              { x: 1, y: 1, z: 1 }, 
                              controllableObjects, 
                              setControllableObjects
                            );
                          }
                        }}
                        onChangePosition={(newPosition) => {
                          if (currentControllableObject.type === 'sculpture') {
                            onUpdatePosition(currentControllableObject.id, newPosition);
                          } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.position.set(newPosition.x, newPosition.y, newPosition.z);
                  }, 'Error updating Kiosk NFT position:');
                  nftManager.setKioskNftTransforms(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(currentControllableObject.id) || { 
                      position: { x: 0, y: 2, z: 0 }, 
                      rotation: { x: 0, y: 0, z: 0 }, 
                      scale: { x: 1, y: 1, z: 1 } 
                    };
                    newMap.set(currentControllableObject.id, {
                      ...current,
                      position: newPosition
                    });
                    return newMap;
                  });
                } else {
                  transformControls.handleExternalPositionUpdate(
                    currentControllableObject.id, 
                    newPosition, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
              onResetPosition={() => {
                if (currentControllableObject.type === 'sculpture') {
                  onUpdatePosition(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.position.set(0, 2, 0);
                  }, 'Error resetting Kiosk NFT position:');
                  nftManager.setKioskNftTransforms(prev => {
                    const newMap = new Map(prev);
                    newMap.set(currentControllableObject.id, {
                      position: { x: 0, y: 2, z: 0 },
                      rotation: newMap.get(currentControllableObject.id)?.rotation || { x: 0, y: 0, z: 0 },
                      scale: newMap.get(currentControllableObject.id)?.scale || { x: 1, y: 1, z: 1 }
                    });
                    return newMap;
                  });
                } else {
                  transformControls.handleExternalPositionUpdate(
                    currentControllableObject.id, 
                    { x: 0, y: 1, z: 0 }, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
              onChangeRotation={(newRotation) => {
                if (currentControllableObject.type === 'sculpture' && onUpdateRotation) {
                  onUpdateRotation(currentControllableObject.id, newRotation);
                } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.rotation.set(newRotation.x, newRotation.y, newRotation.z);
                  }, 'Error updating Kiosk NFT rotation:');
                  nftManager.setKioskNftTransforms(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(currentControllableObject.id) || { 
                      position: { x: 0, y: 2, z: 0 }, 
                      rotation: { x: 0, y: 0, z: 0 }, 
                      scale: { x: 1, y: 1, z: 1 } 
                    };
                    newMap.set(currentControllableObject.id, {
                      ...current,
                      rotation: newRotation
                    });
                    return newMap;
                  });
                } else {
                  transformControls.handleExternalRotationUpdate(
                    currentControllableObject.id, 
                    newRotation, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
              onResetRotation={() => {
                if (currentControllableObject.type === 'sculpture' && onUpdateRotation) {
                  onUpdateRotation(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.rotation.set(0, 0, 0);
                  }, 'Error resetting Kiosk NFT rotation:');
                } else {
                  transformControls.handleExternalRotationUpdate(
                    currentControllableObject.id, 
                    { x: 0, y: 0, z: 0 }, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
              onChangeScale={(newScale) => {
                if (currentControllableObject.type === 'sculpture' && onUpdateScale) {
                  onUpdateScale(currentControllableObject.id, newScale);
                } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.scale.set(newScale.x, newScale.y, newScale.z);
                  }, 'Error updating Kiosk NFT scale:');
                  nftManager.setKioskNftTransforms(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(currentControllableObject.id) || { 
                      position: { x: 0, y: 2, z: 0 }, 
                      rotation: { x: 0, y: 0, z: 0 }, 
                      scale: { x: 1, y: 1, z: 1 } 
                    };
                    newMap.set(currentControllableObject.id, {
                      ...current,
                      scale: newScale
                    });
                    return newMap;
                  });
                } else {
                  transformControls.handleExternalScaleUpdate(
                    currentControllableObject.id, 
                    newScale, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
              onResetScale={() => {
                if (currentControllableObject.type === 'sculpture' && onUpdateScale) {
                  onUpdateScale(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                } else if (currentControllableObject.type === 'kiosk_nft') {
                  const modelName = kioskModelName(currentNftItem!.name, currentNftItem!.id);
                  withKioskModelGroup(sceneManager, modelName, (child) => {
                    child.scale.set(1, 1, 1);
                  }, 'Error resetting Kiosk NFT scale:');
                  nftManager.setKioskNftTransforms(prev => {
                    const newMap = new Map(prev);
                    newMap.set(currentControllableObject.id, {
                      position: newMap.get(currentControllableObject.id)?.position || { x: 0, y: 2, z: 0 },
                      rotation: newMap.get(currentControllableObject.id)?.rotation || { x: 0, y: 0, z: 0 },
                      scale: { x: 1, y: 1, z: 1 }
                    });
                    return newMap;
                  });
                } else {
                  transformControls.handleExternalScaleUpdate(
                    currentControllableObject.id, 
                    { x: 1, y: 1, z: 1 }, 
                    controllableObjects, 
                    setControllableObjects
                  );
                }
              }}
            />
                    )}
                  </>
                ) : (
                  <div className="text-xs text-white/50 text-center py-8">
                    No items in scene
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

