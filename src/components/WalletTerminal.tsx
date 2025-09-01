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
    <div className="absolute top-6 left-6 z-20 glass-panel control-panel max-w-xs min-w-[320px] overflow-hidden glow">
      <div className="relative z-10">
        {/* Title bar */}
        <div
          className="flex justify-between items-center p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="neon-text text-xl font-medium tracking-wider uppercase" style={{ fontSize: '18px' }}>
            Wallet
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--secondary-text)', fontSize: '13px' }}>
              {isExpanded ? 'COLLAPSE' : 'EXPAND'}
            </span>
            <span className="transition-transform duration-300" style={{ color: 'var(--neon-light-blue)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
        </div>

        {/* Control panel content */}
        {isExpanded && (
          <div className="p-3 space-y-3" style={{ fontSize: '13px' }}>

            <ConnectButton
              className="liquid-button w-full py-2 px-3 text-sm font-light tracking-wide uppercase neon-text"
            />
            <button
              onClick={handleCallSuiFunction}
              className="liquid-button w-full py-2 px-3 text-sm font-light tracking-wide uppercase neon-text"
            >
              Call Sui Function
            </button>

            {currentAccount && (
              <div className="p-3 glass-panel rounded-lg">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold mb-1 tracking-wide uppercase" style={{ color: 'var(--accent-text)', fontSize: '12px' }}>WALLET ADDRESS</p>
                    <p className="text-sm font-mono break-all leading-relaxed font-medium" style={{ color: 'var(--secondary-text)', fontSize: '12px' }}>
                      {currentAccount.address}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-sm font-semibold" style={{ color: 'var(--neon-blue)', fontSize: '13px' }}>
                      BALANCE: <span className="font-bold" style={{ color: 'var(--secondary-text)' }}>{balance} SUI</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 glass-panel rounded-lg" style={{ border: '1px solid rgba(255, 187, 102, 0.6)', backgroundColor: 'rgba(64, 32, 0, 0.2)', boxShadow: '0 0 20px rgba(255, 187, 102, 0.3)' }}>
                <p className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent-text)', fontSize: '12px' }}>
                  ERROR: {error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
