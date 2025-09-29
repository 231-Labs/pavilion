import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import type { KioskData } from '../../types/home';

interface KioskSelectorProps {
  kiosks: KioskData[] | null;
  loading: boolean;
  selectedKioskId: string | null;
  onSelectKiosk: (kioskId: string) => void;
  emptyMessage?: string;
  showNames?: boolean;
}

export function KioskSelector({ 
  kiosks, 
  loading, 
  selectedKioskId, 
  onSelectKiosk, 
  emptyMessage = "No kiosks found.",
  showNames = false 
}: KioskSelectorProps) {
  const currentAccount = useCurrentAccount();

  return (
    <div 
      className="h-12 overflow-auto rounded border border-white/10"
      style={{
        width: 'clamp(280px, 35vw, 320px)'
      }}
    >
      {(kiosks && kiosks.length > 0) ? (
        <ul className="divide-y divide-white/10">
          {kiosks.map((k) => (
            <li
              key={k.objectId}
              className={`px-3 py-1 cursor-pointer transition-colors ${
                selectedKioskId === k.kioskId ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
              onClick={() => onSelectKiosk(k.kioskId)}
            >
              <div className="text-[11px] leading-tight text-white/85 truncate">
                {showNames && k.name && k.name.trim().length > 0
                  ? k.name
                  : (k.kioskId ? `${k.kioskId.slice(0, 8)}...${k.kioskId.slice(-6)}` : '')}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        loading ? (
          <div className="px-3 py-2 text-[12px] text-white/60">Loading...</div>
        ) : (
          !currentAccount ? (
            <div className="px-3 py-2 text-[12px] text-white/60">
              {showNames ? 'Connect wallet to view pavilions.' : 'Connect wallet to fetch Kiosks.'}
            </div>
          ) : (
            <div className="px-3 py-2 text-[12px] text-white/60">{emptyMessage}</div>
          )
        )
      )}
    </div>
  );
}
