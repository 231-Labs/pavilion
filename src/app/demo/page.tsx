'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useThreeScene } from '../../hooks/scene/useThreeScene';
import { clearDemoStorage } from '../../utils/clearDemoStorage';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';
import { MOCK_2D_NFTS } from '../../config/nft-test-config';
import { SculptureControlPanel } from '../../components/panels/SculptureControlPanel';

function DemoContent() {
  const [walrusItems, setWalrusItems] = useState<any[]>([]);
  const [mockData] = useState<any[]>(MOCK_2D_NFTS);
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  // Clear storage on mount to ensure clean demo state
  useEffect(() => {
    clearDemoStorage();
    console.log('🎭 Demo mode initialized: clean state');
    console.log('🖼️ Auto-loaded mock 2D NFT data for demo mode');
  }, []);

  // Use Three.js scene management hook
  const {
    canvasRef,
    sceneManager,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale,
    loadKioskItems,
    clearKioskItems
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    sculptureControlPanelLoading,
  });

  // Analyze mock items and extract blob IDs
  useEffect(() => {
    if (mockData.length > 0 && sceneManager) {
      console.log(`🎯 Processing ${mockData.length} mock items in demo mode`);

      const converter = new KioskItemConverter(sceneManager);
      const analyses = converter.analyzeKioskItems(mockData);

      // Find Walrus blob IDs
      const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);

      if (foundWalrusItems.length > 0) {
        setWalrusItems(foundWalrusItems);
      } else {
        setWalrusItems([]);
      }

      // Load non-Walrus, non-image items directly
      const nonWalrusNonImageItems = mockData.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type !== 'walrus' && analysis.type !== 'image';
      });

      if (nonWalrusNonImageItems.length > 0) {
        loadKioskItems(nonWalrusNonImageItems);
      }
      
      // Log info about 2D images
      const imageItems = mockData.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type === 'image';
      });
      
      if (imageItems.length > 0) {
        console.log(`📸 Found ${imageItems.length} 2D image(s) - will be created on demand`);
      }
    } else {
      clearKioskItems();
    }
  }, [mockData, loadKioskItems, clearKioskItems, sceneManager]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

      {/* Main 3D Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

      {/* Liquid Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => window.location.href = '/'}
          className="glass-slab px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
          aria-label="Back to home"
        >
          <div className="flex items-center gap-2 text-white/70 group-hover:text-white/90 transition-colors">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
            >
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-semibold tracking-widest uppercase">Home</span>
          </div>
        </button>
      </div>

      {/* Right Control Panel */}
      <div className="absolute top-6 right-6 z-20">
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
          autoLoadBlobIds={walrusItems?.map(item => item.blobId).filter((blobId): blobId is string => typeof blobId === 'string' && blobId.trim().length > 0) || []}
          kioskItems={mockData}
          kioskId={undefined}
          kioskOwnerCapId={undefined}
          onTrackChange={() => {}} // No-op in demo mode
          initialDisplayedItems={new Set()}
          initialTransforms={new Map()}
          onLoadingStateChange={setSculptureControlPanelLoading}
          onListItems={undefined} // No listing in demo mode
          onDelistItem={undefined} // No delisting in demo mode
          mistToSui={(mist) => Number(mist) / 1_000_000_000} // Simple converter
        />
      </div>
      
      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-white">Loading...</div>}>
      <DemoContent />
    </Suspense>
  );
}

