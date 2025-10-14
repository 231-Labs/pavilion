'use client';

import { useState, useEffect } from 'react';
import { SceneManager } from '../../lib/three/SceneManager';
import { VisitorNftItemsSection } from './sections/VisitorNftItemsSection';
import { useModelLoader } from '../../hooks/scene/useModelLoader';
import { useNftItemsManager } from '../../hooks/nft/useNftItemsManager';
import { useNftPurchase } from '../../hooks/nft/useNftPurchase';

interface VisitorControlPanelProps {
  sceneManager?: SceneManager;
  autoLoadBlobIds?: string[];
  kioskItems?: any[];
  kioskId: string;
  initialDisplayedItems?: Set<string>;
  initialTransforms?: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>;
}

export function VisitorControlPanel({
  sceneManager,
  autoLoadBlobIds = [],
  kioskItems = [],
  kioskId,
  initialDisplayedItems,
  initialTransforms,
}: VisitorControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use model loader hook
  const modelLoader = useModelLoader(sceneManager);

  // Use NFT items manager hook
  const nftManager = useNftItemsManager({
    sceneManager,
    kioskItems,
    initialDisplayedItems: initialDisplayedItems || new Set(),
    initialTransforms: initialTransforms || new Map(),
    onTrackChange: undefined,
    isLoading: modelLoader.isLoading,
    setIsLoading: modelLoader.setIsLoading,
    loadingProgress: modelLoader.loadingProgress,
    setLoadingProgress: modelLoader.setLoadingProgress,
    loadedModels: modelLoader.loadedModels,
    setLoadedModels: modelLoader.setLoadedModels,
    setError: modelLoader.setError,
  });

  // Use purchase hook
  const { purchaseItem, isPurchasing, purchaseError, purchaseSuccess, transactionDigest, clearPurchaseStatus, mistToSui } = useNftPurchase();

  // Normalize loading state
  useEffect(() => {
    if (!nftManager.displayedNftItems.size && modelLoader.isLoading) {
      modelLoader.setIsLoading(false);
    }
  }, [nftManager.displayedNftItems, modelLoader.isLoading]);

  // Auto-load blob IDs
  useEffect(() => {
    if (autoLoadBlobIds.length > 0 && sceneManager && !modelLoader.isLoading) {
      const loadBlobIdsSequentially = async () => {
        for (const blobId of autoLoadBlobIds) {
          if (!blobId || typeof blobId !== 'string' || !blobId.trim()) {
            continue;
          }

          const modelName = `Walrus_${blobId.slice(0, 8)}`;
          if (modelLoader.loadedModels.includes(modelName)) {
            continue;
          }

          modelLoader.setWalrusBlobId(blobId);
          await modelLoader.loadWalrusModel(blobId);
        }
      };

      loadBlobIdsSequentially();
    }
  }, [autoLoadBlobIds, sceneManager, modelLoader.isLoading, modelLoader.loadedModels, modelLoader.loadWalrusModel]);

  // Handle purchase
  const handlePurchase = async (itemId: string, itemType: string, price: string) => {
    await purchaseItem({
      itemId,
      itemType,
      price,
      sellerKiosk: kioskId,
    });
  };

  return (
    <div className="glass-slab glass-slab--thermal rounded-xl control-panel max-w-xs min-w-[320px] overflow-hidden" style={{ fontSize: '14px' }}>
      {/* Title bar */}
      <div
        className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="elegant-title tracking-wider uppercase silver-glow">
          Gallery
        </h3>
        <div className="flex items-center space-x-2">
          <span className="elegant-expand-text font-medium tracking-wide">
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
          <span className="elegant-expand-arrow" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Control panel content */}
      {isExpanded && (
        <div className="space-y-3" style={{ fontSize: '13px' }}>
          {/* Assets Display */}
          <div className="pt-2 px-3 pb-3">
            {nftManager.kioskNftItems.length > 0 ? (
              <VisitorNftItemsSection
                items={nftManager.kioskNftItems}
                displayedItemIds={nftManager.displayedNftItems}
                onPurchaseItem={handlePurchase}
                mistToSui={mistToSui}
                isPurchasing={isPurchasing}
                purchaseError={purchaseError}
                purchaseSuccess={purchaseSuccess}
                transactionDigest={transactionDigest}
                onClearStatus={clearPurchaseStatus}
              />
            ) : (
              <div className="text-xs text-white/50 text-center py-8">
                No items in this pavilion
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

