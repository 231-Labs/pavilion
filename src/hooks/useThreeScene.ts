import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager, SceneConfig } from '../lib/three/SceneManager';
import { SculptureInstance } from '../types/sculpture';
import { KioskItemConverter, KioskItem, KioskItem3DResult } from '../lib/three/KioskItemConverter';

export interface UseThreeSceneOptions extends SceneConfig {
  createGallery?: boolean;
  addSculptures?: boolean;
  enableKioskItems?: boolean;
}

export function useThreeScene(options: UseThreeSceneOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const kioskItemConverterRef = useRef<KioskItemConverter | null>(null);
  const [sculptures, setSculptures] = useState<SculptureInstance[]>([]);
  const [kioskItems3D, setKioskItems3D] = useState<KioskItem3DResult[]>([]);
  const [loadingKioskItems, setLoadingKioskItems] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene manager
    const sceneManager = new SceneManager(canvasRef.current, options);
    sceneManagerRef.current = sceneManager;

    // Create kiosk item converter if enabled
    if (options.enableKioskItems) {
      kioskItemConverterRef.current = new KioskItemConverter(sceneManager);
    }

    // Add content based on options
    if (options.createGallery !== false) {
      sceneManager.createGalleryEnvironment();
    }

    if (options.addSculptures) {
      sceneManager.addSculptures();
      // Update sculpture status
      setSculptures(sceneManager.getSculptures());
    }

    // Start animation
    sceneManager.startAnimation();

    // Cleanup function
    return () => {
      // Clear kiosk items first
      if (kioskItemConverterRef.current) {
        kioskItemConverterRef.current.clearAllItems();
        kioskItemConverterRef.current = null;
      }

      sceneManager.dispose();
      sceneManagerRef.current = null;
      setSculptures([]);
      setKioskItems3D([]);
    };
  }, [
    options.backgroundColor,
    options.ambientLightColor,
    options.ambientLightIntensity,
    options.directionalLightColor,
    options.directionalLightIntensity,
    options.enableShadows,
    options.createGallery,
    options.addSculptures,
    options.enableKioskItems,
  ]);

  // Provide access interface for scene manager
  const getSceneManager = () => sceneManagerRef.current;

  // Callback for updating sculpture position
  const updateSculpturePosition = useCallback((id: string, position: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculpturePosition(id, position);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  // Callback for updating sculpture rotation
  const updateSculptureRotation = useCallback((id: string, rotation: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculptureRotation(id, rotation);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  // Callback for updating sculpture scale
  const updateSculptureScale = useCallback((id: string, scale: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculptureScale(id, scale);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  // Load kiosk items into 3D scene
  const loadKioskItems = useCallback(async (kioskItems: KioskItem[]) => {
    const converter = kioskItemConverterRef.current;
    if (!converter) {
      console.warn('KioskItemConverter not initialized. Make sure enableKioskItems is true.');
      return;
    }

    setLoadingKioskItems(true);
    try {
      // Clear existing kiosk items first
      converter.clearAllItems();

      // Convert and load new items
      const results = await converter.convertKioskItemsTo3D(kioskItems);
      setKioskItems3D(results);

      console.log(`Successfully loaded ${results.length} kiosk items into 3D scene`);
    } catch (error) {
      console.error('Failed to load kiosk items:', error);
    } finally {
      setLoadingKioskItems(false);
    }
  }, []);

  // Clear all kiosk items from 3D scene
  const clearKioskItems = useCallback(() => {
    const converter = kioskItemConverterRef.current;
    if (converter) {
      converter.clearAllItems();
      setKioskItems3D([]);
    }
  }, []);

  // Get kiosk item by object ID
  const getKioskItem3D = useCallback((objectId: string) => {
    const converter = kioskItemConverterRef.current;
    return converter ? converter.getItemById(objectId) : undefined;
  }, []);

  return {
    canvasRef,
    sceneManager: getSceneManager() || undefined,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale,
    // Kiosk items
    kioskItems3D,
    loadingKioskItems,
    loadKioskItems,
    clearKioskItems,
    getKioskItem3D,
  };
}
