import React from 'react';
import { WalletTerminal } from '../panels/WalletTerminal';
import { SculptureControlPanel } from '../panels/SculptureControlPanel';
import { useObjectChanges } from '../../hooks/state/useObjectChanges';
import { useKioskState } from '../providers/KioskStateProvider';
import type { WalrusItem, PanelTransform } from '../../types/pavilion';

interface ControlPanelsContainerProps {
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

export function ControlPanelsContainer({
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
}: ControlPanelsContainerProps) {
  const { objectChanges, trackKioskNftChange, clearChanges } = useObjectChanges();
  const kioskState = useKioskState();

  // Create a wrapper function for tracking changes
  const handleTrackChange = (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => {
    trackKioskNftChange(objectId, objectName, property, fromValue, toValue, new Set(), new Map());
  };

  return (
    <>
      {/* Left Control Panel - Sui Wallet */}
      <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-20">
        <WalletTerminal
          objectChanges={objectChanges || new Map()}
          sceneConfigManager={sceneConfigManager}
          currentSceneConfig={currentSceneConfig}
          kioskItems={kioskState.kioskItems || []}
          onSaveSuccess={clearChanges}
          onSaveError={(error) => console.error('Save error:', error)}
        />
      </div>

      {/* Right Control Panels */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 max-w-[280px] sm:max-w-xs">
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={onUpdatePosition}
          onUpdateRotation={onUpdateRotation}
          onUpdateScale={onUpdateScale}
          autoLoadBlobIds={walrusItems?.map(item => item.blobId).filter((blobId): blobId is string => typeof blobId === 'string' && blobId.trim().length > 0) || []}
          kioskItems={kioskState.kioskItems || []}
          kioskId={kioskState.kioskId || undefined}
          kioskOwnerCapId={kioskState.kioskOwnerCapId || undefined}
          onTrackChange={handleTrackChange}
          // Pass panel state for scene restoration
          initialDisplayedItems={panelDisplayedItems}
          initialTransforms={panelTransforms}
          // Loading state callback
          onLoadingStateChange={setSculptureControlPanelLoading}
        />
      </div>
    </>
  );
}
