'use client';

import React, { useState } from 'react';
import { KioskNftItem } from '../../../types/controlPanel';

interface VisitorNftItemsSectionProps {
  items: KioskNftItem[];
  displayedItemIds: Set<string>;
  onPurchaseItem: (itemId: string, itemType: string, price: string) => Promise<void>;
  mistToSui: (mistAmount: string | number) => number;
  isPurchasing: boolean;
  purchaseError: string | null;
  purchaseSuccess: boolean;
  transactionDigest: string | null;
  onClearStatus: () => void;
}

export function VisitorNftItemsSection({
  items,
  displayedItemIds,
  onPurchaseItem,
  mistToSui,
  isPurchasing,
  purchaseError,
  purchaseSuccess,
  transactionDigest,
  onClearStatus,
}: VisitorNftItemsSectionProps) {
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showOnlyForSale, setShowOnlyForSale] = useState(false);

  // Get blockchain explorer URL
  const getExplorerUrl = (digest: string) => {
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
    return `https://suiscan.xyz/${network}/tx/${digest}`;
  };

  // Filter to show items that are either:
  // 1. Listed for sale (should always be visible to visitors)
  // 2. Displayed in the scene (for unlisted items that owner chose to display)
  let visibleItems = items.filter(item => 
    item.isListed || displayedItemIds.has(item.id)
  );

  // Apply for sale filter if enabled
  if (showOnlyForSale) {
    visibleItems = visibleItems.filter(item => item.isListed);
  }

  if (visibleItems.length === 0) {
    return (
      <div className="text-xs text-white/50 text-center py-8">
        {showOnlyForSale ? 'No items for sale' : 'No items available for viewing or purchase'}
      </div>
    );
  }

  const handlePurchase = async (item: KioskNftItem) => {
    if (!item.itemType || !item.listPrice) {
      return;
    }

    if (isPurchasing || purchasingItemId) {
      return;
    }

    setPurchasingItemId(item.id);
    try {
      await onPurchaseItem(item.id, item.itemType, item.listPrice);
      setExpandedItemId(null);
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchasingItemId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold tracking-wide uppercase text-white/60">
          Items ({visibleItems.length})
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-wide uppercase text-white/50">
            For Sale
          </span>
          <button
            onClick={() => setShowOnlyForSale(!showOnlyForSale)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              showOnlyForSale ? 'bg-white/30' : 'bg-white/10'
            }`}
            role="switch"
            aria-checked={showOnlyForSale}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                showOnlyForSale ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-90 overflow-y-auto scrollbar-hide">
        {visibleItems.map((nftItem) => {
          const isExpanded = expandedItemId === nftItem.id;
          const isPurchasingThis = purchasingItemId === nftItem.id;
          
          return (
            <div
              key={nftItem.id}
              className="rounded-lg border transition-all duration-200 bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/15"
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setExpandedItemId(isExpanded ? null : nftItem.id)}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    {/* Tags on first line */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {(nftItem as any).resourceType && (
                        <span className={`flex-shrink-0 px-2 py-[2px] text-[10px] font-semibold rounded-full leading-tight ${
                          (nftItem as any).resourceType === '2d-image' 
                            ? 'bg-white/8 text-gray-300/90 border border-white/15' 
                            : 'bg-white/10 text-gray-200/90 border border-white/20'
                        }`}>
                          {(nftItem as any).resourceType === '2d-image' ? '2D' : '3D'}
                        </span>
                      )}
                      {nftItem.isListed && (
                        <span className="flex-shrink-0 px-2 py-[2px] text-[10px] font-semibold rounded-full leading-tight bg-white/8 text-gray-400/90 border border-white/15">
                          For Sale
                        </span>
                      )}
                    </div>
                    {/* Item name on second line */}
                    <div className="text-sm font-medium text-white/90 truncate">{nftItem.name}</div>
                  </div>
                </div>
                <div className="ml-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              {/* Expanded section with price and purchase button (only for listed items) */}
              {isExpanded && nftItem.isListed && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-medium text-white/60 tracking-wide uppercase mb-1">
                        Price
                      </div>
                      <div className="text-base font-bold text-white/90">
                        {nftItem.listPrice ? mistToSui(nftItem.listPrice).toFixed(4) : '0.0000'} SUI
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(nftItem);
                      }}
                      disabled={isPurchasingThis || isPurchasing}
                      className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all duration-200 ${
                        isPurchasingThis || isPurchasing
                          ? 'bg-white/5 text-white/40 border border-white/5 cursor-not-allowed'
                          : 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/15 hover:border-white/30'
                      }`}
                    >
                      {isPurchasingThis ? (
                        <span className="flex items-center space-x-2">
                          <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin"></div>
                          <span>Purchasing...</span>
                        </span>
                      ) : (
                        'Purchase'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Notifications - Moved to bottom */}
      {purchaseSuccess && (
        <div className="p-3 rounded-lg bg-black/20 border border-white/10 mt-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-xs font-semibold tracking-wide uppercase text-white/70 mb-1">
                Purchase Successful
              </div>
              <div className="text-xs text-white/70 break-words mb-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                The item has been transferred to your kiosk
              </div>
              {transactionDigest && (
                <a
                  href={getExplorerUrl(transactionDigest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white/90 transition-colors underline"
                >
                  <span>View on Explorer</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                  >
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
            </div>
            <button
              onClick={onClearStatus}
              className="ml-2 text-white/40 hover:text-white/70 transition-colors"
              title="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {purchaseError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mt-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-xs font-semibold tracking-wide uppercase text-red-400/90 mb-1">
                Purchase Failed
              </div>
              <div className="text-xs text-white/70 break-words break-all overflow-wrap-anywhere mb-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {purchaseError}
              </div>
              {transactionDigest && (
                <a
                  href={getExplorerUrl(transactionDigest)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-red-400/90 hover:text-red-300 transition-colors underline"
                >
                  <span>View on Explorer</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3"
                  >
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
            </div>
            <button
              onClick={onClearStatus}
              className="ml-2 text-white/40 hover:text-white/70 transition-colors"
              title="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

