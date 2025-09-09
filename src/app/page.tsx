'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../components/KioskClientProvider';
import { buildCreatePavilionTx, fetchKioskContents } from '../lib/tx/pavilion';
import { useKioskState } from '../components/KioskStateProvider';

export default function Home() {
  const [kioskId, setKioskId] = useState('');
  const [mode, setMode] = useState<'collector' | 'designer'>('collector');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [pavilionName, setPavilionName] = useState('');
  const [createdKioskId, setCreatedKioskId] = useState<string | null>(null);
  const [createdKioskCapId, setCreatedKioskCapId] = useState<string | null>(null);
  const [kioskItems, setKioskItems] = useState<any[] | null>(null);
  const kioskState = useKioskState();

  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
          showEvents: false,
        },
      }),
  });

  const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;

  const onCreatePavilion = async () => {
    setError(null);
    setTxDigest(null);
    if (!currentAccount) {
      setError('Please connect your wallet');
      return;
    }
    if (!PAVILION_PACKAGE_ID) {
      setError('Missing NEXT_PUBLIC_PAVILION_PACKAGE_ID environment variable');
      return;
    }
    if (!pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }

    setCreating(true);
    try {
      const tx = await buildCreatePavilionTx({
        kioskClient,
        packageId: PAVILION_PACKAGE_ID,
        pavilionName,
        ownerAddress: currentAccount.address,
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = (result as any)?.digest ?? null;
      setTxDigest(digest);
      // console.log('Create Pavilion tx result:', result);

      // Extract new kiosk & cap ids directly from objectChanges and fetch kiosk contents
      // TODO: find simpler way to do this
      try {
        const changes = (result as any)?.objectChanges ?? [];
        let kioskIdNew: string | undefined;
        let kioskOwnerCapIdNew: string | undefined;
        for (const ch of changes) {
          if (ch.type !== 'created') continue;
          const t = (ch as any).objectType as string | undefined;
          const id = (ch as any).objectId as string | undefined;
          if (!t || !id) continue;
          if (t.endsWith('::kiosk::Kiosk')) kioskIdNew = id;
          if (t.endsWith('::kiosk::KioskOwnerCap')) kioskOwnerCapIdNew = id;
        }
        if (kioskIdNew) setCreatedKioskId(kioskIdNew);
        if (kioskOwnerCapIdNew) setCreatedKioskCapId(kioskOwnerCapIdNew);
        if (kioskIdNew || kioskOwnerCapIdNew) kioskState.setKioskFromIds({ kioskId: kioskIdNew, kioskOwnerCapId: kioskOwnerCapIdNew });
        if (kioskIdNew) {
          const data = await fetchKioskContents({ kioskClient, kioskId: kioskIdNew });
          setKioskItems(data.items ?? []);
        // TODO: to be removed
        // console.log(kioskIdNew);
        // console.log(kioskOwnerCapIdNew);
        console.log(data.items);
        }
      } catch (parseErr) {
        console.warn('Failed to parse kiosk ids from tx:', parseErr);
      }
    } catch (e) {
      setError((e as Error).message ?? 'Create Pavilion transaction failed');
    } finally {
      setCreating(false);
    }
  };

  const onMainAction = async () => {
    if (txDigest) {
      router.push('/pavilion');
      return;
    }
    if (!pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }
    await onCreatePavilion();
  };

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
                <div className="w-full px-5 py-4 slab-segment">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div>
                        <div className="text-base md:text-lg font-semibold tracking-wide">Create Pavilion</div>
                        <div className="text-white/70 text-xs mt-1 tracking-widest uppercase flex items-center">
                          <span>{creating ? 'Processing...' : (txDigest ? 'Enter pavilion' : 'Creates a new Kiosk and initializes it')}</span>
                          {txDigest && (
                            <a
                              href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="View on SuiScan"
                              className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white/90 transition-colors info-pop-in"
                            >
                              <span className="text-[10px] leading-none font-semibold normal-case relative">i</span>
                            </a>
                          )}
                        </div>
                        <div className="mt-3">
                          <label className="text-[14px] uppercase tracking-widest text-white/70">Pavilion Name: </label>
                          <input
                            value={pavilionName}
                            onChange={(e) => setPavilionName(e.target.value)}
                            placeholder=" ≤ 20 chars"
                            maxLength={20}
                            required
                            aria-required="true"
                            className="mt-1 w-[200px] bg-transparent px-0 py-1 border-0 border-b border-white/40 focus:outline-none focus:border-white/70 text-white text-sm placeholder:text-xs placeholder:text-white/45"
                          />
                        </div>
                      </div>
                      
                    </div>
                    <button
                      onClick={onMainAction}
                      disabled={creating}
                      title={!pavilionName.trim() ? 'Pavilion name is required' : undefined}
                      aria-label={txDigest ? 'Enter pavilion' : 'Create pavilion'}
                      className={`group relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all disabled:opacity-60 ${txDigest ? 'bg-white/15 border-white/30 shadow-[0_0_22px_rgba(200,200,220,0.35)] ring-1 ring-white/20' : 'bg-white/10 border-white/20'}`}
                    >
                      {txDigest ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-white/85 transition-transform duration-200 group-hover:scale-110"
                        >
                          <rect x="6" y="4" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="14" cy="12" r="1" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5"
                        >
                          <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="px-5 py-3 text-[12px] text-red-300">{error}</div>
                )}
                {/* Divider */}
                <div className="slab-divider" />

                {/* Turn Kiosk into Pavilion */}
                <div className="w-full px-5 py-4 slab-segment">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base md:text-lg font-semibold tracking-wide">Turn a Kiosk into a Pavilion</div>
                      <div className="text-white/70 text-xs mt-1 tracking-widest uppercase">Initialize an existing Kiosk</div>
                      <div className="mt-3">
                        <label className="text-[14px] uppercase tracking-widest text-white/70">Kiosk Object ID: </label>
                        <input
                          value={kioskId}
                          onChange={(e) => setKioskId(e.target.value)}
                          placeholder="0x..."
                          className="w-[280px] bg-transparent px-0 py-1 border-0 border-b border-white/40 focus:outline-none focus:border-white/70 text-white text-sm placeholder:text-xs placeholder:text-white/45"
                        />
                      </div>
                    </div>
                    <button
                      disabled
                      aria-label="Coming soon"
                      className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all disabled:opacity-60 bg-white/10 border-white/20"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 text-white/80"
                      >
                        <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
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

                {/* Kiosk items list (if available) */}
                {kioskItems && kioskItems.length > 0 && (
                  <div className="px-5 py-4 slab-segment">
                    <div className="text-xs tracking-widest uppercase text-white/70 mb-2">Kiosk Items</div>
                    <ul className="space-y-2 text-white/85 text-[12px]">
                      {kioskItems.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span className="truncate max-w-[70%]">{it.objectId}</span>
                          <span className="opacity-75 truncate max-w-[30%]">{it.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </section>
      </main>

      {/* Architectural Frame */}
      <div className="architect-frame" />
    </div>
  );
}
