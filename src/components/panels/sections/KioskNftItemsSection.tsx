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
  onListItems?: (items: Array<{ itemId: string; price: string }>) => Promise<void>;
  onDelistItem?: (itemId: string, itemType: string) => Promise<void>;
  mistToSui?: (mistAmount: string | number) => number;
}

export function KioskNftItemsSection({
  items,
  displayedItemIds,
  isLoading,
  loadingProgress,
  loadingItemId,
  onToggleItem,
  onListItems,
  onDelistItem,
  mistToSui,
}: KioskNftItemsSectionProps) {
  // Store selected items with their prices
  const [itemPrices, setItemPrices] = useState<Map<string, string>>(new Map());
  const [isListing, setIsListing] = useState(false);
  const [delistingItemId, setDelistingItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setItemPrices(prev => {
      const newMap = new Map(prev);
      if (selected) {
        // No default price, user must input
        newMap.set(itemId, '');
      } else {
        newMap.delete(itemId);
      }
      return newMap;
    });
  };

  const handlePriceChange = (itemId: string, price: string) => {
    setItemPrices(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, price);
      return newMap;
    });
  };

  const handleSelectAll = () => {
    // Filter out items that are already listed
    const unlistedItems = items.filter(item => !item.isListed);
    
    if (itemPrices.size === unlistedItems.length) {
      setItemPrices(new Map());
    } else {
      const newMap = new Map<string, string>();
      unlistedItems.forEach(item => newMap.set(item.id, ''));
      setItemPrices(newMap);
    }
  };

  const handleListSelected = async () => {
    if (!onListItems || itemPrices.size === 0) return;
    
    // Validate all prices
    const itemsToList = Array.from(itemPrices.entries())
      .filter(([_, price]) => price && parseFloat(price) > 0)
      .map(([itemId, price]) => ({ itemId, price }));
    
    if (itemsToList.length === 0) {
      alert('Please set a price for each selected item');
      return;
    }
    
    setIsListing(true);
    try {
      await onListItems(itemsToList);
      // Clear selected items after successful listing
      setItemPrices(new Map());
    } catch (error) {
      alert('Listing failed: ' + (error as Error).message);
    } finally {
      setIsListing(false);
    }
  };

  const handleDelist = async (itemId: string, itemType: string) => {
    if (!onDelistItem) return;
    
    setDelistingItemId(itemId);
    try {
      await onDelistItem(itemId, itemType);
      setExpandedItemId(null);
    } catch (error) {
      alert('Delisting failed: ' + (error as Error).message);
    } finally {
      setDelistingItemId(null);
    }
  };

  const selectedCount = itemPrices.size;
  const unlistedItemsCount = items.filter(item => !item.isListed).length;
  const allSelected = itemPrices.size === unlistedItemsCount && unlistedItemsCount > 0;
  const canList = selectedCount > 0 && Array.from(itemPrices.values()).every(price => price && parseFloat(price) > 0);

  return (
    <div className="space-y-2">
      {onListItems && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSelectAll}
            className="flex-1 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all duration-200 bg-white/10 text-white/90 border border-white/20 hover:bg-white/15 hover:border-white/30 whitespace-nowrap"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
            <span className="ml-2 text-white/60">
              {selectedCount}/{items.length}
            </span>
          </button>
          <button
            onClick={handleListSelected}
            disabled={!canList || isListing}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all duration-200 whitespace-nowrap ${
              canList && !isListing
                ? 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/15 hover:border-white/30'
                : 'bg-white/5 text-white/40 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isListing ? 'Listing...' : `List (${selectedCount})`}
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-90 overflow-y-auto scrollbar-hide">
        {items.map((nftItem) => {
          const isDisplayed = displayedItemIds.has(nftItem.id);
          const isLoadingThisItem = isLoading && loadingItemId === nftItem.id;
          const isSelected = itemPrices.has(nftItem.id);
          const currentPrice = itemPrices.get(nftItem.id) || '';
          const isExpanded = expandedItemId === nftItem.id;
          
          return (
            <div
              key={nftItem.id}
              className={`rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'bg-white/15 border-white/30 shadow-lg' 
                  : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/15'
              }`}
            >
              <div
                className={`flex items-center justify-between p-3 ${onListItems && !nftItem.isListed ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (onListItems && !nftItem.isListed) {
                    handleSelectItem(nftItem.id, !isSelected);
                  } else if (nftItem.isListed) {
                    setExpandedItemId(isExpanded ? null : nftItem.id);
                  }
                }}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0 pointer-events-none">
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
                        <span className="flex-shrink-0 px-2 py-[2px] text-[10px] font-semibold rounded-full leading-tight bg-white/8 text-gray-300/90 border border-white/15">
                          Listed
                        </span>
                      )}
                    </div>
                    {/* Item name on second line */}
                    <div className="text-sm font-medium text-white/90 truncate">{nftItem.name}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
              
              {/* Price section - Show when selected (not listed) OR expanded (listed) */}
              {((isSelected && onListItems && !nftItem.isListed) || (nftItem.isListed && isExpanded)) && (
                <div className="px-3 pb-2 pt-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-white/60 tracking-wide uppercase whitespace-nowrap">
                      Price:
                    </label>
                    
                    {nftItem.isListed ? (
                      <>
                        <div className="flex-1 text-xs text-white/80 py-0.5">
                          {nftItem.listPrice && mistToSui ? mistToSui(nftItem.listPrice).toFixed(4) : '0.0000'} SUI
                        </div>
                        {onDelistItem && nftItem.itemType && (
                          <span
                            onClick={() => !delistingItemId && handleDelist(nftItem.id, nftItem.itemType!)}
                            className={`text-[10px] font-bold underline transition-colors whitespace-nowrap ${
                              delistingItemId === nftItem.id
                                ? 'text-white/40 cursor-not-allowed'
                                : 'text-white/80 hover:text-white cursor-pointer'
                            }`}
                          >
                            {delistingItemId === nftItem.id ? '...' : 'DELIST'}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(nftItem.id, e.target.value)}
                          min="0"
                          step="0.0001"
                          className="flex-1 px-2 py-0.5 bg-black/30 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:border-white/40 transition-colors"
                          placeholder="0.0001"
                        />
                        <span className="text-[10px] font-medium text-white/60 tracking-wide uppercase">
                          SUI
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


