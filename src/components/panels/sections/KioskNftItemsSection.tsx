'use client';

import React, { useState } from 'react';
import { KioskNftItem } from '../../../types/controlPanel';

interface KioskNftItemsSectionProps {
  items: KioskNftItem[];
  displayedItemIds: Set<string>;
  isLoading: boolean;
  loadingProgress: number;
  loadingItemId: string | null;
  onToggleItem: (item: KioskNftItem, show: boolean) => void;
  onListItems?: (itemIds: string[], price: string) => Promise<void>;
}

export function KioskNftItemsSection({
  items,
  displayedItemIds,
  isLoading,
  loadingProgress,
  loadingItemId,
  onToggleItem,
  onListItems,
}: KioskNftItemsSectionProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [listPrice, setListPrice] = useState<string>('1');
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [isListing, setIsListing] = useState(false);

  if (items.length === 0) return null;

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleListSelected = async () => {
    if (!onListItems || selectedItems.size === 0) return;
    
    setIsListing(true);
    try {
      const itemIdsArray = Array.from(selectedItems);
      await onListItems(itemIdsArray, listPrice);
      setSelectedItems(new Set());
      setIsListingModalOpen(false);
    } catch (error) {
      console.error('Failed to list items:', error);
    } finally {
      setIsListing(false);
    }
  };

  const selectedCount = selectedItems.size;
  const allSelected = selectedItems.size === items.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
          Kiosk NFT Items
        </label>
        {onListItems && (
          <button
            onClick={() => setIsListingModalOpen(true)}
            disabled={selectedCount === 0}
            className={`px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all duration-200 ${
              selectedCount > 0
                ? 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/15 hover:border-white/30'
                : 'bg-white/5 text-white/40 border border-white/5 cursor-not-allowed'
            }`}
          >
            List ({selectedCount})
          </button>
        )}
      </div>

      {onListItems && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-black/10 rounded-lg border border-white/5">
          <button
            onClick={handleSelectAll}
            className="text-xs font-medium tracking-wide uppercase text-white/70 hover:text-white/90 transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-white/60">
            {selectedCount} / {items.length}
          </span>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
        {items.map((nftItem) => {
          const isDisplayed = displayedItemIds.has(nftItem.id);
          const isLoadingThisItem = isLoading && loadingItemId === nftItem.id;
          const isSelected = selectedItems.has(nftItem.id);
          
          return (
            <div
              key={nftItem.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-black/20 border-white/10'
              }`}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {onListItems && (
                  <label className="relative flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectItem(nftItem.id, e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 rounded-md border transition-all duration-300 flex items-center justify-center
                      ${isSelected 
                        ? 'bg-white/15 border-white/40 shadow-[0_0_8px_rgba(220,230,240,0.3)]' 
                        : 'bg-black/20 border-white/20 group-hover:border-white/30 group-hover:bg-white/5'
                      }
                    `}>
                      <svg 
                        className={`w-3.5 h-3.5 transition-all duration-300 ${
                          isSelected 
                            ? 'opacity-100 scale-100 text-white/90' 
                            : 'opacity-0 scale-50 text-white/60'
                        }`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth="3"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                    </div>
                  </label>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <div className="text-sm font-medium text-white/90 truncate">{nftItem.name}</div>
                    {(nftItem as any).resourceType && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        (nftItem as any).resourceType === '2d-image' 
                          ? 'bg-white/8 text-gray-300/90 border border-white/15' 
                          : 'bg-white/10 text-gray-200/90 border border-white/20'
                      }`}>
                        {(nftItem as any).resourceType === '2d-image' ? '2D' : '3D'}
                      </span>
                    )}
                    {nftItem.isListed && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        Listed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/60 truncate mt-0.5">
                    {nftItem.blobId ? `${nftItem.blobId.slice(0, 16)}...` : 'External URL'}
                  </div>
                </div>
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

      {/* List Items Modal */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-slab rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
            <h3 className="text-lg font-semibold text-white/95 mb-4 tracking-wide uppercase">
              List Items for Sale
            </h3>
            <p className="text-sm text-white/70 mb-4">
              List {selectedCount} NFT items for sale
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2 tracking-wide uppercase">
                Price (SUI)
              </label>
              <input
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                min="0"
                step="0.1"
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white/90 focus:outline-none focus:border-white/40 transition-colors"
                placeholder="Enter price in SUI"
              />
              <p className="text-xs text-white/50 mt-1">
                The price is in SUI.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsListingModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold tracking-wide uppercase rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white/90 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleListSelected}
                disabled={isListing || !listPrice || parseFloat(listPrice) <= 0}
                className={`flex-1 px-4 py-2 text-sm font-semibold tracking-wide uppercase rounded-lg transition-all ${
                  isListing || !listPrice || parseFloat(listPrice) <= 0
                    ? 'bg-white/5 text-white/40 border border-white/5 cursor-not-allowed'
                    : 'bg-white/15 text-white/95 border border-white/30 hover:bg-white/20 hover:border-white/40'
                }`}
              >
                {isListing ? 'Listing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


