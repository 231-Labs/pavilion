'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useThreeScene } from '../../hooks/useThreeScene';
import { SculptureControlPanel } from '../../components/SculptureControlPanel';
import { WalletTerminal } from '../../components/WalletTerminal';
import { useKioskState } from '../../components/KioskStateProvider';
import { useKioskClient } from '../../components/KioskClientProvider';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';

export default function PavilionPage() {
  const searchParams = useSearchParams();
  const kioskId = searchParams.get('kioskId');
  const kioskState = useKioskState();
  const kioskClient = useKioskClient();
  const [walrusItems, setWalrusItems] = useState<any[]>([]);

  // Handle kioskId parameter - update kiosk state for WalletTerminal display
  useEffect(() => {
    if (kioskId) {
      console.log('Demo Pavilion loaded with kioskId:', kioskId);
      kioskState.setKioskFromIds({ kioskId });
    }
  }, [kioskId, kioskState]);

  // Process kiosk content when kiosk state changes (kiosk content is already fetched by kioskState)
  useEffect(() => {
    const kioskItems = kioskState.kioskItems;

    if (kioskItems && kioskItems.length > 0) {
      console.log(`Processing ${kioskItems.length} items from kiosk state`);

      // Process items for 3D models - this logic can stay for additional processing
      const itemsWithPotential3D = kioskItems.filter((item: any) => {
        // Check if item has display data or content with potential 3D model info
        const hasDisplay = item.data?.display?.data;
        const hasContent = item.data?.content?.fields;

        if (hasDisplay) {
          console.log('Item has display data:', item.data.display.data);
        }

        if (hasContent) {
          console.log('Item has content fields:', item.data.content.fields);
        }

        // Consider all items as potential 3D content for now
        return true;
      });

      console.log('Items with potential 3D content:', itemsWithPotential3D.length);
    } else if (kioskId && !kioskState.loading) {
      console.log('No items found in kiosk or still loading');
    }
  }, [kioskState.kioskItems, kioskState.loading, kioskId]);

  // Use Three.js scene management hook
  const {
    canvasRef,
    sceneManager,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale,
    // Kiosk items
    kioskItems3D,
    loadingKioskItems,
    loadKioskItems,
    clearKioskItems,
    getKioskItem3D
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    // backgroundColor: 0xFFFFFF,
    cameraPosition: [0, 1, 20],
    createGallery: true,
    enableKioskItems: true,
  });

  // Analyze kiosk items and extract blob IDs when kiosk state changes
  useEffect(() => {
    const kioskItems = kioskState.kioskItems;

    if (kioskItems && kioskItems.length > 0) {
      console.log('Analyzing kiosk items for blob IDs:', kioskItems.length);

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
        console.log('Found Walrus blob IDs:', foundWalrusItems.map(item => ({
          name: item.name,
          blobId: item.blobId
        })));

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
        console.log('Loading non-Walrus kiosk items:', nonWalrusItems.length);
        loadKioskItems(nonWalrusItems);
      }
    } else {
      // Clear 3D scene if no kiosk items
      clearKioskItems();
    }
  }, [kioskState.kioskItems, loadKioskItems, clearKioskItems, sceneManager]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

      {/* Main 3D Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

      {/* Liquid Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

      {/* Left Control Panel - Sui Wallet */}
      <WalletTerminal />

      {/* Right Control Panels */}
      <div className="absolute top-6 right-6 z-20">
        {/* Sculpture Control Panel with Integrated GLB Loader */}
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
          autoLoadBlobIds={walrusItems?.map(item => item.blobId!).filter(Boolean) || []}
          kioskItems={kioskState.kioskItems || []}
        />

        {/* Kiosk Items Status Panel */}
        {(kioskState.kioskItems || loadingKioskItems) && (
          <div className="mt-4 glass-ribbon rounded-lg p-4 border border-white/10">
            <div className="text-xs tracking-widest uppercase text-white/70 mb-2">
              Kiosk Items Status
            </div>
            <div className="text-white/60 text-[11px] space-y-1">
              {loadingKioskItems ? (
                <div className="text-blue-300">Loading kiosk items...</div>
              ) : (
                <>
                  <div>Total Items: {kioskState.kioskItems?.length || 0}</div>
                  <div>3D Items: {kioskItems3D.length}</div>
                  {kioskState.error && (
                    <div className="text-red-300">Error: {kioskState.error}</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>
    </div>
  );
}


