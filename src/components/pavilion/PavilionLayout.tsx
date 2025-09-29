import React from 'react';
import { PavilionBackground } from './PavilionBackground';
import { PavilionCanvas } from './PavilionCanvas';
import { ControlPanelsContainer } from './ControlPanelsContainer';
import type { WalrusItem, PanelTransform } from '../../types/pavilion';

interface PavilionLayoutProps {
  // Canvas ref
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  // Scene and sculpture props
  sculptures: any[];
  sceneManager: any;
  onUpdatePosition: (id: string, position: { x: number; y: number; z: number }) => void;
  onUpdateRotation: (id: string, rotation: { x: number; y: number; z: number }) => void;
  onUpdateScale: (id: string, scale: { x: number; y: number; z: number }) => void;
  
  // Walrus and kiosk props
  walrusItems: WalrusItem[];
  
  // Panel state props
  panelDisplayedItems: Set<string>;
  panelTransforms: Map<string, PanelTransform>;
  setSculptureControlPanelLoading: (loading: boolean) => void;
  
  // Scene config props
  sceneConfigManager: any;
  currentSceneConfig: any;
}

export function PavilionLayout({
  canvasRef,
  sculptures,
  sceneManager,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  walrusItems,
  panelDisplayedItems,
  panelTransforms,
  setSculptureControlPanelLoading,
  sceneConfigManager,
  currentSceneConfig,
}: PavilionLayoutProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <PavilionBackground />

      {/* Main 3D Canvas */}
      <PavilionCanvas canvasRef={canvasRef} />

      {/* Control Panels */}
      <ControlPanelsContainer
        sculptures={sculptures}
        sceneManager={sceneManager}
        onUpdatePosition={onUpdatePosition}
        onUpdateRotation={onUpdateRotation}
        onUpdateScale={onUpdateScale}
        walrusItems={walrusItems}
        panelDisplayedItems={panelDisplayedItems}
        panelTransforms={panelTransforms}
        setSculptureControlPanelLoading={setSculptureControlPanelLoading}
        sceneConfigManager={sceneConfigManager}
        currentSceneConfig={currentSceneConfig}
      />
    </div>
  );
}
