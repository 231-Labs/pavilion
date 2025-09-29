// Types for pavilion page components

export interface WalrusItem {
  id: string;
  name: string;
  blobId: string;
  displayData: any;
  contentFields: any;
  fullItem: any;
}

export interface PanelTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface UsePavilionInitializationReturn {
  kioskId: string | null;
  isInitialized: boolean;
  initializationError: string | null;
}

export interface UseSceneConfigurationReturn {
  currentSceneConfig: any | null;
  sceneConfigManager: any | null;
  isConfigReady: boolean;
}

export interface UseWalrusItemsReturn {
  walrusItems: WalrusItem[];
  isAnalyzing: boolean;
  analysisError: string | null;
}

export interface UsePanelStateReturn {
  panelDisplayedItems: Set<string>;
  panelTransforms: Map<string, PanelTransform>;
  setPanelDisplayedItems: (items: Set<string>) => void;
  setPanelTransforms: (transforms: Map<string, PanelTransform>) => void;
  sculptureControlPanelLoading: boolean;
  setSculptureControlPanelLoading: (loading: boolean) => void;
}
