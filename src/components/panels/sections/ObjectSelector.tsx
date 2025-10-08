'use client';

import React from 'react';
import { ControllableObject, KioskNftItem } from '../../../types/controlPanel';

interface ObjectSelectorProps {
  selectedId: string | null;
  onChangeSelected: (id: string) => void;
  displayedKioskItems: KioskNftItem[];
  controllableObjects: ControllableObject[];
}

export function ObjectSelector({
  selectedId,
  onChangeSelected,
  displayedKioskItems,
  controllableObjects,
}: ObjectSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
        Select Object
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => onChangeSelected(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40 control-select"
      >
        {displayedKioskItems.length > 0 && (
          <optgroup label="🎨 Kiosk NFTs">
            {displayedKioskItems.map((nftItem) => (
              <option key={nftItem.id} value={nftItem.id} className="bg-black text-white">
                {nftItem.name} | 0x{nftItem.id.slice(-6)}
              </option>
            ))}
          </optgroup>
        )}

        {controllableObjects.filter((obj) => obj.type === 'sculpture').length > 0 && (
          <optgroup label="🏛️ Sculptures">
            {controllableObjects
              .filter((obj) => obj.type === 'sculpture')
              .map((obj) => (
                <option key={obj.id} value={obj.id} className="bg-black text-white">
                  {obj.name}
                </option>
              ))}
          </optgroup>
        )}

        {controllableObjects.filter((obj) => obj.type === 'external').length > 0 && (
          <optgroup label="📦 External Models">
            {controllableObjects
              .filter((obj) => obj.type === 'external')
              .map((obj) => (
                <option key={obj.id} value={obj.id} className="bg-black text-white">
                  {obj.name}
                </option>
              ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}


