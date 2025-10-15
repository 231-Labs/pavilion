'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKioskState } from '../providers/KioskStateProvider';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { ObjectChange } from '../../hooks/state/useObjectChanges';
import { SceneConfigManager } from '../../lib/scene/SceneConfigManager';
import { SceneConfig } from '../../types/scene';
import { useClickOutside } from '../../hooks/ui/useClickOutside';

interface WalletTerminalProps {
  objectChanges: Map<string, ObjectChange>;
  sceneConfigManager: SceneConfigManager | null;
  currentSceneConfig: SceneConfig | null;
  kioskItems: any[];
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function WalletTerminal(props: WalletTerminalProps) {
  const { sceneConfigManager, currentSceneConfig, kioskItems, onSaveError } = props;
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isExpanded, setIsExpanded] = useState(false);
  const { kioskId, kioskOwnerCapId } = useKioskState();
  const SUI_TO_MIST = 1000000000;
  const router = useRouter();

  // Save related state
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Copy tooltip state
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [isTooltipFadingOut, setIsTooltipFadingOut] = useState(false);

  // Use click outside hook for error dismissal
  const containerRef = useClickOutside<HTMLDivElement>(() => {
    if (error) {
      setError('');
    }
  }, !!error); // Only enable when error exists

  // Use DappKit hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  
  // When wallet connection status changes
  useEffect(() => {
    if (!currentAccount) return;

    setError('');

    let isCancelled = false;
    const fetchBalance = async () => {
      try {
        const { totalBalance } = await suiClient.getBalance({ owner: currentAccount.address });
        if (isCancelled) return;
        setBalance((Number(totalBalance) / SUI_TO_MIST).toString());
      } catch (e) {
        if (isCancelled) return;
        setError((e as Error).message || 'Failed to fetch balance');
      }
    };
    fetchBalance();

    return () => { isCancelled = true; };
  }, [currentAccount, suiClient]);

  // Prepare save transaction
  const prepareSaveTransaction = async () => {
    console.log('Debugging save transaction:', {
      currentAccount: currentAccount?.address,
      kioskId,
      kioskOwnerCapId,
      objectChanges: props.objectChanges.size,
      hasSceneConfigManager: !!sceneConfigManager,
      hasCurrentSceneConfig: !!currentSceneConfig
    });

    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    if (!kioskId) {
      setError('No kiosk ID found. Please make sure you are in a pavilion.');
      return;
    }

    if (!kioskOwnerCapId) {
      setError('No kiosk owner cap found. Please make sure you own this kiosk.');
      return;
    }

    if (!sceneConfigManager) {
      setError('Scene config manager not ready');
      return;
    }

    if (!currentSceneConfig) {
      setError('Current scene config is not available');
      return;
    }

    setIsPreparingSave(true);
    setError('');

    try {
      const changes = Array.from(props.objectChanges.values());

      if (changes.length === 0) {
        console.log('No changes to save, but proceeding with save operation anyway');
      }

      // Use scene manager to capture current scene state
      const updatedConfig = sceneConfigManager.captureCurrentSceneState(
        currentSceneConfig,
        kioskItems
      );

      console.log('Scene config to save:', {
        totalObjects: updatedConfig.objects.length,
        displayedObjects: updatedConfig.objects.filter(obj => obj.displayed).length,
        stats: sceneConfigManager.getSceneStats(updatedConfig)
      });

      // Create and execute save transaction directly
      const transaction = sceneConfigManager.createSaveTransaction(
        updatedConfig,
        kioskId,
        kioskOwnerCapId
      );

      console.log('Executing save transaction directly...');
      const result = await signAndExecuteTransaction({ transaction });
      console.log('Save transaction executed successfully:', result);

      // Show success state
      setSaveSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      // Call success callback
      props.onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to prepare save transaction:', error);
      setSaveSuccess(false); // Clear success state on error
      setError(error instanceof Error ? error.message : 'Failed to prepare save transaction');
      onSaveError?.(error as Error);
    } finally {
      setIsPreparingSave(false);
    }
  };


  // Check if there are unsaved changes
  const hasUnsavedChanges = props.objectChanges.size > 0;

  // Handle copy with tooltip
  const handleCopyKioskId = async () => {
    if (kioskId) {
      try {
        await navigator.clipboard.writeText(kioskId);
        setIsTooltipFadingOut(false);
        setShowCopyTooltip(true);
        
        // Start fade out after 1.8 seconds
        setTimeout(() => {
          setIsTooltipFadingOut(true);
          // Complete hide after fade out animation
          setTimeout(() => {
            setShowCopyTooltip(false);
            setIsTooltipFadingOut(false);
          }, 150); // matches fade out animation duration
        }, 1800);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };



  return (
    <div ref={containerRef} className="absolute top-6 left-6 z-20 glass-slab glass-slab--thermal rounded-xl control-panel max-w-xs min-w-[320px] overflow-hidden" style={{ fontSize: '14px' }}>
      <div className="relative z-10">
        {/* Title bar */}
        <div
          className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="elegant-title tracking-wider uppercase silver-glow">
            Wallet
          </h3>
          <div className="flex items-center space-x-2">
            <span className="elegant-expand-text font-medium tracking-wide">
              {isExpanded ? 'COLLAPSE' : 'EXPAND'}
            </span>
            <span className="elegant-expand-arrow" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
        </div>

        {/* Control panel content */}
        {isExpanded && (
          <div className="p-3 space-y-3" style={{ fontSize: '13px' }}>
            
            <div className="space-y-2">
              <ConnectButton
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors"
                style={{ minHeight: '48px' }}
              />
            </div>

            {currentAccount && (
              <div className="space-y-2">
                <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                  Balance
                </label>
                <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/10">
                  <span className="font-medium control-label-primary">{balance} SUI</span>
                </div>
              </div>
            )}

            {kioskId && (
              <div className="space-y-2">
                <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                  Kiosk ID
                </label>
                <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/10">
                  <div className="flex items-center space-x-8">
                    <span className="text-sm font-medium control-label-primary truncate max-w-[200px]">
                      {kioskId.length > 20 ? `${kioskId.slice(0, 8)}...${kioskId.slice(-10)}` : kioskId}
                    </span>
                    <div className="relative">
                      <button
                        onClick={handleCopyKioskId}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title="Copy Kiosk ID"
                      >
                        copy
                      </button>
                      {/* Tooltip */}
                      {showCopyTooltip && (
                        <div 
                          className={`absolute -top-10 left-1/3 z-30 ${
                            isTooltipFadingOut ? 'tooltip-fade-out' : 'tooltip-fade-in'
                          }`}
                        >
                          <div className="glass-slab rounded-md px-3 py-1 border border-white/20 backdrop-blur-sm min-w-max">
                            <div className="text-xs font-medium tracking-wider uppercase text-white/90 silver-glow whitespace-nowrap">
                              Kiosk ID Copied!
                            </div>
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-2/3 transform -translate-x-1/2 -mt-px">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Changes Section */}
            <div className="space-y-2">
              <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                {hasUnsavedChanges ? 'Save Configuration on Sui' : 'Save Configuration on Sui'}
              </label>
              {saveSuccess && (
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium tracking-wide uppercase control-label-secondary">
                    Configuration saved successfully
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
              {hasUnsavedChanges && !saveSuccess && (
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium tracking-wide uppercase control-label-secondary">
                    Unsaved changes ({props.objectChanges.size})
                  </div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              )}
              <button
                onClick={prepareSaveTransaction}
                disabled={isPreparingSave}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:hover:bg-white/5 text-white/80 disabled:text-white/50 border border-white/20 disabled:border-white/10 uppercase tracking-widest transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                style={{ minHeight: '40px' }}
              >
                {isPreparingSave ? (
                  <>
                    <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin"></div>
                    <span>Preparing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="space-y-2">
                <label className="block text-base font-medium tracking-wide uppercase control-label-primary">
                  Error
                </label>
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium tracking-wide uppercase control-label-secondary">ERROR</span>
                    <button
                      onClick={() => setError('')}
                      className="ml-2 text-white/40 hover:text-white/70 transition-colors"
                      title="Close error"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                      >
                        <path
                          d="M18 6L6 18M6 6l12 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm font-mono break-all leading-relaxed font-medium rounded-lg p-2 bg-white/5 border border-white/10 mt-2">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Back To Home Button at the bottom */}
            <div className="border-t border-white/10 pt-3 mt-3">
              <button
                onClick={() => router.push('/')}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors"
                style={{ minHeight: '40px' }}
              >
                ← BACK TO HOME
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
