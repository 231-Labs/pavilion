'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKioskState } from './KioskStateProvider';
import { SaveConfirmationModal } from './SaveConfirmationModal';
import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { ObjectChange } from '../hooks/useObjectChanges';
import { SceneConfigManager } from '../lib/scene/SceneConfigManager';
import { SceneConfig } from '../types/scene';

interface WalletTerminalProps {
  // Change tracking props
  objectChanges: Map<string, ObjectChange>;
  sceneConfigManager: SceneConfigManager | null;
  currentSceneConfig: SceneConfig | null;
  kioskItems: any[];
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function WalletTerminal(props: WalletTerminalProps) {
  const { objectChanges, sceneConfigManager, currentSceneConfig, kioskItems, onSaveSuccess, onSaveError } = props;
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isExpanded, setIsExpanded] = useState(false);
  const { kioskId, kioskOwnerCapId } = useKioskState();
  const SUI_TO_MIST = 1000000000;
  const router = useRouter();

  // Save related state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTransaction, setSaveTransaction] = useState<any>(null);
  const [isPreparingSave, setIsPreparingSave] = useState(false);

  // Use DappKit hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  
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

  // KioskId is provided by global state now

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
        setError('No changes to save');
        return;
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

      // Create save transaction
      const transaction = sceneConfigManager.createSaveTransaction(
        updatedConfig,
        kioskId,
        kioskOwnerCapId
      );

      setSaveTransaction(transaction);

      // Convert changes to modal format
      const modalChanges = changes.map(change => {
        const changeDetails: any = {};

        if (change.originalState.displayed !== change.currentState.displayed) {
          changeDetails.displayed = {
            from: change.originalState.displayed,
            to: change.currentState.displayed
          };
        }

        if (JSON.stringify(change.originalState.position) !== JSON.stringify(change.currentState.position)) {
          changeDetails.position = {
            from: change.originalState.position,
            to: change.currentState.position
          };
        }

        if (JSON.stringify(change.originalState.rotation) !== JSON.stringify(change.currentState.rotation)) {
          changeDetails.rotation = {
            from: change.originalState.rotation,
            to: change.currentState.rotation
          };
        }

        if (change.originalState.scale !== change.currentState.scale) {
          changeDetails.scale = {
            from: change.originalState.scale,
            to: change.currentState.scale
          };
        }

        return {
          objectId: change.objectId,
          objectName: change.objectName,
          changes: changeDetails
        };
      });

      setIsSaveModalOpen(true);
    } catch (error) {
      console.error('Failed to prepare save transaction:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare save transaction');
      onSaveError?.(error as Error);
    } finally {
      setIsPreparingSave(false);
    }
  };

  // Handle save success
  const handleSaveSuccess = () => {
    setError('');
    props.onSaveSuccess?.();
  };

  // Handle save error
  const handleSaveError = (error: Error) => {
    setError(`Save failed: ${error.message}`);
    props.onSaveError?.(error);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = props.objectChanges.size > 0;



  return (
    <div className="absolute top-6 left-6 z-20 glass-slab glass-slab--thermal rounded-xl control-panel max-w-xs min-w-[320px] overflow-hidden">
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
          <div className="p-3" style={{ fontSize: '13px' }}>
            
            <div className="wallet-terminal-buttons space-y-3">
              <ConnectButton
                className="elegant-button w-full text-sm tracking-wide uppercase"
                style={{
                  padding: '12px 16px',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '14px',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              />

              <button
                onClick={() => router.push('/')}
                className="elegant-button w-full text-sm tracking-wide uppercase"
                style={{
                  padding: '12px 16px',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: '"Courier New", monospace',
                  fontSize: '14px',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                  outline: 'none',
                  boxShadow: 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                ← BACK TO HOME
              </button>
            </div>

            {currentAccount && (
              <div className="p-3 rounded-xl mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium tracking-wide uppercase control-label-secondary">BALANCE</span>
                  <span className="font-medium control-label-primary">{balance} SUI</span>
                </div>
              </div>
            )}

            {kioskId && (
              <div className="p-3 rounded-xl mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium tracking-wide uppercase control-label-secondary">KIOSK ID</span>
                </div>
                <p className="text-sm font-mono break-all leading-relaxed font-medium rounded-xl" style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {kioskId}
                </p>
              </div>
            )}

            {/* Save Changes Section */}
            {hasUnsavedChanges && (
              <div className="p-3 rounded-xl mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium tracking-wide uppercase control-label-secondary">
                      Unsaved changes ({props.objectChanges.size})
                    </div>
                    {hasUnsavedChanges && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </div>

                  <button
                    onClick={prepareSaveTransaction}
                    disabled={isPreparingSave}
                    className="w-full px-3 py-2 text-sm font-medium tracking-wide uppercase bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white/90 hover:text-white disabled:text-white/50 rounded-lg border border-white/30 disabled:border-white/20 transition-colors flex items-center justify-center space-x-2"
                    style={{
                      minHeight: '40px',
                      fontSize: '12px'
                    }}
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
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium tracking-wide uppercase control-label-secondary">ERROR</span>
                </div>
                <p className="text-sm font-mono break-all leading-relaxed font-medium rounded-xl" style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Confirmation Modal */}
      <SaveConfirmationModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        changes={Array.from(props.objectChanges.values()).map(change => {
          const changeDetails: any = {};

          if (change.originalState.displayed !== change.currentState.displayed) {
            changeDetails.displayed = {
              from: change.originalState.displayed,
              to: change.currentState.displayed
            };
          }

          if (JSON.stringify(change.originalState.position) !== JSON.stringify(change.currentState.position)) {
            changeDetails.position = {
              from: change.originalState.position,
              to: change.currentState.position
            };
          }

          if (JSON.stringify(change.originalState.rotation) !== JSON.stringify(change.currentState.rotation)) {
            changeDetails.rotation = {
              from: change.originalState.rotation,
              to: change.currentState.rotation
            };
          }

          if (change.originalState.scale !== change.currentState.scale) {
            changeDetails.scale = {
              from: change.originalState.scale,
              to: change.currentState.scale
            };
          }

          return {
            objectId: change.objectId,
            objectName: change.objectName,
            changes: changeDetails
          };
        })}
        transaction={saveTransaction}
        onSaveSuccess={handleSaveSuccess}
        onSaveError={handleSaveError}
      />
    </div>
  );
}
