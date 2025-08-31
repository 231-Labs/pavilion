'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useThreeScene } from '../hooks/useThreeScene';
import { SculptureControlPanel } from '../components/SculptureControlPanel';

export default function Home() {
  const [error, setError] = useState<string>(''); 
  const [balance, setBalance] = useState<string>('0');
  const SUI_TO_MIST = 1000000000;
  
  // Use DappKit hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Use Three.js scene management hook
  const { 
    canvasRef, 
    sculptures, 
    updateSculpturePosition, 
    updateSculptureRotation, 
    updateSculptureScale 
  } = useThreeScene({
    backgroundColor: 0xeeeeee,
    cameraPosition: [0, 5, 10],
    createGallery: true,
    addSculptures: true,
  });

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
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

      {/* Main 3D Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

      {/* Liquid Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

      {/* Left Control Panel - Sui Wallet */}
      <div className="absolute top-6 left-6 z-20 glass-panel control-panel max-w-sm min-w-[320px] p-6 glow">
        <div className="relative z-10">
          <h3 className="neon-text text-xl font-light mb-6 tracking-wider uppercase">
            💼 Wallet Terminal
          </h3>

          <div className="space-y-4">
            <ConnectButton
              className="liquid-button w-full py-3 px-4 text-sm font-light tracking-wide uppercase neon-text"
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
                  <p className="text-xs font-light text-gray-400 mb-1 tracking-wide">WALLET ADDRESS</p>
                  <p className="text-xs font-mono text-gray-300 break-all leading-relaxed">
                    {currentAccount.address}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm font-light neon-text">
                    BALANCE: <span className="font-normal">{balance} SUI</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 glass-panel rounded-lg border border-red-500/20">
              <p className="text-sm font-light text-red-300 tracking-wide">
                ERROR: {error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sculpture Control Panel */}
      <div className="absolute top-6 right-6 z-20">
        <SculptureControlPanel
          sculptures={sculptures}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
        />
      </div>

      {/* Corner Decorative Elements */}
      <div className="absolute top-4 left-4 w-32 h-32 opacity-20 pointer-events-none">
        <div className="w-full h-full border border-white/20 rounded-full"></div>
        <div className="absolute top-2 left-2 w-full h-full border border-white/10 rounded-full"></div>
      </div>

      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15 rounded-full"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5 rounded-full"></div>
      </div>
    </div>
  );
}
