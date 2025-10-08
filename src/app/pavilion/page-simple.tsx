'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useThreeScene } from '../../hooks/useThreeScene';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/KioskClientProvider';
import { resolveKioskOwnerCapId } from '../../lib/tx/pavilion';
import { useObjectChanges } from '../../hooks/useObjectChanges';
import { SculptureControlPanel } from '../../components/SculptureControlPanel';
import { WalletTerminal } from '../../components/WalletTerminal';
import { useKioskState } from '../../components/KioskStateProvider';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';
import { SceneConfigManager } from '../../lib/scene/SceneConfigManager';
import { SceneConfig } from '../../types/scene';

function PavilionContent() {
  const searchParams = useSearchParams();
  const kioskId = searchParams.get('kioskId');
  const kioskState = useKioskState();
  const { objectChanges, trackKioskNftChange, clearChanges } = useObjectChanges();
  const [walrusItems, setWalrusItems] = useState<any[]>([]);
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const [currentSceneConfig, setCurrentSceneConfig] = useState<SceneConfig | null>(null);
  const [sceneConfigManager, setSceneConfigManager] = useState<SceneConfigManager | null>(null);
  
  // Panel state for scene restoration
  const [panelDisplayedItems, setPanelDisplayedItems] = useState<Set<string>>(new Set());
  const [panelTransforms, setPanelTransforms] = useState<Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>>(new Map());
  
  // SculptureControlPanel loading state
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  // Create a wrapper function for tracking changes
  const handleTrackChange = (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => {
    trackKioskNftChange(objectId, objectName, property, fromValue, toValue, new Set(), new Map());
  };

  // Handle kioskId parameter - update kiosk state for WalletTerminal display
  useEffect(() => {
    const initializeKiosk = async () => {
      if (kioskId && currentAccount) {
        try {
          const capId = await resolveKioskOwnerCapId({
            kioskClient,
            ownerAddress: currentAccount.address,
            kioskId,
          });

          if (capId) {
            kioskState.setKioskFromIds({ kioskId, kioskOwnerCapId: capId });
          } else {
            kioskState.setKioskFromIds({ kioskId });
            console.warn('Kiosk found but no owner cap available for current account');
          }
        } catch (error) {
          console.error('Failed to resolve kiosk owner cap:', error);
          kioskState.setKioskFromIds({ kioskId });
        }
      }
    };

    initializeKiosk();
  }, [kioskId, currentAccount, kioskClient, kioskState]);

  // Use Three.js scene management hook
  const {
    canvasRef,
    sceneManager,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale,
    // Kiosk items
    loadKioskItems,
    clearKioskItems
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    sculptureControlPanelLoading,
  });

  // Initialize scene config manager when dependencies are available
  useEffect(() => {
    if (kioskClient && suiClient && sceneManager) {
      const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID;
      if (PAVILION_PACKAGE_ID) {
        const manager = new SceneConfigManager({
          kioskClient,
          suiClient,
          packageId: PAVILION_PACKAGE_ID,
          sceneManager,
        });
        setSceneConfigManager(manager);
      }
    }
  }, [kioskClient, suiClient, sceneManager]);

  // Analyze kiosk items and extract blob IDs when kiosk state changes
  useEffect(() => {
    const kioskItems = kioskState.kioskItems;

    if (kioskItems && kioskItems.length > 0) {
      // Analyze kiosk items to find blob IDs
      if (!sceneManager) {
        console.warn('SceneManager not available for kiosk item analysis');
        return;
      }

      const converter = new KioskItemConverter(sceneManager);
      const analyses = converter.analyzeKioskItems(kioskItems);

      // Find Walrus blob IDs
      const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);

      if (foundWalrusItems.length > 0) {
        setWalrusItems(foundWalrusItems);
      } else {
        setWalrusItems([]);
      }

      // Load non-Walrus items directly
      const nonWalrusItems = kioskItems.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type !== 'walrus';
      });

      if (nonWalrusItems.length > 0) {
        loadKioskItems(nonWalrusItems);
      }
    } else {
      // Clear 3D scene if no kiosk items
      clearKioskItems();
    }
  }, [kioskState.kioskItems, loadKioskItems, clearKioskItems, sceneManager]);

  // Update current scene config when kiosk items change
  useEffect(() => {
    if (!sceneConfigManager || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
      setCurrentSceneConfig(null);
      return;
    }

    const items = kioskState.kioskItems;
    const config = sceneConfigManager.createSceneConfigFromKioskItems(
      items,
      kioskState.kioskId || undefined,
      currentAccount?.address
    );

    setCurrentSceneConfig(config);
  }, [sceneConfigManager, kioskState.kioskItems, kioskState.kioskId, currentAccount]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

      {/* Main 3D Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

      {/* Liquid Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

      {/* Left Control Panel - Sui Wallet */}
      <WalletTerminal
        objectChanges={objectChanges || new Map()}
        sceneConfigManager={sceneConfigManager}
        currentSceneConfig={currentSceneConfig}
        kioskItems={kioskState.kioskItems || []}
        onSaveSuccess={clearChanges}
        onSaveError={(error) => console.error('Save error:', error)}
      />

      {/* Right Control Panels */}
      <div className="absolute top-6 right-6 z-20">
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
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
      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>
    </div>
  );
}

export default function PavilionPageSimple() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-white">Loading...</div>}>
      <PavilionContent />
    </Suspense>
  );
}
