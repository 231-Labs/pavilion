'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useClickOutside } from '../../hooks/ui/useClickOutside';

interface VisitorWalletTerminalProps {
  kioskId: string;
}

export function VisitorWalletTerminal({ kioskId }: VisitorWalletTerminalProps) {
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isExpanded, setIsExpanded] = useState(false);
  const SUI_TO_MIST = 1000000000;
  const router = useRouter();

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
  }, !!error);

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

  // Handle copy with tooltip
  const handleCopyKioskId = async () => {
    if (kioskId) {
      try {
        await navigator.clipboard.writeText(kioskId);
        setIsTooltipFadingOut(false);
        setShowCopyTooltip(true);
        
        setTimeout(() => {
          setIsTooltipFadingOut(true);
          setTimeout(() => {
            setShowCopyTooltip(false);
            setIsTooltipFadingOut(false);
          }, 150);
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
            )}

            {/* Pavilion Info Section */}
            {kioskId && (
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-white/40">
                    Pavilion Information
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

            {/* Visitor Info */}
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Visitor mode — Browse and purchase listed items from this pavilion.
                </p>
              </div>
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

