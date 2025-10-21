'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useThreeScene } from '../../../hooks/scene/useThreeScene';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../../components/providers/KioskClientProvider';
import { useKioskState } from '../../../components/providers/KioskStateProvider';
import { KioskItemConverter } from '../../../lib/three/KioskItemConverter';
import { SceneConfigManager } from '../../../lib/three/SceneConfigManager';
import { VisitorControlPanel } from '../../../components/panels/VisitorControlPanel';
import { VisitorWalletTerminal } from '../../../components/panels/VisitorWalletTerminal';
import { VisitorPurchaseTargetProvider } from '../../../components/providers/VisitorPurchaseTargetProvider';

function VisitorPavilionContent() {
  const searchParams = useSearchParams();
  const kioskId = searchParams.get('kioskId');
  const kioskState = useKioskState();
  const [walrusItems, setWalrusItems] = useState<any[]>([]);
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const [sceneConfigManager, setSceneConfigManager] = useState<SceneConfigManager | null>(null);
  
  // Panel state for scene restoration from chain
  const [panelDisplayedItems, setPanelDisplayedItems] = useState<Set<string>>(new Set());
  const [panelTransforms, setPanelTransforms] = useState<Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>>(new Map());

  // Use Three.js scene management hook
  const {
    canvasRef,
    sceneManager,
    sculptures,
    // Kiosk items
    loadKioskItems,
    clearKioskItems
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    sculptureControlPanelLoading: false,
  });

  // Handle kioskId parameter - update kiosk state
  useEffect(() => {
    if (kioskId) {
      // In visitor mode, we don't have owner cap
      kioskState.setKioskFromIds({ kioskId });
    }
  }, [kioskId, kioskState]);

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

  // Load scene config from chain and sync to panel state
  useEffect(() => {
    const loadAndSyncSceneConfig = async () => {
      if (!sceneConfigManager || !kioskId || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
        return;
      }

      try {
        const savedConfig = await sceneConfigManager.loadSceneConfig(kioskId);
        if (savedConfig) {
          console.log('✅ Loaded scene config from chain (visitor mode):', savedConfig);
          
          // Convert scene config to panel state format
          const { displayedNftItems, kioskNftTransforms } = sceneConfigManager.convertSceneConfigToPanelState(
            savedConfig, 
            kioskState.kioskItems
          );
          
          // Update panel state - this will trigger scene updates through panel components
          setPanelDisplayedItems(displayedNftItems);
          setPanelTransforms(kioskNftTransforms);
          
          console.log('✅ Scene config synced to panel state (visitor mode):', {
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

  // Analyze kiosk items and extract blob IDs when kiosk state changes
  useEffect(() => {
    const itemsToProcess = kioskState.kioskItems || [];

    if (itemsToProcess.length > 0) {
      if (!sceneManager) {
        console.warn('SceneManager not available for kiosk item analysis');
        return;
      }

      console.log(`🎯 Processing ${itemsToProcess.length} items in visitor mode`);

      const converter = new KioskItemConverter(sceneManager);
      const analyses = converter.analyzeKioskItems(itemsToProcess);

      // Find Walrus blob IDs
      const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);

      if (foundWalrusItems.length > 0) {
        setWalrusItems(foundWalrusItems);
      } else {
        setWalrusItems([]);
      }

      // Load non-Walrus, non-image items directly
      const nonWalrusNonImageItems = itemsToProcess.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type !== 'walrus' && analysis.type !== 'image';
      });

      if (nonWalrusNonImageItems.length > 0) {
        loadKioskItems(nonWalrusNonImageItems);
      }
      
      // Log info about 2D images
      const imageItems = itemsToProcess.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type === 'image';
      });
      
      if (imageItems.length > 0) {
        console.log(`📸 Found ${imageItems.length} 2D image(s) - will be created on demand`);
      }
    } else {
      clearKioskItems();
    }
  }, [kioskState.kioskItems, loadKioskItems, clearKioskItems, sceneManager]);

  if (!kioskId) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        <p>Invalid kiosk ID</p>
      </div>
    );
  }

  return (
    <VisitorPurchaseTargetProvider>
      <div className="relative w-full h-screen overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

        {/* Main 3D Canvas */}
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

        {/* Liquid Glass Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

        {/* Left Control Panel - Visitor Wallet */}
        <VisitorWalletTerminal kioskId={kioskId} />

        {/* Right Control Panels - Visitor Mode */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 w-[calc(50%-1rem)] sm:w-auto sm:max-w-xs">
          <VisitorControlPanel
            sceneManager={sceneManager}
            autoLoadBlobIds={walrusItems?.map(item => item.blobId).filter((blobId): blobId is string => typeof blobId === 'string' && blobId.trim().length > 0) || []}
            kioskItems={kioskState.kioskItems || []}
            kioskId={kioskId}
            initialDisplayedItems={panelDisplayedItems}
            initialTransforms={panelTransforms}
          />
        </div>
        
        <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
          <div className="w-full h-full border border-white/15"></div>
          <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
        </div>
      </div>
    </VisitorPurchaseTargetProvider>
  );
}

export default function VisitorPavilionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-white">Loading...</div>}>
      <VisitorPavilionContent />
    </Suspense>
  );
}

