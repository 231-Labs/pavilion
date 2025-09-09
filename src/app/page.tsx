'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../components/KioskClientProvider';
import { buildCreatePavilionTx, buildInitializePavilionWithExistingKioskTx, fetchKioskContents } from '../lib/tx/pavilion';
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
  const [createSubMode, setCreateSubMode] = useState<'new' | 'existing'>('new');
  const [ownedKiosks, setOwnedKiosks] = useState<{ objectId: string; kioskId: string; isPersonal?: boolean }[] | null>(null);
  const [fetchingKiosks, setFetchingKiosks] = useState(false);
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
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

  // Auto-fetch owned kiosks when wallet connects/changes
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!currentAccount) {
        setOwnedKiosks(null);
        setSelectedKioskId(null);
        return;
      }
      try {
        setFetchingKiosks(true);
        const res = await kioskClient.getOwnedKiosks({ address: currentAccount.address });
        if (aborted) return;

        // Filter out kiosks that already have PavilionExtension installed
        const pavilionExtensionType = process.env.NEXT_PUBLIC_PAVILION_EXTENSION_TYPE as string | undefined;
        if (!pavilionExtensionType) {
          console.error('Missing NEXT_PUBLIC_PAVILION_EXTENSION_TYPE environment variable');
          setOwnedKiosks(null);
          return;
        }
        const initialList = (res.kioskOwnerCaps ?? []).map((c: any) => ({
          objectId: c.objectId,
          kioskId: c.kioskId,
          isPersonal: c.isPersonal
        }));

        // Check each kiosk for PavilionExtension
        const filteredList = [];
        for (const kiosk of initialList) {
          if (aborted) return;
          try {
            // Try to get the extension
            const extension = await kioskClient.getKioskExtension({
              kioskId: kiosk.kioskId,
              type: pavilionExtensionType
            });
            console.log(`Kiosk ${kiosk.kioskId} - PavilionExtension result:`, extension);

            // Check if extension exists (not null)
            if (extension && extension.isEnabled !== false) {
              // Extension exists and is enabled, skip this kiosk
              console.log(`Skipping kiosk ${kiosk.kioskId} - PavilionExtension already installed`);
            } else {
              // Extension doesn't exist or is disabled, include this kiosk
              console.log(`Including kiosk ${kiosk.kioskId} - PavilionExtension not found or disabled`);
              filteredList.push(kiosk);
            }
          } catch (extensionError) {
            // If there's an error, assume extension doesn't exist and include the kiosk
            console.log(`Kiosk ${kiosk.kioskId} - Error checking PavilionExtension, including in list. Error:`, extensionError);
            filteredList.push(kiosk);
          }
        }

        setOwnedKiosks(filteredList);
      } catch (e) {
        if (aborted) return;
        console.error('Failed to fetch kiosks:', e);
      } finally {
        if (!aborted) setFetchingKiosks(false);
      }
    };
    void run();
    return () => { aborted = true; };
  }, [currentAccount, kioskClient]);

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
    if (createSubMode === 'new' && !pavilionName.trim()) {
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
    if (createSubMode === 'new' && !pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }
    if (createSubMode === 'existing') {
      if (!currentAccount) {
        setError('Please connect your wallet');
        return;
      }
      if (!selectedKioskId) {
        setError('Please select a kiosk');
        return;
      }
      const cap = (ownedKiosks || []).find((k) => k.kioskId === selectedKioskId)?.objectId;
      if (!cap) {
        setError('Missing kiosk cap for selected kiosk');
        return;
      }
      setCreating(true);
      try {
        setError(null);
        const tx = await buildInitializePavilionWithExistingKioskTx({
          kioskClient,
          packageId: PAVILION_PACKAGE_ID!,
          pavilionName: pavilionName || 'Pavilion',
          ownerAddress: currentAccount.address,
          kioskId: selectedKioskId,
          kioskOwnerCapId: cap,
        });
        const result = await signAndExecuteTransaction({ transaction: tx });
        const digest = (result as any)?.digest ?? null;
        setTxDigest(digest);
        // set global kiosk state so /pavilion and Wallet panel can reflect selection
        kioskState.setKioskFromIds({ kioskId: selectedKioskId, kioskOwnerCapId: cap });
        // parse kiosk items for preview
        try {
          const data = await fetchKioskContents({ kioskClient, kioskId: selectedKioskId });
          setKioskItems(data.items ?? []);
        } catch {}
      } catch (e) {
        setError((e as Error).message || 'Failed to initialize pavilion with existing kiosk');
      } finally {
        setCreating(false);
      }
      return;
    }
    await onCreatePavilion();
  };

  const onSlabClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, svg, select, textarea, [role="button"]')) return;
    if (error) setError(null);
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

              {/* Demo Pavilion Section */}
              <div className="mt-6">
                <Link
                  href="/pavilion?kioskId=0x1"
                  className="group inline-flex items-center space-x-3 text-white/70 hover:text-white/90 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="relative">
                    <div className="text-sm font-medium tracking-wide silver-glow relative">
                      Demo Pavilion
                      {/* Elegant underline */}
                      <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    {/* Subtle glow effect on hover */}
                    <div className="absolute inset-0 text-sm font-medium tracking-wide text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[0.5px]">
                      Demo Pavilion
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/20 group-hover:bg-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 text-current group-hover:translate-x-0.5 transition-transform duration-200"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right: Actions - Single Frosted Glass Area (no inner panel) */}
            <div
              className="glass-slab glass-slab--thermal rounded-xl overflow-hidden p-6 md:p-8 self-center w-full min-h-[420px] md:min-h-[520px] lg:min-h-[560px]"
              onClick={onSlabClick}
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
                <div className="w-full px-5 py-4 slab-segment min-h-[200px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div>
                        <div className="text-base md:text-lg font-semibold tracking-wide">Create Pavilion</div>
                        {/* Sub-mode toggle - small capsule buttons */}
                        <div className="mt-2 mb-3 flex items-center space-x-1 text-[10px] tracking-wide uppercase">
                          <button
                            onClick={() => setCreateSubMode('new')}
                            aria-pressed={createSubMode === 'new'}
                            className={`px-2 py-[2px] rounded-full border transition-colors ${createSubMode === 'new' ? 'bg-white/15 border-white/30 text-white/90' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'}`}
                          >
                            New Kiosk
                          </button>
                          <button
                            onClick={() => setCreateSubMode('existing')}
                            aria-pressed={createSubMode === 'existing'}
                            className={`px-2 py-[2px] rounded-full border transition-colors ${createSubMode === 'existing' ? 'bg-white/15 border-white/30 text-white/90' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'}`}
                          >
                            Existing Kiosk
                          </button>
                        </div>
                        {txDigest ? (
                          <div className="mt-5 mb-5">
                            <div className="flex items-center justify-center">
                              <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent text-[13px] md:text-sm font-extrabold tracking-[0.3em] animate-pulse">Pavilion Created</span>
                              <a
                                href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="View on SuiScan"
                                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white/90 transition-colors info-pop-in"
                              >
                                <span className="text-[10px] leading-none font-semibold normal-case relative">i</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/70 text-xs mt-1 tracking-widest uppercase flex items-center">
                            <span>
                              {createSubMode === 'new'
                                ? (creating ? 'Processing...' : 'Creates a new Kiosk and initializes it')
                                : (creating ? 'Processing...' : (fetchingKiosks ? 'Fetching kiosks...' : 'Select an existing Kiosk to initialize'))}
                            </span>
                          </div>
                        )}
                        {createSubMode === 'new' && !txDigest ? (
                          <div className="mt-5 mb-5">
                            <label className="text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Pavilion Name: </label>
                            <input
                              value={pavilionName}
                              onChange={(e) => setPavilionName(e.target.value)}
                              placeholder=" ≤ 20 chars"
                              maxLength={20}
                              required
                              aria-required="true"
                              className="mt-1 w-[240px] bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
                            />
                          </div>
                        ) : null}
                        {createSubMode !== 'new' && !txDigest ? (
                          <div className="mt-3 space-y-2">
                            <label className="text-[14px] uppercase tracking-widest text-white/70">Owned Kiosks</label>
                            <div className="h-12 overflow-auto rounded border border-white/10">
                              {(ownedKiosks && ownedKiosks.length > 0) ? (
                                <ul className="divide-y divide-white/10">
                                  {ownedKiosks.map((k) => (
                                    <li key={k.objectId} className={`px-3 py-1 cursor-pointer ${selectedKioskId === k.kioskId ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setSelectedKioskId(k.kioskId)}>
                                      <div className="text-[11px] leading-tight text-white/85 truncate">
                                        {k.kioskId ? `${k.kioskId.slice(0, 8)}...${k.kioskId.slice(-6)}` : ''}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                fetchingKiosks ? (
                                  <div className="px-3 py-2 text-[12px] text-white/60">Loading...</div>
                                ) : (
                                  !currentAccount ? (
                                    <div className="px-3 py-2 text-[12px] text-white/60">Connect wallet to fetch Kiosks.</div>
                                  ) : (
                                    <div className="px-3 py-2 text-[12px] text-white/60">No Kiosk Found.</div>
                                  )
                                )
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      
                    </div>
                    <div className="flex items-center gap-2">
                      {txDigest && (
                        <div className="w-10 h-10 flex items-center justify-center animate-wiggle-x" aria-hidden>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-white/70"
                          >
                            <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <button
                        onClick={onMainAction}
                        disabled={creating}
                        title={createSubMode === 'new' && !pavilionName.trim() ? 'Pavilion name is required' : undefined}
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
                      {/* no trailing arrow */}
                    </div>
                  </div>
                </div>
                {error && (
                  <div className="px-5 py-3 text-[12px] text-red-300">{error}</div>
                )}
                {/* Divider */}
                <div className="slab-divider" />

                {/* Visit Pavilion */}
                <div className="w-full px-5 py-4 slab-segment">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-base md:text-lg font-semibold tracking-wide">Visit Pavilion</div>
                        <span className="text-xs tracking-widest uppercase text-white/50 bg-white/10 px-2 py-0.5 rounded border border-white/20">coming soon</span>
                      </div>
                      <div className="text-white/70 text-xs mt-1 tracking-widest uppercase">Enter an existing Pavilion by Kiosk ID</div>
                      <div className="mt-3">
                        <label className="text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Kiosk Object ID: </label>
                        <input
                          value={kioskId}
                          onChange={(e) => setKioskId(e.target.value)}
                          placeholder="0x..."
                          disabled
                          className="mt-1 w-[240px] bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45 disabled:opacity-50 disabled:cursor-not-allowed"
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
