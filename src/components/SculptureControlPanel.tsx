'use client';

import { useState, useEffect } from 'react';
import { SculptureInstance } from '../types/sculpture';
import { SceneManager } from '../lib/three/SceneManager';
import * as THREE from 'three';
import { KioskNftItemsSection } from './controlPanel/KioskNftItemsSection';
import { ObjectSelector } from './controlPanel/ObjectSelector';
import { TransformControlsSection } from './controlPanel/TransformControlsSection';
import { ExternalModelsSection } from './controlPanel/ExternalModelsSection';
import { ControllableObject as ControllableObjectType } from '../types/controlPanel';

interface SculptureControlPanelProps {
  sculptures: SculptureInstance[];
  sceneManager?: SceneManager;
  onUpdatePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  onUpdateRotation?: (id: string, rotation: { x: number; y: number; z: number }) => void;
  onUpdateScale?: (id: string, scale: { x: number; y: number; z: number }) => void;
  autoLoadBlobIds?: string[]; // Blob IDs to auto-load from kiosk items
  kioskItems?: any[]; // Kiosk items from the current kiosk
  kioskId?: string; // Current kiosk ID (for future use)
  kioskOwnerCapId?: string; // Current kiosk owner cap ID (for future use)
  // Change tracking props
  onTrackChange?: (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => void;
  // Scene restoration props
  initialDisplayedItems?: Set<string>; // Items that should be displayed based on loaded scene config
  initialTransforms?: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>; // Initial transforms from loaded scene config
  // Loading state callback
  onLoadingStateChange?: (isLoading: boolean) => void; // Callback to report auto-loading state
}

// Interface for controllable objects
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
  onLoadingStateChange
}: SculptureControlPanelProps) {
  const [selectedSculpture, setSelectedSculpture] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [glbPanelExpanded, setGlbPanelExpanded] = useState(false);
  const [transformControlsExpanded, setTransformControlsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [controllableObjects, setControllableObjects] = useState<ControllableObject[]>([]);
  const [walrusBlobId, setWalrusBlobId] = useState<string>('');
  const [kioskNftItems, setKioskNftItems] = useState<any[]>([]);
  const [displayedNftItems, setDisplayedNftItems] = useState<Set<string>>(new Set());
  const [kioskNftTransforms, setKioskNftTransforms] = useState<Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>>(new Map());

  // Report loading state changes to parent
  useEffect(() => {
    onLoadingStateChange?.(isLoading);
    console.log(`🎨 SculptureControlPanel loading state changed: ${isLoading}`);
  }, [isLoading, onLoadingStateChange]);

  // Sync initial state from loaded scene config
  useEffect(() => {
    if (initialDisplayedItems && initialDisplayedItems.size > 0) {
      console.log('🔄 Syncing initial displayed items from scene config:', initialDisplayedItems);
      setDisplayedNftItems(new Set(initialDisplayedItems));
    }
    if (initialTransforms) {
      console.log('🔄 Syncing initial transforms from scene config:', initialTransforms);
      setKioskNftTransforms(new Map(initialTransforms));
    }
  }, [initialDisplayedItems, initialTransforms]);

  // Auto-load models for items that should be displayed (from scene config)
  useEffect(() => {
    const autoLoadDisplayedModels = async () => {
      console.log('🔍 Checking auto-load conditions:', {
        sceneManager: !!sceneManager,
        displayedNftItems: displayedNftItems.size,
        kioskNftItems: kioskNftItems.length,
        isLoading,
      });

      if (!sceneManager) {
        console.log('⏸️ SceneManager not available yet');
        return;
      }
      
      if (displayedNftItems.size === 0) {
        console.log('⏸️ No displayed NFT items to load');
        // Clear loading if no items to display
        if (isLoading) {
          console.log('✅ No items to load, clearing loading state');
          setIsLoading(false);
        }
        return;
      }
      
      if (kioskNftItems.length === 0) {
        console.log('⏸️ Kiosk NFT items not available yet');
        return;
      }

      // Find items that should be displayed but models aren't loaded yet
      const itemsToLoad = kioskNftItems.filter(nftItem => {
        const itemId = nftItem.id;
        const modelName = `KioskNFT_${nftItem.name}_${itemId.slice(-8)}`;
        return displayedNftItems.has(itemId) && !loadedModels.includes(modelName);
      });

      console.log('📋 Items analysis:', {
        shouldDisplay: displayedNftItems.size,
        availableItems: kioskNftItems.length,
        itemsToLoad: itemsToLoad.length,
        alreadyLoaded: loadedModels.length
      });

      if (itemsToLoad.length === 0) {
        console.log('✅ All displayed models are already loaded');
        // Clear loading since everything is loaded
        if (isLoading) {
          console.log('✅ All models loaded, clearing loading state');
          setIsLoading(false);
        }
        return;
      }

      // Prevent starting new loading if already loading the same items
      if (isLoading) {
        console.log('⏸️ Already loading, waiting for current operation to complete');
        return;
      }

      console.log(`🚀 Auto-loading ${itemsToLoad.length} models that should be displayed:`, 
        itemsToLoad.map(item => item.name));

      // Load models one by one to avoid overwhelming the system
      for (const nftItem of itemsToLoad) {
        const itemId = nftItem.id;
        const modelName = `KioskNFT_${nftItem.name}_${itemId.slice(-8)}`;
        
        // Double-check it's not loaded (in case of race conditions)
        if (loadedModels.includes(modelName)) continue;

        try {
          console.log(`📦 Loading model for ${nftItem.name}...`);
          
          setIsLoading(true);
          setError(null);
          setLoadingProgress(0);

          const url = `/api/walrus/${encodeURIComponent(nftItem.blobId)}`;
          
          await sceneManager.loadGLBModel(url, {
            name: modelName,
            position: kioskNftTransforms.get(itemId)?.position || { x: 0, y: 0, z: 0 },
            rotation: kioskNftTransforms.get(itemId)?.rotation || { x: 0, y: 0, z: 0 },
            scale: kioskNftTransforms.get(itemId)?.scale || { x: 1, y: 1, z: 1 },
            onProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setLoadingProgress(percent);
            }
          });

          // Update loaded models list
          setLoadedModels(prev => [...prev, modelName]);
          console.log(`✅ Successfully loaded model: ${modelName}`);

          // Small delay between loads to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Failed to load model for ${nftItem.name}:`, error);
          setError(`Failed to load ${nftItem.name}: ${error}`);
        }
      }

      setIsLoading(false);
      setLoadingProgress(0);
      console.log('🎉 Finished auto-loading displayed models');
    };

    // Add a small delay to ensure all state is settled
    const timeoutId = setTimeout(autoLoadDisplayedModels, 500);
    return () => clearTimeout(timeoutId);
  }, [displayedNftItems, kioskNftItems, loadedModels, sceneManager, isLoading, kioskNftTransforms]);

  // Extract NFT items with glb_file from kiosk items
  useEffect(() => {
    if (kioskItems.length > 0) {
      const nftItems = kioskItems
        .filter((item: any) => {
          // Check if item has display data with glb_file
          const displayData = item.data?.display?.data;
          if (displayData && typeof displayData === 'object') {
            return displayData.glb_file || displayData.blob_id || displayData.walrus_blob_id;
          }

          // Check if item has content fields with glb_file
          const contentFields = item.data?.content?.fields;
          if (contentFields && typeof contentFields === 'object') {
            return contentFields.glb_file || contentFields.blob_id || contentFields.walrus_blob_id;
          }

          return false;
        })
        .map((item: any) => {
          const displayData = item.data?.display?.data || {};
          const contentFields = item.data?.content?.fields || {};

          // Extract name from display data or content fields
          const name = displayData.name || contentFields.name || `NFT ${item.objectId.slice(-8)}`;

          // Extract blob ID from various possible fields
          const blobId = displayData.glb_file || displayData.blob_id || displayData.walrus_blob_id ||
                        contentFields.glb_file || contentFields.blob_id || contentFields.walrus_blob_id;

          return {
            id: item.objectId,
            name,
            blobId,
            displayData,
            contentFields,
            fullItem: item
          };
        });

      // console.log('Found NFT items with 3D models:', nftItems.length);
      setKioskNftItems(nftItems);
    } else {
      setKioskNftItems([]);
    }
  }, [kioskItems]);

  // Auto-load blob IDs from kiosk items
  useEffect(() => {
    if (autoLoadBlobIds.length > 0 && sceneManager && !isLoading) {
      // console.log('Auto-loading blob IDs from kiosk items:', autoLoadBlobIds);

      // Load each blob ID sequentially to avoid overwhelming the system
      const loadBlobIdsSequentially = async () => {
        for (const blobId of autoLoadBlobIds) {
          // Skip if blobId is not a valid string
          if (!blobId || typeof blobId !== 'string' || !blobId.trim()) {
            // console.log('Skipping invalid blob ID:', blobId);
            continue;
          }

          // Check if this blob ID is already loaded
          const modelName = `Walrus_${blobId.slice(0, 8)}`;
          if (loadedModels.includes(modelName)) {
            // console.log(`Blob ID ${blobId} already loaded as ${modelName}`);
            continue;
          }

          // console.log(`Auto-loading blob ID: ${blobId}`);
          setWalrusBlobId(blobId);
          await loadWalrusModel();
        }
      };

      loadBlobIdsSequentially();
    }
  }, [autoLoadBlobIds, sceneManager, isLoading, loadedModels]);

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
      if (!scene) return;

      // Debug: Log all objects in scene
      const allSceneObjects: string[] = [];
      try {
        scene.traverse((child) => {
          if (child && child.name) {
            allSceneObjects.push(`${child.type}: ${child.name}`);
          }
        });
      } catch (error) {
        console.warn('Error traversing scene for logging:', error);
      }
      // console.log('All objects in scene:', allSceneObjects);

      try {
        scene.traverse((child) => {
        // console.log('Checking object:', child.type, child.name, child instanceof THREE.Group);

        if (child instanceof THREE.Group &&
            child.name &&
            child.parent === scene) {

          // Skip Kiosk NFT models - they should not be in external models
          if (child.name.startsWith('KioskNFT_')) {
            // console.log('Skipping Kiosk NFT model:', child.name);
            return;
          }

          const modelId = `external_${child.name}`;

          // Skip if we've already seen this model
          if (seenIds.has(modelId)) {
            // console.log('Skipping duplicate model:', child.name);
            return;
          }

          seenIds.add(modelId);
          // console.log('Found external model:', child.name);

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

    const allObjects = [...sculptureObjects, ...externalObjects];
    setControllableObjects(allObjects);

    // Debug logging
    // console.log('SculptureControlPanel - Updated controllable objects:', {
    //   sculptures: sculptureObjects.length,
    //   external: externalObjects.length,
    //   total: allObjects.length,
    //   externalNames: externalObjects.map(obj => obj.name),
    //   externalIds: externalObjects.map(obj => obj.id)
    // });

    // Auto-select first object if none selected or if selected object no longer exists
    const selectedExistsInControllableObjects = allObjects.some(obj => obj.id === selectedSculpture);
    const displayedKioskNftItems = kioskNftItems.filter(item => displayedNftItems.has(item.id));
    const selectedExistsInKioskNfts = displayedKioskNftItems.some(item => item.id === selectedSculpture);

    // Only auto-select if selected object doesn't exist in either controllable objects or kiosk NFTs
    if (!selectedSculpture || (!selectedExistsInControllableObjects && !selectedExistsInKioskNfts)) {
      if (allObjects.length > 0) {
        setSelectedSculpture(allObjects[0].id);
      } else if (displayedKioskNftItems.length > 0) {
        setSelectedSculpture(displayedKioskNftItems[0].id);
      }
    }
  }, [sculptures, sceneManager, loadedModels, selectedSculpture, kioskNftItems, displayedNftItems]);

  // (removed) getExternalObjects was unused

  // GLB loading handler functions

  const loadAllModels = async () => {
    if (!sceneManager) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    // TODO: turn this into a walrus uploader later
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

      await sceneManager.loadMultipleGLBModels(modelsToLoad);
      const modelNames = modelsToLoad.map((m) => (m.options as { name: string }).name);
      setLoadedModels(prev => [...prev, ...modelNames]);
      // console.log(`Loaded ${groups.length} models from /public/models`);
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
      await sceneManager.loadGLBModel(url, {
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
      // console.log('Walrus model loaded successfully:', modelName);
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

    // console.log('All loaded models cleared');
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


  // Handle NFT item display toggle
  const handleNftItemDisplayToggle = async (nftItem: any, show: boolean) => {
    if (!sceneManager) return;

    const itemId = nftItem.id;
    const modelName = `KioskNFT_${nftItem.name}_${itemId.slice(-8)}`;
    const wasDisplayed = displayedNftItems.has(itemId);

    // Track the change
    onTrackChange?.(itemId, nftItem.name, 'displayed', wasDisplayed, show);

    if (show) {
      // Add to displayed items
      setDisplayedNftItems(prev => new Set([...prev, itemId]));

      // Auto-select this NFT item to show controls
      setSelectedSculpture(itemId);

      // Check if model is already loaded
      if (loadedModels.includes(modelName)) {
        // console.log(`NFT model ${modelName} already loaded`);
        return;
      }

      // Load from Walrus
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);

      try {
        const url = `/api/walrus/${encodeURIComponent(nftItem.blobId)}`;
        // console.log(`Loading NFT model from Walrus: ${url}`);

        // Use stored transform if available, otherwise use default position
        const storedTransform = kioskNftTransforms.get(nftItem.id);
        const position = storedTransform?.position || { x: 0, y: 2, z: 0 };

        // console.log(`Loading NFT model at position:`, position);

        await sceneManager.loadGLBModel(url, {
          position: position,
          name: modelName,
          onProgress: (progress) => {
            if (progress.lengthComputable) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setLoadingProgress(percent);
            }
          }
        });

        // After loading, apply stored rotation and scale if available
        if (storedTransform) {
          const scene = sceneManager.getScene();
          if (scene) {
            try {
              scene.traverse((child) => {
                if (child && child.name === modelName && child instanceof THREE.Group) {
                  if (storedTransform.rotation) {
                    child.rotation.set(
                      storedTransform.rotation.x,
                      storedTransform.rotation.y,
                      storedTransform.rotation.z
                    );
                  }
                  if (storedTransform.scale) {
                    child.scale.set(
                      storedTransform.scale.x,
                      storedTransform.scale.y,
                      storedTransform.scale.z
                    );
                  }
                  // console.log(`Applied stored transforms to ${modelName}:`, storedTransform);
                }
              });
            } catch (error) {
              console.warn('Error applying stored transforms:', error);
            }
          }
        }

        setLoadedModels(prev => [...prev, modelName]);
        // console.log(`NFT model loaded successfully: ${modelName}`);

        // Initialize transforms if not already stored
        if (!kioskNftTransforms.has(nftItem.id)) {
          setKioskNftTransforms(prev => {
            const newMap = new Map(prev);
            newMap.set(nftItem.id, {
              position: { x: 0, y: 2, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 }
            });
            return newMap;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load NFT model from Walrus');
        // Remove from displayed items on error
        setDisplayedNftItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        // Clear selection on error
        setSelectedSculpture(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Hide/remove from scene
      setDisplayedNftItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      // If this was the currently selected item, clear the selection
      if (selectedSculpture === itemId) {
        setSelectedSculpture(null);
      }

      // Remove model from scene if it exists
      if (loadedModels.includes(modelName)) {
        // Find and remove the model from scene
        const scene = sceneManager.getScene();
        if (scene) {
          try {
            scene.traverse((child) => {
              if (child && child.name === modelName && child.parent) {
                child.parent.remove(child);
                // console.log(`Removed NFT model: ${modelName}`);
              }
            });
          } catch (error) {
            console.warn('Error removing model from scene:', error);
          }
        }
        setLoadedModels(prev => prev.filter(name => name !== modelName));
      }
    }
  };

  // Find current object - could be sculpture, external model, or kiosk NFT
  const currentObject = controllableObjects.find(obj => obj.id === selectedSculpture);
  const currentNftItem = kioskNftItems
    .filter(item => displayedNftItems.has(item.id))
    .find(item => item.id === selectedSculpture);

  // Create a unified object for controls
  const currentControllableObject = currentObject || (currentNftItem ? {
    id: currentNftItem.id,
    name: `KioskNFT_${currentNftItem.name}_${currentNftItem.id.slice(-8)}`,
    type: 'kiosk_nft' as const,
    ...(kioskNftTransforms.get(currentNftItem.id) || {
      position: { x: 0, y: 2, z: 0 }, // Default position for kiosk NFTs
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    }),
    object: null // Will be set when loaded
  } : null);



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
          {/* Kiosk NFT Items Section */}
          {kioskNftItems.length > 0 && (
            <KioskNftItemsSection
              items={kioskNftItems}
              displayedItemIds={displayedNftItems}
              isLoading={isLoading}
              loadingProgress={loadingProgress}
              loadingItemId={selectedSculpture}
              onToggleItem={handleNftItemDisplayToggle}
            />
          )}

          {/* Sculpture selector */}
          <ObjectSelector
            selectedId={selectedSculpture}
            onChangeSelected={(id) => setSelectedSculpture(id)}
            displayedKioskItems={kioskNftItems.filter((nftItem) => displayedNftItems.has(nftItem.id))}
            controllableObjects={controllableObjects}
          />

          {/* When an object is selected, show controls; else show empty state */}
          {currentControllableObject ? (
            <TransformControlsSection
              expanded={transformControlsExpanded}
              onToggleExpanded={() => setTransformControlsExpanded(!transformControlsExpanded)}
              current={currentControllableObject as any}
              canRotate={(!!onUpdateRotation && currentControllableObject.type === 'sculpture') || currentControllableObject.type === 'external' || currentControllableObject.type === 'kiosk_nft'}
              canScale={(!!onUpdateScale && currentControllableObject.type === 'sculpture') || currentControllableObject.type === 'external' || currentControllableObject.type === 'kiosk_nft'}
              onResetAll={() => {
                          if (currentControllableObject.type === 'sculpture') {
                            onUpdatePosition?.(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                            onUpdateRotation?.(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                            onUpdateScale?.(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                          } else if (currentControllableObject.type === 'kiosk_nft') {
                            const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                            const scene = sceneManager?.getScene();
                            if (scene) {
                              try {
                                scene.traverse((child) => {
                                  if (child && child.name === modelName && child instanceof THREE.Group) {
                                    child.position.set(0, 2, 0);
                                    child.rotation.set(0, 0, 0);
                                    child.scale.set(1, 1, 1);
                                  }
                                });
                              } catch (error) {
                                console.warn('Error resetting Kiosk NFT transforms:', error);
                              }
                            }
                            setKioskNftTransforms(prev => {
                              const newMap = new Map(prev);
                              newMap.set(currentControllableObject.id, {
                                position: { x: 0, y: 2, z: 0 },
                                rotation: { x: 0, y: 0, z: 0 },
                                scale: { x: 1, y: 1, z: 1 }
                              });
                              return newMap;
                            });
                          } else {
                            handleExternalPositionUpdate(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                            handleExternalRotationUpdate(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                            handleExternalScaleUpdate(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                          }
                        }}
              onChangePosition={(newPosition) => {
                                if (currentControllableObject.type === 'sculpture') {
                                  onUpdatePosition(currentControllableObject.id, newPosition);
                                } else if (currentControllableObject.type === 'kiosk_nft') {
                                  const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                  const scene = sceneManager?.getScene();
                                  if (scene) {
                                    try {
                                      scene.traverse((child) => {
                                        if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.position.set(newPosition.x, newPosition.y, newPosition.z);
                                        }
                                      });
                                    } catch (error) {
                                      console.warn('Error updating Kiosk NFT position:', error);
                                    }
                                  }
                                  setKioskNftTransforms(prev => {
                                    const newMap = new Map(prev);
                                    const current = newMap.get(currentControllableObject.id) || { position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
                                    newMap.set(currentControllableObject.id, {
                                      ...current,
                                      position: newPosition
                                    });
                                    return newMap;
                                  });
                                } else {
                                  handleExternalPositionUpdate(currentControllableObject.id, newPosition);
                                }
                              }}
              onResetPosition={() => {
                                if (currentControllableObject.type === 'sculpture') {
                  onUpdatePosition(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                                } else if (currentControllableObject.type === 'kiosk_nft') {
                                  const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                  const scene = sceneManager?.getScene();
                                  if (scene) {
                                    try {
                                      scene.traverse((child) => {
                                        if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.position.set(0, 2, 0);
                                        }
                                      });
                                    } catch (error) {
                      console.warn('Error resetting Kiosk NFT position:', error);
                                    }
                                  }
                                  setKioskNftTransforms(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(currentControllableObject.id, {
                      position: { x: 0, y: 2, z: 0 },
                      rotation: newMap.get(currentControllableObject.id)?.rotation || { x: 0, y: 0, z: 0 },
                                    scale: newMap.get(currentControllableObject.id)?.scale || { x: 1, y: 1, z: 1 }
                                  });
                                  return newMap;
                                });
                              } else {
                  handleExternalPositionUpdate(currentControllableObject.id, { x: 0, y: 1, z: 0 });
                }
              }}
              onChangeRotation={(newRotation) => {
                                    if (currentControllableObject.type === 'sculpture' && onUpdateRotation) {
                                      onUpdateRotation(currentControllableObject.id, newRotation);
                                    } else if (currentControllableObject.type === 'kiosk_nft') {
                                      const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                      const scene = sceneManager?.getScene();
                                      if (scene) {
                                        try {
                                          scene.traverse((child) => {
                                            if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.rotation.set(newRotation.x, newRotation.y, newRotation.z);
                                            }
                                          });
                                        } catch (error) {
                                          console.warn('Error updating Kiosk NFT rotation:', error);
                                        }
                                      }
                                      setKioskNftTransforms(prev => {
                                        const newMap = new Map(prev);
                                        const current = newMap.get(currentControllableObject.id) || { position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
                                        newMap.set(currentControllableObject.id, {
                                          ...current,
                                          rotation: newRotation
                                        });
                                        return newMap;
                                      });
                                    } else {
                                      handleExternalRotationUpdate(currentControllableObject.id, newRotation);
                                    }
                                  }}
              onResetRotation={() => {
                                    if (currentControllableObject.type === 'sculpture' && onUpdateRotation) {
                  onUpdateRotation(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                                    } else if (currentControllableObject.type === 'kiosk_nft') {
                                      const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                      const scene = sceneManager?.getScene();
                                      if (scene) {
                                        try {
                                          scene.traverse((child) => {
                                            if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.rotation.set(0, 0, 0);
                                            }
                                          });
                                        } catch (error) {
                      console.warn('Error resetting Kiosk NFT rotation:', error);
                                    }
                                  }
                                  setKioskNftTransforms(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(currentControllableObject.id, {
                                      position: newMap.get(currentControllableObject.id)?.position || { x: 0, y: 2, z: 0 },
                      rotation: { x: 0, y: 0, z: 0 },
                      scale: newMap.get(currentControllableObject.id)?.scale || { x: 1, y: 1, z: 1 }
                                    });
                                    return newMap;
                                  });
                                } else {
                  handleExternalRotationUpdate(currentControllableObject.id, { x: 0, y: 0, z: 0 });
                }
              }}
              onChangeScale={(newScale) => {
                                if (currentControllableObject.type === 'sculpture' && onUpdateScale) {
                                  onUpdateScale(currentControllableObject.id, newScale);
                                } else if (currentControllableObject.type === 'kiosk_nft') {
                                  const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                  const scene = sceneManager?.getScene();
                                  if (scene) {
                                    try {
                                      scene.traverse((child) => {
                                        if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.scale.set(newScale.x, newScale.y, newScale.z);
                                        }
                                      });
                                    } catch (error) {
                                      console.warn('Error updating Kiosk NFT scale:', error);
                                    }
                                  }
                                  setKioskNftTransforms(prev => {
                                    const newMap = new Map(prev);
                                    const current = newMap.get(currentControllableObject.id) || { position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
                                    newMap.set(currentControllableObject.id, {
                                      ...current,
                                      scale: newScale
                                    });
                                    return newMap;
                                  });
                                } else {
                                  handleExternalScaleUpdate(currentControllableObject.id, newScale);
                                }
                              }}
              onResetScale={() => {
                                if (currentControllableObject.type === 'sculpture' && onUpdateScale) {
                  onUpdateScale(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                                } else if (currentControllableObject.type === 'kiosk_nft') {
                                  const modelName = `KioskNFT_${currentNftItem?.name}_${currentNftItem?.id.slice(-8)}`;
                                  const scene = sceneManager?.getScene();
                                  if (scene) {
                                    try {
                                      scene.traverse((child) => {
                                        if (child && child.name === modelName && child instanceof THREE.Group) {
                          child.scale.set(1, 1, 1);
                                        }
                                      });
                                    } catch (error) {
                      console.warn('Error resetting Kiosk NFT scale:', error);
                                    }
                                  }
                                  setKioskNftTransforms(prev => {
                                    const newMap = new Map(prev);
                                    newMap.set(currentControllableObject.id, {
                      position: newMap.get(currentControllableObject.id)?.position || { x: 0, y: 2, z: 0 },
                      rotation: newMap.get(currentControllableObject.id)?.rotation || { x: 0, y: 0, z: 0 },
                      scale: { x: 1, y: 1, z: 1 }
                                    });
                                    return newMap;
                                  });
                                } else {
                  handleExternalScaleUpdate(currentControllableObject.id, { x: 1, y: 1, z: 1 });
                }
              }}
            />
          ) : (
            <div className="text-sm text-white/60">
              No objects available
            </div>
          )}
        </div>
      )}

      {/* GLB Model Loader Panel */}
      {sceneManager && (
        <ExternalModelsSection
          expanded={glbPanelExpanded}
          onToggleExpanded={() => setGlbPanelExpanded(!glbPanelExpanded)}
          walrusBlobId={walrusBlobId}
          onWalrusBlobIdChange={setWalrusBlobId}
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          error={error}
          loadedModels={loadedModels}
          onLoadWalrus={loadWalrusModel}
          onClearModels={clearAllModels}
          onLoadAllModels={loadAllModels}
        />
      )}
    </div>
  );
}
