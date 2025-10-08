import { useThreeScene } from '../useThreeScene';
import { useSceneConfiguration } from './useSceneConfiguration';
import { useWalrusItems } from './useWalrusItems';
import { usePanelState } from './usePanelState';

interface UsePavilionSceneProps {
  kioskId: string | null;
}

export function usePavilionScene({ kioskId }: UsePavilionSceneProps) {
  // Initialize panel state early
  const panelState = usePanelState({
    sceneConfigManager: null,
    kioskId
  });

  // Use Three.js scene management hook with panel loading state
  const threeScene = useThreeScene({
    backgroundColor: 0x1a1a1a,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    sculptureControlPanelLoading: panelState.sculptureControlPanelLoading,
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

  return {
    // Three.js scene
    ...threeScene,
    // Scene configuration
    ...sceneConfig,
    // Walrus items
    ...walrusData,
    // Panel state
    ...panelState,
  };
}
