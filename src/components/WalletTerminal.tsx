'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

export function WalletTerminal() {
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [isExpanded, setIsExpanded] = useState(false);
  const SUI_TO_MIST = 1000000000;

  // Use DappKit hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

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

  const handleCallSuiFunction = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // aquire coins
      const { data: coins } = await suiClient.getCoins({ owner: currentAccount.address });

      if (coins.length === 0) {
        console.error('No coins available');
        setError('No coins available');
        return;
      }

      // Create transaction to split coins
      const tx = new Transaction();
      const [splitCoin] = tx.splitCoins(coins[0].coinObjectId, [tx.pure.u64(1000000000)]);
      tx.transferObjects([splitCoin], currentAccount.address);

      // Use DappKit to sign transaction
      signAndExecuteTransaction({
        transaction: tx,
      }, {
        onSuccess: (result) => {
          console.log('Transaction result:', result);
          setError('');
        },
        onError: (error) => {
          console.error('Transaction failed:', error);
          setError('Transaction failed: ' + error.message);
        }
      });

    } catch (err) {
      setError((err as Error).message || 'Transaction failed');
    }
  };

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
            
            <div className="wallet-terminal-buttons">
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
                onClick={handleCallSuiFunction}
                className="w-full py-3 px-4 text-sm tracking-widest uppercase rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 transition-colors"
              >
                Call Sui Function
              </button>
            </div>

            {currentAccount && (
              <div className="p-3 rounded-xl mt-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium mb-1 tracking-wide uppercase control-label-secondary">WALLET ADDRESS</p>
                    <p className="text-sm font-mono break-all leading-relaxed font-medium rounded-xl" style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {currentAccount.address}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium tracking-wide uppercase control-label-secondary">BALANCE</span>
                      <span className="font-medium control-label-primary">{balance} SUI</span>
                    </div>
                  </div>
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
    </div>
  );
}
