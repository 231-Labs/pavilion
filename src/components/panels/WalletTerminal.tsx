'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKioskState } from '../providers/KioskStateProvider';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ObjectChange } from '../../hooks/state/useObjectChanges';
import { SceneConfigManager } from '../../lib/three/SceneConfigManager';
import { SceneConfig } from '../../types/scene';
import { useClickOutside } from '../../hooks/ui/useClickOutside';
import { useKioskClient } from '../providers/KioskClientProvider';
import { buildWithdrawProfitsTx, parseWithdrawError } from '../../lib/tx/withdraw';
import { useBucketClient } from '../../hooks/bucket/useBucketClient';

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
  const { kioskId, kioskOwnerCapId, kioskData, refresh: refreshKioskData } = useKioskState();
  const SUI_TO_MIST = 1000000000;
  const router = useRouter();

  // Debug: log kioskData to see its structure
  useEffect(() => {
    if (kioskData) {
      console.log('💰 WalletTerminal: kioskData structure:', kioskData);
      console.log('💰 WalletTerminal: kioskData.kiosk:', kioskData.kiosk);
      console.log('💰 WalletTerminal: kioskData.kiosk.profits:', kioskData.kiosk?.profits);
    }
  }, [kioskData]);

  // Save related state
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Withdraw related state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Bucket borrow related state
  const [isBorrowingUsdb, setIsBorrowingUsdb] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(false);

  // Copy tooltip state
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [isTooltipFadingOut, setIsTooltipFadingOut] = useState(false);

  // Share tooltip state
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isShareTooltipFadingOut, setIsShareTooltipFadingOut] = useState(false);

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
  const kioskClient = useKioskClient();

  // Use Bucket Client
  const {
    bucketClient,
    depositAndBorrow,
    positions: bucketPositions,
    isLoading: isBucketLoading,
    error: bucketError,
  } = useBucketClient();

  
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

  // Handle share pavilion
  const handleSharePavilion = async () => {
    if (kioskId) {
      try {
        const shareUrl = `${window.location.origin}/pavilion/visit?kioskId=${kioskId}`;
        await navigator.clipboard.writeText(shareUrl);
        setIsShareTooltipFadingOut(false);
        setShowShareTooltip(true);
        
        setTimeout(() => {
          setIsShareTooltipFadingOut(true);
          setTimeout(() => {
            setShowShareTooltip(false);
            setIsShareTooltipFadingOut(false);
          }, 150);
        }, 1800);
      } catch (error) {
        console.error('Failed to copy share URL to clipboard:', error);
      }
    }
  };

  // Handle withdraw profits
  const handleWithdrawProfits = async () => {
    console.log('Withdrawing profits:', {
      currentAccount: currentAccount?.address,
      kioskId,
      kioskOwnerCapId,
      profits: kioskData?.kiosk?.profits
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

    // Check if there are profits to withdraw
    const profits = kioskData?.kiosk?.profits;
    if (!profits || profits === '0' || Number(profits) === 0) {
      setError('No profits available to withdraw');
      return;
    }

    setIsWithdrawing(true);
    setError('');

    try {
      console.log('🏦 Building withdraw transaction...');
      
      // Build withdraw transaction
      const { transaction } = await buildWithdrawProfitsTx({
        kioskClient,
        kioskId,
        kioskOwnerCapId,
        ownerAddress: currentAccount.address,
        // Don't specify amount to withdraw all profits
      });

      console.log('📝 Executing withdraw transaction...');
      const result = await signAndExecuteTransaction({ transaction });
      console.log('✅ Withdraw transaction executed successfully:', result);

      // Show success state
      setWithdrawSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setWithdrawSuccess(false);
      }, 3000);

      // Refresh balance after withdrawal
      try {
        const { totalBalance } = await suiClient.getBalance({ owner: currentAccount.address });
        setBalance((Number(totalBalance) / SUI_TO_MIST).toString());
      } catch (e) {
        console.error('Failed to refresh balance after withdrawal:', e);
      }

      // Refresh kiosk data to update profits display
      try {
        await refreshKioskData();
        console.log('🔄 Kiosk data refreshed after withdrawal');
      } catch (e) {
        console.error('Failed to refresh kiosk data after withdrawal:', e);
      }
    } catch (error) {
      console.error('❌ Failed to withdraw profits:', error);
      const errorMessage = parseWithdrawError(error);
      setError(errorMessage);
      setWithdrawSuccess(false);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Handle Bucket deposit and borrow (Deposit Kiosk Profits to Bucket and borrow USDB)
  const handleDepositToBucket = async () => {
    console.log('Depositing to Bucket:', {
      currentAccount: currentAccount?.address,
      profits: kioskData?.kiosk?.profits
    });

    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    // Check if Bucket client is initialized
    if (!bucketClient) {
      setError('Bucket Protocol is not available. Please ensure you are on mainnet.');
      return;
    }

    // Check if there are profits available
    const profits = kioskData?.kiosk?.profits;
    if (!profits || profits === '0' || Number(profits) === 0) {
      setError('No profits available to deposit to Bucket');
      return;
    }

    const profitsInMist = Number(profits);
    // Calculate borrowable USDB (assuming 200% collateral ratio, i.e., 1 SUI collateral can borrow 0.5 USDB)
    // 1 SUI = 1e9 MIST, 1 USDB = 1e6
    // Borrow amount = (collateral amount / 2) * (1e6 / 1e9) = collateral amount / 2000
    const borrowAmountUsdb = Math.floor(profitsInMist / 2000); // Conservative estimate

    if (borrowAmountUsdb < 1000000) { // Less than 1 USDB
      setError('Profits too low to borrow USDB (minimum 2 SUI required)');
      return;
    }

    setIsBorrowingUsdb(true);
    setError('');

    try {
      console.log('💰 Executing Withdraw + Deposit to Bucket + Borrow USDB...');
      console.log(`Collateral: ${profitsInMist / 1e9} SUI`);
      console.log(`Borrow: ${borrowAmountUsdb / 1e6} USDB`);

      // Step 1: Withdraw Kiosk Profits
      console.log('🏦 Step 1: Withdrawing profits from Kiosk...');
      const { transaction: withdrawTx } = await buildWithdrawProfitsTx({
        kioskClient,
        kioskId: kioskId!,
        kioskOwnerCapId: kioskOwnerCapId!,
        ownerAddress: currentAccount.address,
      });

      // Add Bucket operations to the same transaction
      console.log('🏦 Step 2: Adding Bucket deposit and borrow to the same transaction...');
      if (!bucketClient) {
        throw new Error('Bucket client not initialized');
      }

      await bucketClient.buildManagePositionTransaction(withdrawTx, {
        coinType: '0x2::sui::SUI',
        depositCoinOrAmount: profitsInMist,
        borrowAmount: borrowAmountUsdb,
      });

      // Execute the combined transaction
      console.log('📝 Executing combined transaction (Withdraw + Bucket)...');
      const result = await signAndExecuteTransaction({ transaction: withdrawTx });
      
      console.log('✅ Combined transaction successful:', result.digest);
      console.log(`📊 Borrowed ${borrowAmountUsdb / 1e6} USDB with ${profitsInMist / 1e9} SUI collateral`);

      // Show success state
      setBorrowSuccess(true);
      setError(''); // Clear potential Bucket errors

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setBorrowSuccess(false);
      }, 5000);

      // Refresh balance
      try {
        const { totalBalance } = await suiClient.getBalance({ owner: currentAccount.address });
        setBalance((Number(totalBalance) / SUI_TO_MIST).toString());
      } catch (e) {
        console.error('Failed to refresh balance:', e);
      }

      // Refresh kiosk data
      try {
        await refreshKioskData();
      } catch (e) {
        console.error('Failed to refresh kiosk data:', e);
      }

      // Refresh Bucket positions
      if (currentAccount.address) {
        // The useBucketClient hook will auto-refresh, but we can trigger it manually if needed
        console.log('🔄 Bucket positions will auto-refresh');
      }
    } catch (error) {
      console.error('❌ Failed to borrow USDB:', error);
      const errorMessage = (error as Error).message || 'Failed to borrow USDB with profits';
      setError(errorMessage);
      setBorrowSuccess(false);
    } finally {
      setIsBorrowingUsdb(false);
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
          <div className="p-3 space-y-4" style={{ fontSize: '13px' }}>
            
            {/* Wallet Connection Section */}
            <div className="space-y-2">
              <ConnectButton
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 uppercase tracking-widest transition-colors"
                style={{ minHeight: '48px' }}
              />
            </div>

            {currentAccount && (
              <>
                {/* Account Info Section */}
                <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                      <label className="text-xs font-semibold tracking-wider uppercase text-white/50">
                        Sui Balance
                      </label>
                    </div>
                    <div className="flex justify-between items-baseline pl-3.5">
                      <span className="text-2xl font-bold text-white/90 tracking-tight">{Number(balance).toFixed(2)}</span>
                      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">SUI</span>
                    </div>
                  </div>
                </div>

                {/* Kiosk Profits Section */}
                {kioskId && (
                  <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                        <label className="text-xs font-semibold tracking-wider uppercase text-white/50">
                          Kiosk Profits
                        </label>
                      </div>
                      <div className="flex justify-between items-baseline pl-3.5">
                        <span className="text-2xl font-bold text-white/90 tracking-tight">
                          {kioskData?.kiosk?.profits !== undefined && kioskData?.kiosk?.profits !== null
                            ? (Number(kioskData.kiosk.profits) / SUI_TO_MIST).toFixed(2)
                            : '0.00'}
                        </span>
                        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">SUI</span>
                      </div>
                    </div>
                    
                    {/* Profit Actions */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <button
                        onClick={handleWithdrawProfits}
                        disabled={isWithdrawing || !kioskData?.kiosk?.profits || kioskData.kiosk.profits === '0'}
                        className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg bg-white/8 hover:bg-white/12 text-white/80 border border-white/15 hover:border-white/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/8"
                      >
                        {isWithdrawing ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Withdrawing...</span>
                          </>
                        ) : withdrawSuccess ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Withdrawn Successfully!</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Withdraw Directly</span>
                          </>
                        )}
                      </button>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={handleDepositToBucket}
                          disabled={!bucketClient || isBorrowingUsdb || isBucketLoading || !kioskData?.kiosk?.profits || Number(kioskData?.kiosk?.profits) === 0}
                          className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg bg-white/8 hover:bg-white/12 text-white/80 border border-white/15 hover:border-white/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/8 flex items-center justify-center gap-2"
                          title={!bucketClient ? 'Bucket Protocol only available on mainnet' : ''}
                        >
                          {isBorrowingUsdb || isBucketLoading ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Processing...</span>
                            </>
                          ) : borrowSuccess ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>Success! USDB Borrowed</span>
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>Borrow USDB with Profits</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bucket Lending Info Section */}
            {currentAccount && bucketPositions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40">
                    Bucket Lending Position
                  </label>
                </div>
                <div className="pl-3.5 space-y-2">
                  {bucketPositions.map((position, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-purple-300/70">Collateral</span>
                        <span className="text-xs font-mono text-white/80">
                          {(Number(position.collateralAmount) / 1e9).toFixed(4)} SUI
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-purple-300/70">Debt</span>
                        <span className="text-xs font-mono text-white/80">
                          {(Number(position.debtAmount) / 1e6).toFixed(2)} USDB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kiosk Info Section */}
            {kioskId && (
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40">
                    Kiosk Information
                  </label>
                </div>
                <div className="pl-3.5 space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-xs font-mono text-white/60 truncate max-w-[180px]">
                      {kioskId.length > 20 ? `${kioskId.slice(0, 8)}...${kioskId.slice(-10)}` : kioskId}
                    </span>
                    <div className="relative">
                      <button
                        onClick={handleCopyKioskId}
                        className="px-2 py-1 text-[10px] rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors border border-white/10"
                        title="Copy Kiosk ID"
                      >
                        COPY
                      </button>
                      {showCopyTooltip && (
                        <div 
                          className={`absolute -top-10 left-1/3 z-30 ${
                            isTooltipFadingOut ? 'tooltip-fade-out' : 'tooltip-fade-in'
                          }`}
                        >
                          <div className="rounded-md px-3 py-1.5 border border-white/30 backdrop-blur-md min-w-max bg-black/70">
                            <div className="text-xs font-medium tracking-wider uppercase text-white/90 silver-glow whitespace-nowrap">
                              Kiosk ID Copied!
                            </div>
                          </div>
                          <div className="absolute top-full left-2/3 transform -translate-x-1/2 -mt-px">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/30"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Configuration Section */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40">
                    Configuration
                  </label>
                </div>
                {hasUnsavedChanges && !saveSuccess && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-white/50">{props.objectChanges.size} Changes</span>
                    <div className="w-1.5 h-1.5 bg-yellow-400/70 rounded-full animate-pulse"></div>
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-white/60">Saved</span>
                    <div className="w-1.5 h-1.5 bg-green-400/70 rounded-full"></div>
                  </div>
                )}
              </div>
              <button
                onClick={prepareSaveTransaction}
                disabled={isPreparingSave}
                className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg bg-white/8 hover:bg-white/12 disabled:bg-white/5 text-white/80 disabled:text-white/50 border border-white/15 hover:border-white/25 disabled:border-white/10 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                style={{ minHeight: '40px' }}
              >
                {isPreparingSave ? (
                  <>
                    <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Save to Sui</span>
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

            {/* Navigation Section */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              {kioskId && (
                <div className="relative">
                  <button
                    onClick={handleSharePavilion}
                    className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Share Pavilion</span>
                  </button>
                  {showShareTooltip && (
                    <div 
                      className={`absolute -top-12 left-1/2 z-30 ${
                        isShareTooltipFadingOut ? 'tooltip-fade-out' : 'tooltip-fade-in'
                      }`}
                      style={{ transform: 'translateX(-30%)' }}
                    >
                      <div className="rounded-md px-3 py-1.5 border border-white/30 backdrop-blur-md min-w-max bg-black/70">
                        <div className="text-xs font-medium tracking-wider uppercase text-white/90 silver-glow whitespace-nowrap">
                          Share Link Copied!
                        </div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/30"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => router.push('/')}
                className="w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
