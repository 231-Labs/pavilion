import { useEffect, useState } from 'react';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import type { UsePanelStateReturn, PanelTransform } from '../../types/pavilion';

interface UsePanelStateProps {
  sceneConfigManager: any | null;
  kioskId: string | null;
}

export function usePanelState({ sceneConfigManager, kioskId }: UsePanelStateProps): UsePanelStateReturn {
  // Panel state for scene restoration
  const [panelDisplayedItems, setPanelDisplayedItems] = useState<Set<string>>(new Set());
  const [panelTransforms, setPanelTransforms] = useState<Map<string, PanelTransform>>(new Map());
  
  // SculptureControlPanel loading state
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  const kioskState = useKioskState();

  // Load scene config from chain and sync to panel state
  useEffect(() => {
    const loadAndSyncSceneConfig = async () => {
      if (!sceneConfigManager || !kioskId || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
        // Reset to default state when no config manager or items
        setPanelDisplayedItems(new Set());
        setPanelTransforms(new Map());
        return;
      }

      try {
        const savedConfig = await sceneConfigManager.loadSceneConfig(kioskId);
        if (savedConfig) {
          console.log('✅ Loaded scene config from chain:', savedConfig);
          
          // Convert scene config to panel state format
          const { displayedNftItems, kioskNftTransforms } = sceneConfigManager.convertSceneConfigToPanelState(
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
  }, [sceneConfigManager, kioskId, kioskState.kioskItems]);

  return {
    panelDisplayedItems,
    panelTransforms,
    setPanelDisplayedItems,
    setPanelTransforms,
    sculptureControlPanelLoading,
    setSculptureControlPanelLoading,
  };
}
