import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoading } from '../providers/LoadingProvider';
import { usePreloadNavigation } from '../../hooks/navigation/usePreloadNavigation';
import { useKioskData } from '../../hooks/kiosk/useKioskData';
import { KioskSelector } from './KioskSelector';
import { useKioskClient } from '../providers/KioskClientProvider';
import { isPavilionKiosk } from '../../lib/tx/pavilion/utils';
import type { VisitSubMode } from '../../types/home';

interface VisitPavilionSectionProps {
  visitSubMode: VisitSubMode;
  setVisitSubMode: (mode: VisitSubMode) => void;
  onError: (error: string) => void;
}

export function VisitPavilionSection({ visitSubMode, setVisitSubMode, onError }: VisitPavilionSectionProps) {
  const [kioskId, setKioskId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { loadingState } = useLoading();
  const { navigateToKiosk } = usePreloadNavigation();
  const kioskClient = useKioskClient();
  const router = useRouter();
  const { 
    pavilionKiosks, 
    fetchingKiosks, 
    selectedVisitKioskId, 
    setSelectedVisitKioskId 
  } = useKioskData();

  const onVisitPavilion = async () => {
    let targetKioskId = '';

    if (visitSubMode === 'my') {
      if (!selectedVisitKioskId) {
        onError('Please select a pavilion kiosk');
        return;
      }
      targetKioskId = selectedVisitKioskId;
      // My pavilions are already verified, navigate directly
      await navigateToKiosk(targetKioskId);
    } else {
      // External mode - need to verify
      if (!kioskId.trim()) {
        onError('Please enter a kiosk ID');
        return;
      }
      targetKioskId = kioskId.trim();
      
      // Verify if it's a pavilion kiosk
      setIsVerifying(true);
      try {
        const isPavilion = await isPavilionKiosk(kioskClient, targetKioskId);
        
        if (!isPavilion) {
          onError('The entered kiosk is not a Pavilion. Please enter a valid Pavilion Kiosk ID.');
          setIsVerifying(false);
          return;
        }
        
        // Navigate to visitor mode
        router.push(`/visit?kioskId=${targetKioskId}`);
      } catch (error) {
        onError('Failed to verify kiosk. Please check the ID and try again.');
        console.error('Kiosk verification error:', error);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <div 
      className="w-full slab-segment flex flex-col"
      style={{
        padding: 'clamp(12px, 2.5vw, 20px)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div>
            <div className="text-base md:text-lg font-semibold tracking-wide">Visit Pavilion</div>
            <div className="mt-2 mb-3 flex items-center space-x-1 text-[10px] tracking-wide uppercase">
              <button
                onClick={() => setVisitSubMode('my')}
                aria-pressed={visitSubMode === 'my'}
                className={`px-2 py-[2px] rounded-full border transition-colors ${visitSubMode === 'my' ? 'bg-white/15 border-white/30 text-white/90' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'}`}
              >
                My Pavilions
              </button>
              <button
                onClick={() => setVisitSubMode('external')}
                aria-pressed={visitSubMode === 'external'}
                className={`px-2 py-[2px] rounded-full border transition-colors ${visitSubMode === 'external' ? 'bg-white/15 border-white/30 text-white/90' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'}`}
              >
                External
              </button>
            </div>
            <div className="text-white/70 text-xs mt-1 tracking-widest uppercase flex items-center">
              <span>
                {visitSubMode === 'my'
                  ? (fetchingKiosks ? 'Loading pavilions...' : 'Select a pavilion from your address')
                  : 'Enter an existing Pavilion by Kiosk ID'}
              </span>
            </div>
          </div>

          {visitSubMode === 'my' ? (
            <div className="mt-3 space-y-2">
              <label className="text-[14px] uppercase tracking-widest text-white/70">Owned Pavilions</label>
              <KioskSelector
                kiosks={pavilionKiosks}
                loading={fetchingKiosks}
                selectedKioskId={selectedVisitKioskId}
                onSelectKiosk={setSelectedVisitKioskId}
                emptyMessage="No pavilions found."
                showNames={true}
              />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Kiosk Object ID:</label>
              <input
                value={kioskId}
                onChange={(e) => setKioskId(e.target.value)}
                placeholder="0x..."
                className="bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
                style={{
                  width: 'clamp(280px, 35vw, 320px)'
                }}
              />
            </div>
          )}
        </div>

        <button
          onClick={onVisitPavilion}
          disabled={(visitSubMode === 'my' && (!selectedVisitKioskId || fetchingKiosks)) || (visitSubMode === 'external' && !kioskId.trim()) || loadingState.backgroundAnimating || isVerifying}
          aria-label="Visit pavilion"
          className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all disabled:opacity-60 bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/30"
        >
          {(loadingState.backgroundAnimating || isVerifying) ? (
            <div className="loading-spinner" />
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
  );
}
