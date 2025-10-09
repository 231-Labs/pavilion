import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../../lib/three/SceneManager';
import { NFTProcessor, ProcessedNFTItem } from '../../lib/nft/NFTProcessor';
import { getWalrusUrl } from '../../lib/walrus/client';
import { kioskModelName, logger, removeModelFromScene } from '../../utils/sculptureHelpers';

export interface NftTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

interface UseNftItemsManagerProps {
  sceneManager?: SceneManager;
  kioskItems: any[];
  initialDisplayedItems?: Set<string>;
  initialTransforms?: Map<string, NftTransform>;
  onTrackChange?: (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
  loadedModels: string[];
  setLoadedModels: React.Dispatch<React.SetStateAction<string[]>>;
  setError: (error: string | null) => void;
}

/**
 * NFT items management logic hook
 * Handles NFT loading, display, transforms, etc.
 */
export function useNftItemsManager({
  sceneManager,
  kioskItems,
  initialDisplayedItems,
  initialTransforms,
  onTrackChange,
  isLoading,
  setIsLoading,
  loadingProgress,
  setLoadingProgress,
  loadedModels,
  setLoadedModels,
  setError,
}: UseNftItemsManagerProps) {
  const [kioskNftItems, setKioskNftItems] = useState<any[]>([]);
  const [processedNftItems, setProcessedNftItems] = useState<ProcessedNFTItem[]>([]);
  const [nftProcessor, setNftProcessor] = useState<NFTProcessor | null>(null);
  const [displayedNftItems, setDisplayedNftItems] = useState<Set<string>>(new Set());
  const [kioskNftTransforms, setKioskNftTransforms] = useState<Map<string, NftTransform>>(new Map());

  // Initialize NFT processor
  useEffect(() => {
    if (sceneManager && !nftProcessor) {
      const processor = new NFTProcessor(sceneManager.getScene());
      setNftProcessor(processor);
    }
  }, [sceneManager, nftProcessor]);

  // Sync initial state
  useEffect(() => {
    if (initialDisplayedItems && initialDisplayedItems.size > 0) {
      setDisplayedNftItems(new Set(initialDisplayedItems));
    }
    if (initialTransforms) {
      setKioskNftTransforms(new Map(initialTransforms));
    }
  }, [initialDisplayedItems, initialTransforms]);

  // Process NFT items
  useEffect(() => {
    if (kioskItems.length > 0 && nftProcessor) {
      const processItems = async () => {
        try {
          const processed = await nftProcessor.processNFTItems(kioskItems);
          setProcessedNftItems(processed);
          
          // Create legacy format for backward compatibility
          const legacyItems = processed.map(item => {
            const fullKioskItem = kioskItems.find(k => k.objectId === item.id);
            return {
              id: item.id,
              name: item.name,
              blobId: item.resourceInfo.blobId || '',
              displayData: item.sceneObject,
              contentFields: {},
              fullItem: fullKioskItem,
              resourceType: item.resourceInfo.type,
              // Extract listing information from fullKioskItem
              isListed: fullKioskItem?.listing?.isListed || false,
              listPrice: fullKioskItem?.listing?.price || undefined,
              itemType: fullKioskItem?.type || undefined,
            };
          });
          
          setKioskNftItems(legacyItems);
          
          console.log(`📦 Processed ${processed.length} NFT items:`, {
            '3D models': processed.filter(p => p.resourceInfo.type === '3d-model').length,
            '2D images': processed.filter(p => p.resourceInfo.type === '2d-image').length,
          });
        } catch (error) {
          console.error('Failed to process NFT items:', error);
          setKioskNftItems([]);
          setProcessedNftItems([]);
        }
      };
      
      processItems();
    } else {
      setKioskNftItems([]);
      setProcessedNftItems([]);
    }
  }, [kioskItems, nftProcessor]);

  /**
   * Load a single NFT item (3D model or 2D image)
   */
  const loadNftItem = useCallback(async (
    itemId: string,
    processedItem: ProcessedNFTItem,
    modelName: string,
    storedTransform?: NftTransform
  ) => {
    if (!sceneManager || !nftProcessor) return null;

    const position = storedTransform?.position || { x: 0, y: 2, z: 0 };
    let object3D: THREE.Group;

    if (processedItem.resourceInfo.type === '2d-image') {
      // Handle 2D image
      console.log(`📸 Loading 2D image NFT: ${processedItem.name}`);
      
      if (processedItem.threejsObject) {
        object3D = processedItem.threejsObject.clone();
      } else {
        const imageSource = processedItem.resourceInfo.blobId || processedItem.resourceInfo.url!;
        const imageOptions = {
          style: processedItem.sceneObject.resource?.imageStyle || 'framed',
          width: 2,
        } as any;
        
        const { Image3DRenderer } = await import('../../lib/three/Image3DRenderer');
        const imageRenderer = new Image3DRenderer(sceneManager.getScene()!);
        object3D = await imageRenderer.create3DImageObject(imageSource, imageOptions);
      }

      object3D.position.set(position.x, position.y, position.z);
      object3D.name = modelName;
      sceneManager.getScene()?.add(object3D);

      // Apply stored transforms if available
      if (storedTransform) {
        if (storedTransform.rotation) {
          object3D.rotation.set(
            storedTransform.rotation.x,
            storedTransform.rotation.y,
            storedTransform.rotation.z
          );
        }
        if (storedTransform.scale) {
          object3D.scale.set(
            storedTransform.scale.x,
            storedTransform.scale.y,
            storedTransform.scale.z
          );
        }
      }
    } else {
      // Handle 3D model
      console.log(`🎯 Loading 3D model NFT: ${processedItem.name}`);
      const url = processedItem.resourceInfo.blobId 
        ? getWalrusUrl(processedItem.resourceInfo.blobId)
        : processedItem.resourceInfo.url!;

      await sceneManager.loadGLBModel(url, {
        name: modelName,
        position: position,
        rotation: storedTransform?.rotation || { x: 0, y: 0, z: 0 },
        scale: storedTransform?.scale || { x: 1, y: 1, z: 1 },
        onProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingProgress(percent);
        }
      });

      const scene = sceneManager.getScene();
      object3D = scene?.getObjectByName(modelName) as THREE.Group;
    }

    return object3D;
  }, [sceneManager, nftProcessor, setLoadingProgress]);

  /**
   * Auto-load models that should be displayed (from scene config)
   */
  useEffect(() => {
    const autoLoadDisplayedModels = async () => {
      if (!sceneManager || !nftProcessor) {
        return;
      }
      
      const itemsToLoad = kioskNftItems.filter(nftItem => {
        const itemId = nftItem.id;
        const modelName = kioskModelName(nftItem.name, itemId);
        return displayedNftItems.has(itemId) && !loadedModels.includes(modelName);
      });

      if (itemsToLoad.length === 0) {
        if (isLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (isLoading) { return; }

      for (const nftItem of itemsToLoad) {
        const itemId = nftItem.id;
        const modelName = kioskModelName(nftItem.name, itemId);
        
        if (loadedModels.includes(modelName)) continue;

        try {
          logger.log(`📦 Loading model for ${nftItem.name}...`);
          
          setIsLoading(true);
          setError(null);
          setLoadingProgress(0);

          const processedItem = processedNftItems.find(p => p.id === itemId);
          if (!processedItem) {
            console.error(`Processed NFT item not found for ID: ${itemId}`);
            continue;
          }

          const storedTransform = kioskNftTransforms.get(itemId);
          await loadNftItem(itemId, processedItem, modelName, storedTransform);

          setLoadedModels(prev => [...prev, modelName]);
          logger.log(`✅ Successfully loaded model: ${modelName}`);

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          logger.error(`❌ Failed to load model for ${nftItem.name}:`, error);
          setError(`Failed to load ${nftItem.name}: ${error}`);
        }
      }

      setIsLoading(false);
      setLoadingProgress(0);
      logger.log('🎉 Finished auto-loading displayed models');
    };

    const timeoutId = setTimeout(autoLoadDisplayedModels, 500);
    return () => clearTimeout(timeoutId);
  }, [
    displayedNftItems,
    kioskNftItems,
    loadedModels,
    sceneManager,
    isLoading,
    kioskNftTransforms,
    nftProcessor,
    processedNftItems,
    setIsLoading,
    setLoadingProgress,
    setError,
    setLoadedModels,
    loadNftItem,
  ]);

  /**
   * Handle NFT item display toggle
   */
  const handleNftItemDisplayToggle = useCallback(async (nftItem: any, show: boolean) => {
    if (!sceneManager || !nftProcessor) return;

    const itemId = nftItem.id;
    const modelName = kioskModelName(nftItem.name, itemId);
    const wasDisplayed = displayedNftItems.has(itemId);

    onTrackChange?.(itemId, nftItem.name, 'displayed', wasDisplayed, show);

    if (show) {
      setDisplayedNftItems(prev => new Set([...prev, itemId]));

      if (loadedModels.includes(modelName)) {
        return;
      }

      const processedItem = processedNftItems.find(p => p.id === itemId);
      if (!processedItem) {
        console.error(`Processed NFT item not found for ID: ${itemId}`);
        return;
      }

      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);

      try {
        const storedTransform = kioskNftTransforms.get(itemId);
        const object3D = await loadNftItem(itemId, processedItem, modelName, storedTransform);

        setLoadedModels(prev => [...prev, modelName]);

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
        setDisplayedNftItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
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

      if (loadedModels.includes(modelName)) {
        removeModelFromScene(sceneManager, modelName);
        setLoadedModels(prev => prev.filter(name => name !== modelName));
      }
    }
  }, [
    sceneManager,
    nftProcessor,
    displayedNftItems,
    loadedModels,
    processedNftItems,
    kioskNftTransforms,
    onTrackChange,
    setIsLoading,
    setError,
    setLoadingProgress,
    setLoadedModels,
    loadNftItem,
  ]);

  return {
    kioskNftItems,
    processedNftItems,
    nftProcessor,
    displayedNftItems,
    setDisplayedNftItems,
    kioskNftTransforms,
    setKioskNftTransforms,
    handleNftItemDisplayToggle,
  };
}

