import React from 'react';
import { useLoading } from '../LoadingProvider';
import { useKioskState } from '../KioskStateProvider';
import { usePreloadNavigation } from '../../hooks/common/usePreloadNavigation';
import { usePavilionActions } from '../../hooks/pavilion/usePavilionActions';
import { useKioskData } from '../../hooks/nft/useKioskData';
import { KioskSelector } from './KioskSelector';
import type { CreateSubMode } from '../../types/home';

interface CreatePavilionSectionProps {
  createSubMode: CreateSubMode;
  setCreateSubMode: (mode: CreateSubMode) => void;
}

export function CreatePavilionSection({ createSubMode, setCreateSubMode }: CreatePavilionSectionProps) {
  const { loadingState } = useLoading();
  const kioskState = useKioskState();
  const { navigateToKiosk } = usePreloadNavigation();
  const { 
    creating, 
    txDigest, 
    pavilionName, 
    setPavilionName, 
    setError,
    createPavilion,
    initializeExistingKiosk,
    createdKioskId 
  } = usePavilionActions();
  const { 
    ownedKiosks, 
    fetchingKiosks, 
    selectedKioskId, 
    setSelectedKioskId 
  } = useKioskData();

  const onMainAction = async () => {
    if (txDigest) {
      const targetKioskId = createdKioskId || kioskState.kioskId;
      
      if (targetKioskId) {
        await navigateToKiosk(targetKioskId);
      } else {
        // Navigate to demo pavilion (without kioskId parameter)
        setTimeout(() => {
          window.location.href = '/pavilion';
        }, 800);
      }
      return;
    }

    if (createSubMode === 'new' && !pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }

    if (createSubMode === 'existing') {
      if (!pavilionName.trim()) {
        setError('Pavilion name is required');
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
      await initializeExistingKiosk(selectedKioskId, cap);
      return;
    }

    await createPavilion();
  };

  return (
    <div 
      className="w-full slab-segment flex-1 flex flex-col"
      style={{
        padding: 'clamp(12px, 2.5vw, 20px)',
        minHeight: 'clamp(200px, 25vh, 300px)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div>
            <div className="text-base md:text-lg font-semibold tracking-wide">Create Pavilion</div>
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
              <div className="mt-5 mb-5 flex items-center justify-center">
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
              <div className="mt-4 mb-6 flex flex-col flex-1">
                <div className="space-y-2">
                  <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Pavilion Name:</label>
                  <input
                    value={pavilionName}
                    onChange={(e) => setPavilionName(e.target.value)}
                    placeholder=" ≤ 20 chars"
                    maxLength={20}
                    required
                    aria-required="true"
                    className="w-full bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
                  />
                </div>
                <div className="flex-1"></div>
              </div>
            ) : null}
            {createSubMode !== 'new' && !txDigest ? (
              <div className="mt-4 flex flex-col flex-1">
                {!selectedKioskId ? (
                  // Step 1: Select Kiosk
                  <div className="flex-1 flex flex-col space-y-2">
                    <label className="text-[14px] uppercase tracking-widest text-white/70">Step 1: Select a Kiosk</label>
                    <div className="flex-1 flex flex-col justify-center">
                      <KioskSelector
                        kiosks={ownedKiosks}
                        loading={fetchingKiosks}
                        selectedKioskId={selectedKioskId}
                        onSelectKiosk={(kioskId) => {
                          setSelectedKioskId(kioskId);
                          setPavilionName('');
                        }}
                        emptyMessage="No Kiosk Found."
                      />
                    </div>
                  </div>
                ) : (
                  // Step 2: Enter Pavilion Name
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] uppercase tracking-widest text-white/70">Step 2: Pavilion Name</label>
                        <button
                          onClick={() => setSelectedKioskId(null)}
                          className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white/70 transition-colors"
                          aria-label="Change selected kiosk"
                        >
                          Change Kiosk
                        </button>
                      </div>
                      <input
                        value={pavilionName}
                        onChange={(e) => setPavilionName(e.target.value)}
                        placeholder=" ≤ 20 chars"
                        maxLength={20}
                        required
                        aria-required="true"
                        className="w-full bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
                      />
                    </div>
                    <div className="flex-1 flex items-end">
                      <div className="flex items-center space-x-2">
                        <label className="text-[12px] uppercase tracking-widest text-white/60 whitespace-nowrap">Selected Kiosk:</label>
                        <div className="text-[11px] text-white/70 truncate">
                          {selectedKioskId ? `${selectedKioskId.slice(0, 8)}...${selectedKioskId.slice(-6)}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
            disabled={creating || loadingState.backgroundAnimating || (createSubMode === 'existing' && fetchingKiosks)}
            title={createSubMode === 'new' && !pavilionName.trim() ? 'Pavilion name is required' : undefined}
            aria-label={txDigest ? 'Enter pavilion' : 'Create pavilion'}
            className={`group relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all disabled:opacity-60 ${txDigest ? 'bg-white/15 border-white/30 shadow-[0_0_22px_rgba(200,200,220,0.35)] ring-1 ring-white/20' : 'bg-white/10 border-white/20'}`}
          >
            {loadingState.backgroundAnimating ? (
              <div className="loading-spinner" />
            ) : txDigest ? (
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
    </div>
  );
}
