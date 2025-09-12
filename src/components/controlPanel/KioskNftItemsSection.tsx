'use client';

import React from 'react';
import { KioskNftItem } from '../../types/controlPanel';

interface KioskNftItemsSectionProps {
  items: KioskNftItem[];
  displayedItemIds: Set<string>;
  isLoading: boolean;
  loadingProgress: number;
  loadingItemId: string | null;
  onToggleItem: (item: KioskNftItem, show: boolean) => void;
}

export function KioskNftItemsSection({
  items,
  displayedItemIds,
  isLoading,
  loadingProgress,
  loadingItemId,
  onToggleItem,
}: KioskNftItemsSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
        Kiosk NFT Items
      </label>
      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
        {items.map((nftItem) => {
          const isDisplayed = displayedItemIds.has(nftItem.id);
          const isLoadingThisItem = isLoading && loadingItemId === nftItem.id;
          return (
            <div
              key={nftItem.id}
              className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{nftItem.name}</div>
                <div className="text-xs text-white/60 truncate">{nftItem.blobId.slice(0, 16)}...</div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                {isLoadingThisItem && (
                  <div className="text-sm text-white/70">{loadingProgress}%</div>
                )}
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isDisplayed}
                      onChange={(e) => onToggleItem(nftItem, e.target.checked)}
                      disabled={isLoading}
                      className="sr-only"
                    />
                    <div
                      className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                        isDisplayed ? 'bg-white/30' : 'bg-white/10'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${
                          isDisplayed ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </div>
                  </div>
                  <span className="ml-3 text-xs font-medium tracking-wide uppercase text-white/80">
                    Show
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


