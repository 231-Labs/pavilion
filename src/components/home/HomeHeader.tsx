import React from 'react';
import { ConnectButton } from '@mysten/dapp-kit';

export function HomeHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-8 py-6">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/70 to-white/20 shadow-[0_0_22px_rgba(200,200,220,0.5)]"></div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.2em] uppercase select-none silver-glow">
          Pavilion
        </h1>
      </div>

      {/* Connect Wallet */}
      <div className="flex items-center mt-1">
        <ConnectButton
          style={{
            height: '40px',
            padding: '0 14px',
            lineHeight: '1',
          }}
        />
      </div>
    </header>
  );
}
