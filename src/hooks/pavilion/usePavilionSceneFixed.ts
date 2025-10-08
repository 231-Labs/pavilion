import { useState, useEffect } from 'react';
import { useThreeScene } from '../useThreeScene';
import { useSceneConfiguration } from './useSceneConfiguration';
import { useWalrusItems } from './useWalrusItems';
import { useKioskState } from '../../components/KioskStateProvider';
import type { PanelTransform } from '../../types/pavilion';

interface UsePavilionSceneProps {
  kioskId: string | null;
}

export function usePavilionSceneFixed({ kioskId }: UsePavilionSceneProps) {
  // Panel state for scene restoration
  const [panelDisplayedItems, setPanelDisplayedItems] = useState<Set<string>>(new Set());
  const [panelTransforms, setPanelTransforms] = useState<Map<string, PanelTransform>>(new Map());
  
  // SculptureControlPanel loading state
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  const kioskState = useKioskState();

  // Use Three.js scene management hook with panel loading state
  const threeScene = useThreeScene({
    backgroundColor: 0x1a1a1a,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    sculptureControlPanelLoading,
  });

  // Configure scene management
  const sceneConfig = useSceneConfiguration({
    sceneManager: threeScene.sceneManager
  });

  // Analyze and extract Walrus items from kiosk
  const walrusData = useWalrusItems({
    sceneManager: threeScene.sceneManager,
    loadKioskItems: threeScene.loadKioskItems,
    clearKioskItems: threeScene.clearKioskItems
  });

  // Load scene config from chain and sync to panel state
  useEffect(() => {
    const loadAndSyncSceneConfig = async () => {
      if (!sceneConfig.sceneConfigManager || !kioskId || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
        // Reset to default state when no config manager or items
        setPanelDisplayedItems(new Set());
        setPanelTransforms(new Map());
        return;
      }

      try {
        const savedConfig = await sceneConfig.sceneConfigManager.loadSceneConfig(kioskId);
        if (savedConfig) {
          console.log('✅ Loaded scene config from chain:', savedConfig);
          
          // Convert scene config to panel state format
          const { displayedNftItems, kioskNftTransforms } = sceneConfig.sceneConfigManager.convertSceneConfigToPanelState(
            savedConfig, 
            kioskState.kioskItems
          );
          
          // Update panel state - this will trigger scene updates through panel components
          setPanelDisplayedItems(displayedNftItems);
          setPanelTransforms(kioskNftTransforms);
          
          console.log('✅ Scene config synced to panel state:', {
            displayedItems: displayedNftItems.size,
            transforms: kioskNftTransforms.size
          });
        } else {
          console.log('💭 No saved scene config found, using default state');
          // Reset to default state
          setPanelDisplayedItems(new Set());
          setPanelTransforms(new Map());
        }
      } catch (error) {
        console.warn('❌ Failed to load scene config:', error);
        // Reset to default state on error
        setPanelDisplayedItems(new Set());
        setPanelTransforms(new Map());
      }
    };

    const timeoutId = setTimeout(loadAndSyncSceneConfig, 500);
    return () => clearTimeout(timeoutId);
  }, [sceneConfig.sceneConfigManager, kioskId, kioskState.kioskItems]);

  return {
    // Three.js scene
    ...threeScene,
    // Scene configuration
    ...sceneConfig,
    // Walrus items
    ...walrusData,
    // Panel state
    panelDisplayedItems,
    panelTransforms,
    setPanelDisplayedItems,
    setPanelTransforms,
    sculptureControlPanelLoading,
    setSculptureControlPanelLoading,
  };
}
