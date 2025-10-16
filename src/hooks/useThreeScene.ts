import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from '../lib/three/SceneManager';
import { ThreeSceneConfig } from '../types/three';
import { SculptureInstance } from '../types/sculpture';
import { KioskItemConverter, KioskItem, KioskItem3DResult } from '../lib/three/KioskItemConverter';
import { DefaultSceneConfig } from '../lib/three/DefaultScene';
import { useLoading } from '../components/providers/LoadingProvider';

export interface UseThreeSceneOptions extends ThreeSceneConfig {
  createGallery?: boolean;
  addSculptures?: boolean;
  enableKioskItems?: boolean;
  defaultScene?: DefaultSceneConfig;
  sculptureControlPanelLoading?: boolean; // Loading state from SculptureControlPanel
}

export function useThreeScene(options: UseThreeSceneOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const kioskItemConverterRef = useRef<KioskItemConverter | null>(null);
  const [sculptures, setSculptures] = useState<SculptureInstance[]>([]);
  const [kioskItems3D, setKioskItems3D] = useState<KioskItem3DResult[]>([]);
  const [loadingKioskItems, setLoadingKioskItems] = useState(false);
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [hasKioskItems, setHasKioskItems] = useState(false);
  const [allModelsLoaded, setAllModelsLoaded] = useState(false);
  
  const { setLoading } = useLoading();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Start background animation
    setLoading(true);
    setSceneInitialized(false);

    // Simplified scene initialization
    const initializeScene = async () => {
      try {
        const sceneConfig: ThreeSceneConfig = {
          ...options,
          // Convert createGallery option to defaultScene config
          defaultScene: options.createGallery !== false ? {
            backgroundColor: 0x0a0a0f,
            enableGrid: true,
            enableParticles: true,
            enableHolographicElements: true,
            ...options.defaultScene // Allow custom overrides
          } : options.defaultScene
        };

        const sceneManager = new SceneManager(canvasRef.current!, sceneConfig);
        sceneManagerRef.current = sceneManager;

        if (options.enableKioskItems) {
          kioskItemConverterRef.current = new KioskItemConverter(sceneManager);
        }

        if (options.addSculptures) {
          sceneManager.addSculptures();
          setSculptures(sceneManager.getSculptures());
        }

        sceneManager.startAnimation();
        setSceneInitialized(true);
        
        // Don't stop loading here - wait for models to load

      } catch (error) {
        console.error('Scene initialization failed:', error);
        setLoading(false);
      }
    };

    initializeScene();

    // Cleanup function
    return () => {
      // Clear kiosk items first
      if (kioskItemConverterRef.current) {
        kioskItemConverterRef.current.clearAllItems();
        kioskItemConverterRef.current = null;
      }

      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
      
      setSculptures([]);
      setKioskItems3D([]);
      setSceneInitialized(false);
      setHasKioskItems(false);
      setAllModelsLoaded(false);
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
    options.defaultScene,
  ]);

  // Monitor loading state - stop animation when all models are loaded
  useEffect(() => {
    if (!sceneInitialized) return;

    // Check if SculptureControlPanel is still loading
    if (options.sculptureControlPanelLoading) {
      console.log('⏳ SculptureControlPanel still loading auto-models...');
      return;
    }

    // If no kiosk items expected, stop loading after basic scene setup with minimum delay
    if (!hasKioskItems) {
      const timer = setTimeout(() => {
        console.log('✅ No kiosk items - stopping loading animation');
        setAllModelsLoaded(true);
        setLoading(false);
      }, 800); // Minimum visual feedback time
      return () => clearTimeout(timer);
    }

    // If kiosk items are expected but still loading, wait
    if (loadingKioskItems) {
      console.log('⏳ Still loading kiosk items...');
      return;
    }

    // All kiosk items loaded and SculptureControlPanel not loading, stop loading animation
    if (hasKioskItems && !loadingKioskItems) {
      console.log('✅ All kiosk items loaded and SculptureControlPanel ready - stopping loading animation');
      setAllModelsLoaded(true);
      setLoading(false);
    }
  }, [sceneInitialized, hasKioskItems, loadingKioskItems, options.sculptureControlPanelLoading, setLoading]);

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

    console.log(`🎨 Starting to load ${kioskItems.length} kiosk items...`);
    setHasKioskItems(kioskItems.length > 0);
    setLoadingKioskItems(true);
    
    try {
      // Clear existing kiosk items first
      converter.clearAllItems();

      // Convert and load new items
      const results = await converter.convertKioskItemsTo3D(kioskItems);
      setKioskItems3D(results);

      console.log(`✅ Successfully loaded ${results.length} kiosk items into 3D scene`);
    } catch (error) {
      console.error('❌ Failed to load kiosk items:', error);
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
      setHasKioskItems(false);
      console.log('🧹 Cleared all kiosk items from scene');
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
    sceneInitialized,
    allModelsLoaded,
    kioskItems3D,
    loadingKioskItems,
    loadKioskItems,
    clearKioskItems,
    getKioskItem3D,
  };
}
