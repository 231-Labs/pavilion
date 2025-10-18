'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ConnectButton } from '@mysten/dapp-kit';
import { useThreeScene } from '../../hooks/scene/useThreeScene';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { resolveKioskOwnerCapId } from '../../lib/blockchain/pavilion';
import { useObjectChanges } from '../../hooks/state/useObjectChanges';
import { SculptureControlPanel } from '../../components/panels/SculptureControlPanel';
import { WalletTerminal } from '../../components/panels/WalletTerminal';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';
import { SceneConfigManager } from '../../lib/three/SceneConfigManager';
import { SceneConfig } from '../../types/scene';
import { useNftListing } from '../../hooks/kiosk/useNftListing';
import { useOwnershipVerification } from '../../hooks/kiosk/useOwnershipVerification';
import { OwnershipVerificationModal } from '../../components/modals/OwnershipVerificationModal';

function ManageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kioskId = searchParams.get('kioskId');
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
  
  // SculptureControlPanel loading state
  const [sculptureControlPanelLoading, setSculptureControlPanelLoading] = useState<boolean>(false);

  // Ownership verification state
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [isOwnershipVerified, setIsOwnershipVerified] = useState<boolean>(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState<boolean>(false);
  const { verifyOwnership, isVerifying, verificationResult, clearVerification } = useOwnershipVerification();

  // Create a wrapper function for tracking changes
  const handleTrackChange = (objectId: string, objectName: string, property: string, fromValue: any, toValue: any) => {
    trackKioskNftChange(objectId, objectName, property, fromValue, toValue, new Set(), new Map());
  };

  // Handle listing items
  const handleListItems = async (items: Array<{ itemId: string; price: string }>) => {
    return listItems({ items, allKioskItems: kioskState.kioskItems || [] });
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

  // Show verification modal when page loads with kioskId and wallet connected
  useEffect(() => {
    if (kioskId && currentAccount) {
      setIsOwnershipVerified(false);
      setHasAttemptedVerification(false);
      setShowVerificationModal(true);
      clearVerification();
    }
  }, [kioskId, currentAccount, clearVerification]);

  // Auto-trigger verification when modal is first shown (not on retry)
  useEffect(() => {
    if (showVerificationModal && !isVerifying && !hasAttemptedVerification && currentAccount && kioskId && !isOwnershipVerified) {
      const timer = setTimeout(() => {
        handleVerifyOwnership();
        setHasAttemptedVerification(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVerificationModal, currentAccount, kioskId, isVerifying, isOwnershipVerified, hasAttemptedVerification]);

  // Handle successful verification
  useEffect(() => {
    if (verificationResult?.verified) {
      setIsOwnershipVerified(true);
      setShowVerificationModal(false);
    }
  }, [verificationResult]);

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

  // Initialize kiosk after ownership verification succeeds and scene is ready
  useEffect(() => {
    if (!isOwnershipVerified || !sceneManager || !kioskId || !currentAccount) return;
    
    const initializeKiosk = async () => {
      try {
        const capId = await resolveKioskOwnerCapId({
          kioskClient,
          ownerAddress: currentAccount.address,
          kioskId,
        });

        kioskState.setKioskFromIds({ 
          kioskId, 
          ...(capId && { kioskOwnerCapId: capId }) 
        });
      } catch (error) {
        console.error('Failed to resolve kiosk owner cap:', error);
        kioskState.setKioskFromIds({ kioskId });
      }
    };

    initializeKiosk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kioskId, currentAccount, kioskClient, isOwnershipVerified, sceneManager]);

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
    const itemsToProcess = kioskState.kioskItems || [];

    if (itemsToProcess.length > 0 && sceneManager) {
      const converter = new KioskItemConverter(sceneManager);
      const analyses = converter.analyzeKioskItems(itemsToProcess);

      // Find Walrus blob IDs
      const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);
      setWalrusItems(foundWalrusItems.length > 0 ? foundWalrusItems : []);

      // Load non-Walrus, non-image items directly
      const nonWalrusNonImageItems = itemsToProcess.filter(item => {
        const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
        return analysis && analysis.type !== 'walrus' && analysis.type !== 'image';
      });

      if (nonWalrusNonImageItems.length > 0) {
        loadKioskItems(nonWalrusNonImageItems);
      }
    } else {
      clearKioskItems();
    }
  }, [kioskState.kioskItems, loadKioskItems, clearKioskItems, sceneManager]);

  // Update current scene config when kiosk items change
  useEffect(() => {
    if (!sceneConfigManager || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
      setCurrentSceneConfig(null);
      return;
    }

    const config = sceneConfigManager.createSceneConfigFromKioskItems(
      kioskState.kioskItems,
      kioskState.kioskId || undefined,
      currentAccount?.address
    );

    setCurrentSceneConfig(config);
  }, [sceneConfigManager, kioskState.kioskItems, kioskState.kioskId, currentAccount]);

  // Load scene config from chain and sync to panel state
  useEffect(() => {
    const loadAndSyncSceneConfig = async () => {
      if (!sceneConfigManager || !kioskId || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
        return;
      }

      try {
        const savedConfig = await sceneConfigManager.loadSceneConfig(kioskId);
        if (savedConfig) {
          const { displayedNftItems, kioskNftTransforms } = sceneConfigManager.convertSceneConfigToPanelState(
            savedConfig, 
            kioskState.kioskItems
          );
          
          setPanelDisplayedItems(displayedNftItems);
          setPanelTransforms(kioskNftTransforms);
        } else {
          setPanelDisplayedItems(new Set());
          setPanelTransforms(new Map());
        }
      } catch (error) {
        console.warn('Failed to load scene config:', error);
        setPanelDisplayedItems(new Set());
        setPanelTransforms(new Map());
      }
    };

    const timeoutId = setTimeout(loadAndSyncSceneConfig, 500);
    return () => clearTimeout(timeoutId);
  }, [sceneConfigManager, kioskId, kioskState.kioskItems]);

  // Render early returns for missing requirements
  if (!kioskId) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        <p>No kiosk ID provided. Please select a kiosk from the home page.</p>
      </div>
    );
  }

  // Show wallet connect prompt over the scene
  const showWalletPrompt = !currentAccount;

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
          initialDisplayedItems={panelDisplayedItems}
          initialTransforms={panelTransforms}
          onLoadingStateChange={setSculptureControlPanelLoading}
          onListItems={handleListItems}
          onDelistItem={handleDelistItem}
          mistToSui={mistToSui}
        />
      </div>
      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>

      {/* Wallet Connection Prompt */}
      {showWalletPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center space-y-4">
            <p className="text-lg text-white">Please connect your wallet to manage this pavilion</p>
            <ConnectButton />
          </div>
        </div>
      )}

      {/* Ownership Verification Modal */}
      <OwnershipVerificationModal
        isOpen={showVerificationModal}
        isVerifying={isVerifying}
        verificationError={verificationResult?.error}
        onVerify={handleVerifyOwnership}
        onCancel={handleVerificationCancel}
        kioskId={kioskId}
      />
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-white">Loading...</div>}>
      <ManageContent />
    </Suspense>
  );
}
