'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

export function WalletTerminal() {
  const [error, setError] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const SUI_TO_MIST = 1000000000;

  // Use DappKit hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // When wallet connection status changes
  useEffect(() => {
    if (currentAccount) {
      setError('');
      // Get balance
      const fetchBalance = async () => {
        const { totalBalance } = await suiClient.getBalance({ owner: currentAccount.address });
        setBalance((Number(totalBalance) / SUI_TO_MIST).toString());
      };
      fetchBalance();
    }
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
    <div className="absolute top-6 left-6 z-20 glass-panel control-panel max-w-sm min-w-[320px] p-6 glow">
      <div className="relative z-10">
        <h3 className="neon-text text-xl font-medium mb-5 tracking-wider uppercase" style={{ fontSize: '20px' }}>
          💼 Wallet Terminal
        </h3>

        <div className="space-y-4">
          <ConnectButton
            className="liquid-button w-full py-3 px-4 text-sm font-light tracking-wide uppercase neon-text"
            data-connect-button="true"
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '12px 16px',
              background: 'var(--button-gradient)',
              border: '1px solid rgba(0, 136, 255, 0.1)',
              borderRadius: '8px',
              boxShadow: '0 0 4px rgba(0, 136, 255, 0.08), 0 0 8px rgba(255, 136, 0, 0.05), inset 0 1px 0 rgba(0, 136, 255, 0.2), inset 0 -1px 0 rgba(255, 136, 0, 0.1)',
              color: 'var(--neon-blue)',
              fontFamily: "'Courier New', monospace",
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '1.4',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          />

          <button
            onClick={handleCallSuiFunction}
            className="liquid-button w-full py-3 px-4 text-sm font-light tracking-wide uppercase neon-text"
          >
            Call Sui Function
          </button>
        </div>

        {currentAccount && (
          <div className="mt-6 p-4 glass-panel rounded-lg">
            <div className="space-y-3">
              <div>
                                  <p className="text-sm font-semibold mb-1 tracking-wide uppercase" style={{ color: 'var(--accent-text)', fontSize: '12px' }}>WALLET ADDRESS</p>
                  <p className="text-sm font-mono break-all leading-relaxed font-medium" style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
                  {currentAccount.address}
                </p>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-base font-semibold" style={{ color: 'var(--neon-blue)', fontSize: '14px' }}>
                  BALANCE: <span className="font-bold" style={{ color: 'var(--secondary-text)' }}>{balance} SUI</span>
                </p>
              </div>
            </div>
          </div>
        )}

                  {error && (
            <div className="mt-4 p-4 glass-panel rounded-lg" style={{ border: '1px solid rgba(255, 187, 102, 0.6)', backgroundColor: 'rgba(64, 32, 0, 0.2)', boxShadow: '0 0 20px rgba(255, 187, 102, 0.3)' }}>
              <p className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent-text)', fontSize: '13px' }}>
                ERROR: {error}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
