'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [kioskId, setKioskId] = useState('');

  return (
    <div className="relative min-h-screen w-full overflow-hidden film-noise">
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

        {/* Temporary Dev Entry - Silver Highlight */}
        <Link href="/pavilion" className="px-4 py-2 rounded-md border border-white/30 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors font-semibold uppercase tracking-widest shadow-[0_0_12px_rgba(200,200,220,0.25)]">
          Demo Pavilion
        </Link>
      </header>

      {/* Main Content - Glass Ribbon Layout */}
      <main className="relative z-10 px-6 py-12 md:py-16">
        <div className="architect-grid"></div>

        <section className="relative mx-auto max-w-6xl glass-ribbon rounded-xl border border-white/10 overflow-hidden">
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
              className="glass-slab glass-slab--thermal rounded-xl overflow-hidden p-8 md:p-12"
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
                {/* Create Pavilion */}
                <button className="w-full text-left p-5 slab-segment">
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
                <div className="p-5 slab-segment">
                  <div className="text-base md:text-lg font-semibold tracking-wide">Turn a Kiosk into a Pavilion</div>
                  <div className="text-white/60 text-xs mt-1 tracking-widest uppercase">Provide kiosk object id</div>
                  <div className="mt-4 space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/60">Kiosk Object Id</label>
                    <input
                      value={kioskId}
                      onChange={(e) => setKioskId(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-white/40"
                    />
                    <button className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest">Coming soon</button>
                  </div>
                </div>

                {/* Divider */}
                <div className="slab-divider" />

                {/* Dev: Demo Pavilion */}
                <Link href="/pavilion" className="block p-5 slab-segment">
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
