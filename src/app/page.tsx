'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@mysten/dapp-kit';

export default function Home() {
  const [kioskId, setKioskId] = useState('');
  const [mode, setMode] = useState<'collector' | 'designer'>('collector');

  return (
    <div className="relative min-h-screen w-full overflow-hidden film-noise flex flex-col">
      {/* Monochrome Liquid Glass Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0A0A0A] to-[#0F0F12]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.04),transparent_40%)]"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,255,255,0.06),transparent_50%)] mix-blend-overlay"></div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-white/10"></div>
        <div className="terminal-grid"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/70 to-white/20 shadow-[0_0_22px_rgba(200,200,220,0.5)]"></div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-[0.2em] uppercase select-none silver-glow">
            Pavilion
          </h1>
        </div>

        {/* Header Connect Wallet*/}
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

      {/* Main Content - Glass Ribbon Layout */}
      <main className="relative z-10 px-6 py-8 md:py-12 flex-1 grid place-items-center">
        <div className="architect-grid"></div>

        <section className="relative mx-auto max-w-6xl glass-ribbon rounded-xl border border-white/10 overflow-hidden -translate-y-4 md:-translate-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Brand & Narrative */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <p className="text-xs tracking-[0.35em] uppercase text-white/60 mb-4">Modernist Pavilion</p>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-[0.22em] uppercase leading-tight silver-glow">
                The Pavilion Protocol
              </h2>
              <p className="mt-5 text-white/70 max-w-md">
                A glass house for on-chain artifacts. Curate, compose, and transform kiosks into immersive pavilions.
              </p>
            </div>

            {/* Right: Actions - Single Frosted Glass Area (no inner panel) */}
            <div
              className="glass-slab glass-slab--thermal rounded-xl overflow-hidden p-6 md:p-8 self-center w-full min-h-[420px] md:min-h-[520px] lg:min-h-[560px]"
              onMouseMove={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                const rect = target.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * 100;
                const my = ((e.clientY - rect.top) / rect.height) * 100;
                target.style.setProperty('--mx', `${mx}`);
                target.style.setProperty('--my', `${my}`);
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.setProperty('--mx', `50`);
                target.style.setProperty('--my', `50`);
              }}
            >
                {/* Mode Toggle (Collector / Designer) */}
                <div className="px-5 py-4 slab-segment">
                  <div className="relative mx-auto w-[200px] sm:w-[220px] rounded-lg border border-white/20 bg-white/5 overflow-hidden">
                    <div
                      className="absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(50%-8px)] rounded-md bg-white/10 transition-transform duration-300"
                      style={{ transform: mode === 'designer' ? 'translateX(100%)' : 'translateX(0%)' }}
                      aria-hidden
                    />
                    <div className="relative z-10 grid grid-cols-2 text-center">
                      <button
                        onClick={() => setMode('collector')}
                        aria-pressed={mode === 'collector'}
                        className="py-2 text-xs uppercase tracking-widest font-semibold"
                      >
                        Collector
                      </button>
                      <button
                        disabled
                        aria-disabled="true"
                        title="Designer mode coming soon"
                        className="py-2 text-xs uppercase tracking-widest text-white/50 cursor-not-allowed"
                      >
                        Designer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Create Pavilion */}
                <button className="w-full text-left px-5 py-4 slab-segment">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base md:text-lg font-semibold tracking-wide">Create Pavilion</div>
                      <div className="text-white/60 text-xs mt-1 tracking-widest uppercase">Coming soon</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/10 text-white/80 border border-white/20 text-[10px] tracking-widest">NEW</div>
                  </div>
                </button>

                {/* Divider */}
                <div className="slab-divider" />

                {/* Turn Kiosk into Pavilion */}
                <div className="px-5 py-4 slab-segment">
                  <div className="text-base md:text-lg font-semibold tracking-wide">Turn a Kiosk into a Pavilion</div>
                  <div className="mt-3 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/60">Kiosk Object Id</label>
                    <input
                      value={kioskId}
                      onChange={(e) => setKioskId(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-2 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40"
                    />
                    <button className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest">Coming soon</button>
                  </div>
                </div>

                {/* Divider */}
                <div className="slab-divider" />

                {/* Dev: Demo Pavilion */}
                <Link href="/pavilion" className="block px-5 py-4 slab-segment">
                  <div className="text-xs tracking-widest uppercase text-white/70 mb-1">Developer</div>
                  <div className="text-base md:text-lg font-extrabold tracking-wide text-white">Enter Demo Pavilion</div>
                  <div className="text-white/60 text-xs mt-1">Temporary entry for development</div>
                </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Architectural Frame */}
      <div className="architect-frame" />
    </div>
  );
}
