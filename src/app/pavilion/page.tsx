'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useThreeScene } from '../../hooks/scene/useThreeScene';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { resolveKioskOwnerCapId } from '../../lib/tx/pavilion/index';
import { useObjectChanges } from '../../hooks/state/useObjectChanges';
import { SculptureControlPanel } from '../../components/panels/SculptureControlPanel';
import { WalletTerminal } from '../../components/panels/WalletTerminal';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { clearDemoStorage } from '../../utils/clearDemoStorage';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';
import { SceneConfigManager } from '../../lib/three/SceneConfigManager';
import { SceneConfig } from '../../types/scene';
import { MOCK_2D_NFTS } from '../../config/nft-test-config';
import { useNftListing } from '../../hooks/kiosk/useNftListing';
import { useOwnershipVerification } from '../../hooks/kiosk/useOwnershipVerification';
import { OwnershipVerificationModal } from '../../components/modals/OwnershipVerificationModal';

function PavilionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kioskId = searchParams.get('kioskId');
  const isDemoMode = !kioskId; // Demo mode when no specific kiosk ID is provided
  const kioskState = useKioskState();
  const { objectChanges, trackKioskNftChange, clearChanges } = useObjectChanges();
  const [walrusItems, setWalrusItems] = useState<any[]>([]);
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const { listItems, delistItem, mistToSui } = useNftListing();
  const [currentSceneConfig, setCurrentSceneConfig] = useState<SceneConfig | null>(null);
  const [sceneConfigManager, setSceneConfigManager] = useState<SceneConfigManager | null>(null);
  
  // Panel state for scene restoration
  const [panelDisplayedItems, setPanelDisplayedItems] = useState<Set<string>>(new Set());
  const [panelTransforms, setPanelTransforms] = useState<Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>>(new Map());
  const [injectedMockData, setInjectedMockData] = useState<any[]>([]);
  
  // SculptureControlPanel loading state
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  // Ownership verification state (only for non-demo mode)
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [isOwnershipVerified, setIsOwnershipVerified] = useState<boolean>(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState<boolean>(false);
  const { verifyOwnership, isVerifying, verificationResult, clearVerification } = useOwnershipVerification();

  // Memoize combined kiosk items to ensure proper re-rendering
  const combinedKioskItems = React.useMemo(() => {
    return [...(kioskState.kioskItems || []), ...injectedMockData];
  }, [kioskState.kioskItems, injectedMockData]);

  // Create a wrapper function for tracking changes
  const handleTrackChange = (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => {
    trackKioskNftChange(objectId, objectName, property, fromValue, toValue, new Set(), new Map());
  };

  // Handle listing items
  const handleListItems = async (items: Array<{ itemId: string; price: string }>) => {
    // Get all kiosk items to find the item types
    const allKioskItems = combinedKioskItems;
    
    // Use the listing hook
    return listItems({ items, allKioskItems });
  };

  // Handle delisting an item
  const handleDelistItem = async (itemId: string, itemType: string) => {
    return delistItem({ itemId, itemType });
  };

  // Handle ownership verification
  const handleVerifyOwnership = async () => {
    if (!kioskId || !currentAccount) return;
    await verifyOwnership(kioskId);
  };

  // Handle verification cancellation
  const handleVerificationCancel = () => {
    setShowVerificationModal(false);
    router.push('/');
  };

  // Show verification modal when page loads with kioskId and wallet connected (non-demo mode)
  useEffect(() => {
    if (kioskId && currentAccount && !isDemoMode) {
      setIsOwnershipVerified(false);
      setHasAttemptedVerification(false);
      setShowVerificationModal(true);
      clearVerification();
    }
  }, [kioskId, currentAccount, isDemoMode, clearVerification]);

  // Auto-trigger verification when modal is first shown (not on retry)
  useEffect(() => {
    if (showVerificationModal && !isVerifying && !hasAttemptedVerification && currentAccount && kioskId && !isOwnershipVerified && !isDemoMode) {
      const timer = setTimeout(() => {
        handleVerifyOwnership();
        setHasAttemptedVerification(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVerificationModal, currentAccount, kioskId, isVerifying, isOwnershipVerified, hasAttemptedVerification, isDemoMode]);

  // Handle successful verification
  useEffect(() => {
    if (verificationResult?.verified && !isDemoMode) {
      setIsOwnershipVerified(true);
      setShowVerificationModal(false);
    }
  }, [verificationResult, isDemoMode]);

  // Clear storage and ensure clean state in Demo mode, then auto-load mock data
  useEffect(() => {
    if (isDemoMode) {
      clearDemoStorage();
      console.log('🎭 Demo mode initialized: clean state');
      
      // Auto-inject mock 2D NFT data for demo
      setInjectedMockData(MOCK_2D_NFTS);
      console.log('🖼️ Auto-loaded mock 2D NFT data for demo mode');
      
      // In demo mode, skip verification
      setIsOwnershipVerified(true);
    }
  }, [isDemoMode]);

  // Handle kioskId parameter - update kiosk state for WalletTerminal display
  // Only initialize after ownership verification succeeds
  useEffect(() => {
    const initializeKiosk = async () => {
      if (kioskId && currentAccount && isOwnershipVerified) {
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
  }, [kioskId, currentAccount, kioskClient, kioskState, isOwnershipVerified]);

  // Process kiosk content when kiosk state changes (content is already fetched by kioskState)
  useEffect(() => {
    const kioskItems = kioskState.kioskItems;

    if (kioskItems && kioskItems.length > 0) {
      // console.log(`Processing ${kioskItems.length} items from kiosk state`);

    } else if (kioskId && !kioskState.loading) {
      // console.log('No items found in kiosk or still loading');
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
    loadKioskItems,
    clearKioskItems
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    // backgroundColor: 0xFFFFFF,
    cameraPosition: [0, 1.6, 8],
    createGallery: true,
    enableKioskItems: true,
    // Pass SculptureControlPanel loading state
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
    const itemsToProcess = isDemoMode 
      ? combinedKioskItems
      : (kioskState.kioskItems || []);

    if (itemsToProcess.length > 0) {
      // Analyze kiosk items to find blob IDs
      if (!sceneManager) {
        console.warn('SceneManager not available for kiosk item analysis');
        return;
      }

      console.log(`🎯 Processing ${itemsToProcess.length} items${isDemoMode ? ' (Demo mode with mock data)' : ''}`);

      const converter = new KioskItemConverter(sceneManager);
      const analyses = converter.analyzeKioskItems(itemsToProcess);

      // Find Walrus blob IDs
      const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);

      if (foundWalrusItems.length > 0) {
        setWalrusItems(foundWalrusItems);
      } else {
        setWalrusItems([]);
      }

      // Load non-Walrus, non-image items directly (images are handled by SculptureControlPanel on demand)
      const nonWalrusNonImageItems = itemsToProcess.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type !== 'walrus' && analysis.type !== 'image';
      });

      if (nonWalrusNonImageItems.length > 0) {
        loadKioskItems(nonWalrusNonImageItems);
      }
      
      // Log info about 2D images (they will be handled by SculptureControlPanel)
      const imageItems = itemsToProcess.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type === 'image';
      });
      
      if (imageItems.length > 0) {
        console.log(`📸 Found ${imageItems.length} 2D image(s) - will be created on demand via SculptureControlPanel`);
      }
    } else {
      // Clear 3D scene if no kiosk items
      clearKioskItems();
    }
  }, [combinedKioskItems, isDemoMode, loadKioskItems, clearKioskItems, sceneManager, kioskState.kioskItems]);

  // Update current scene config when kiosk items change
  useEffect(() => {
    if (!sceneConfigManager) {
      setCurrentSceneConfig(null);
      return;
    }

    const itemsToProcess = isDemoMode 
      ? combinedKioskItems
      : (kioskState.kioskItems || []);

    if (itemsToProcess.length === 0) {
      setCurrentSceneConfig(null);
      return;
    }

    const config = sceneConfigManager.createSceneConfigFromKioskItems(
      itemsToProcess,
      isDemoMode ? undefined : (kioskState.kioskId || undefined),
      currentAccount?.address
    );

    setCurrentSceneConfig(config);
  }, [sceneConfigManager, combinedKioskItems, isDemoMode, kioskState.kioskId, currentAccount, kioskState.kioskItems]);

  // Load scene config from chain and sync to panel state (skip in Demo mode)
  useEffect(() => {
    if (isDemoMode) {
      // In Demo mode, don't load from chain, just reset to clean state
      console.log('🎭 Demo mode: skipping on chain config loading');
      setPanelDisplayedItems(new Set());
      setPanelTransforms(new Map());
      return;
    }

    const loadAndSyncSceneConfig = async () => {
      if (!sceneConfigManager || !kioskId || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
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
  }, [sceneConfigManager, kioskId, kioskState.kioskItems, isDemoMode]);

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
        kioskItems={combinedKioskItems}
        onSaveSuccess={clearChanges}
        onSaveError={(error) => console.error('Save error:', error)}
      />

      {/* Right Control Panels */}
      <div className="absolute top-6 right-6 z-20">
        {/* Sculpture Control Panel with Integrated GLB Loader */}
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
          autoLoadBlobIds={walrusItems?.map(item => item.blobId).filter((blobId): blobId is string => typeof blobId === 'string' && blobId.trim().length > 0) || []}
          kioskItems={combinedKioskItems}
          kioskId={isDemoMode ? undefined : (kioskState.kioskId || undefined)}
          kioskOwnerCapId={isDemoMode ? undefined : (kioskState.kioskOwnerCapId || undefined)}
          onTrackChange={handleTrackChange}
          // Pass panel state for scene restoration
          initialDisplayedItems={panelDisplayedItems}
          initialTransforms={panelTransforms}
          // Loading state callback
          onLoadingStateChange={setSculptureControlPanelLoading}
          // List items handler
          onListItems={isDemoMode ? undefined : handleListItems}
          // Delist item handler
          onDelistItem={isDemoMode ? undefined : handleDelistItem}
          // MIST to SUI converter
          mistToSui={mistToSui}
        />
      </div>
      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>

      {/* Ownership Verification Modal */}
      {!isDemoMode && (
        <OwnershipVerificationModal
          isOpen={showVerificationModal}
          isVerifying={isVerifying}
          verificationError={verificationResult?.error}
          onVerify={handleVerifyOwnership}
          onCancel={handleVerificationCancel}
          kioskId={kioskId || ''}
        />
      )}
    </div>
  );
}

export default function PavilionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-white">Loading...</div>}>
      <PavilionContent />
    </Suspense>
  );
}
