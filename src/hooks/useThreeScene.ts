import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager, SceneConfig } from '../lib/three/SceneManager';
import { SculptureInstance } from '../types/sculpture';
import { KioskItemConverter, KioskItem, KioskItem3DResult } from '../lib/three/KioskItemConverter';
import { DefaultSceneConfig } from '../lib/three/DefaultScene';
import { useLoading } from '../components/LoadingProvider';

export interface UseThreeSceneOptions extends SceneConfig {
  createGallery?: boolean;
  addSculptures?: boolean;
  enableKioskItems?: boolean;
  defaultScene?: DefaultSceneConfig;
}

export function useThreeScene(options: UseThreeSceneOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const kioskItemConverterRef = useRef<KioskItemConverter | null>(null);
  const [sculptures, setSculptures] = useState<SculptureInstance[]>([]);
  const [kioskItems3D, setKioskItems3D] = useState<KioskItem3DResult[]>([]);
  const [loadingKioskItems, setLoadingKioskItems] = useState(false);
  const [sceneInitialized, setSceneInitialized] = useState(false);
  
  const { setLoading, setProgress, setLoadingStage } = useLoading();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Start loading state
    setLoading(true);
    setProgress(0);
    setLoadingStage('Initializing 3D scene...', 'Setting up renderer and camera');
    setSceneInitialized(false);

    // Simulate asynchronous initialization of loading steps
    const initializeScene = async () => {
      try {
        // Step 1: Create scene configuration
        setProgress(20);
        setLoadingStage('Configuring scene parameters...', 'Setting up lights and materials');
        
        const sceneConfig: SceneConfig = {
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

        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 2: Initialize scene manager
        setProgress(40);
        setLoadingStage('Creating 3D environment...', 'Initializing WebGL rendering context');
        
        const sceneManager = new SceneManager(canvasRef.current!, sceneConfig);
        sceneManagerRef.current = sceneManager;

        await new Promise(resolve => setTimeout(resolve, 400));

        // Step 3: Setup kiosk item converter
        setProgress(60);
        setLoadingStage('Setting up model converter...', 'Preparing 3D object processing system');
        
        if (options.enableKioskItems) {
          kioskItemConverterRef.current = new KioskItemConverter(sceneManager);
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 4: Add sculptures if needed
        setProgress(75);
        if (options.addSculptures) {
          setLoadingStage('Adding sculptures...', 'Loading default 3D models');
          sceneManager.addSculptures();
          setSculptures(sceneManager.getSculptures());
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Step 5: Start animation and finalize
        setProgress(90);
        setLoadingStage('Starting rendering loop...', 'Preparing to enter 3D world');
        
        sceneManager.startAnimation();
        
        await new Promise(resolve => setTimeout(resolve, 300));

        // Complete loading
        setProgress(100);
        setLoadingStage('Loading Completed', 'Welcome to your exclusive gallery');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSceneInitialized(true);
        setLoading(false);

      } catch (error) {
        console.error('Scene initialization failed:', error);
        setLoadingStage('Initialization failed', 'Please refresh the page and try again');
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
    sceneInitialized,
    kioskItems3D,
    loadingKioskItems,
    loadKioskItems,
    clearKioskItems,
    getKioskItem3D,
  };
}
