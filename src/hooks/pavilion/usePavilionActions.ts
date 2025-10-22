import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { buildCreatePavilionTx, buildInitializePavilionWithExistingKioskTx, fetchKioskContents } from '../../lib/tx/pavilion/index';
import type { SuiTransactionResult, UsePavilionActionsReturn } from '../../types/home';

export function usePavilionActions(): UsePavilionActionsReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [createdKioskId, setCreatedKioskId] = useState<string | null>(null);
  const [pavilionName, setPavilionName] = useState('');

  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const kioskState = useKioskState();
  
  const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;
  const PLATFORM_CONFIG_ID = process.env.NEXT_PUBLIC_PLATFORM_CONFIG_ID as string | undefined;
  const PLATFORM_RECIPIENT = process.env.NEXT_PUBLIC_PLATFORM_RECIPIENT as string | undefined;

  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
          showObjectChanges: true,
          showEvents: false,
        },
      }),
  });

  const createPavilion = async () => {
    setError(null);
    setTxDigest(null);
    setCreatedKioskId(null);
    
    if (!currentAccount) {
      setError('Please connect your wallet');
      return;
    }
    
    if (!PAVILION_PACKAGE_ID) {
      setError('Missing NEXT_PUBLIC_PAVILION_PACKAGE_ID environment variable');
      return;
    }
    
    if (!PLATFORM_CONFIG_ID) {
      setError('Missing NEXT_PUBLIC_PLATFORM_CONFIG_ID environment variable');
      return;
    }
    
    if (!PLATFORM_RECIPIENT) {
      setError('Missing NEXT_PUBLIC_PLATFORM_RECIPIENT environment variable');
      return;
    }
    
    if (!pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }

    setCreating(true);
    try {
      const tx = await buildCreatePavilionTx({
        kioskClient,
        packageId: PAVILION_PACKAGE_ID,
        pavilionName,
        ownerAddress: currentAccount.address,
        platformConfigId: PLATFORM_CONFIG_ID,
        platformRecipient: PLATFORM_RECIPIENT,
        suiClient,
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Check if transaction was successful
      const effects = (result as SuiTransactionResult)?.effects;
      const status = effects?.status?.status;
      
      if (status !== 'success') {
        // Transaction failed
        const errorMsg = effects?.status?.error || 'Transaction execution failed';
        setError(errorMsg);
        return;
      }

      // Only set digest if transaction succeeded
      const digest = (result as SuiTransactionResult)?.digest ?? null;
      setTxDigest(digest);

      // Extract new kiosk & cap ids from transaction
      try {
        const changes = (result as SuiTransactionResult)?.objectChanges ?? [];
        const kioskChange = changes.find(ch => 
          ch.type === 'created' && ch.objectType?.endsWith('::kiosk::Kiosk')
        );
        const capChange = changes.find(ch => 
          ch.type === 'created' && ch.objectType?.endsWith('::kiosk::KioskOwnerCap')
        );
        
        const kioskIdNew = kioskChange?.objectId;
        const kioskOwnerCapIdNew = capChange?.objectId;
        
        if (kioskIdNew) {
          setCreatedKioskId(kioskIdNew);
          await fetchKioskContents({ kioskClient, kioskId: kioskIdNew });
        }
        if (kioskIdNew || kioskOwnerCapIdNew) {
          kioskState.setKioskFromIds({ kioskId: kioskIdNew, kioskOwnerCapId: kioskOwnerCapIdNew });
        }
      } catch {
        // Failed to parse kiosk ids from transaction
      }
    } catch (e) {
      const error = e as Error;
      // Handle user rejection
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        setError('Transaction cancelled by user');
      } else {
        setError(error.message ?? 'Create Pavilion transaction failed');
      }
    } finally {
      setCreating(false);
    }
  };

  const initializeExistingKiosk = async (selectedKioskId: string, selectedCap: string) => {
    setError(null);
    setTxDigest(null);
    setCreatedKioskId(null);
    
    if (!currentAccount || !PAVILION_PACKAGE_ID) {
      setError('Missing requirements for initialization');
      return;
    }
    
    if (!PLATFORM_CONFIG_ID) {
      setError('Missing NEXT_PUBLIC_PLATFORM_CONFIG_ID environment variable');
      return;
    }
    
    if (!PLATFORM_RECIPIENT) {
      setError('Missing NEXT_PUBLIC_PLATFORM_RECIPIENT environment variable');
      return;
    }

    if (!pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }

    setCreating(true);
    try {
      const tx = await buildInitializePavilionWithExistingKioskTx({
        kioskClient,
        packageId: PAVILION_PACKAGE_ID,
        pavilionName: pavilionName || 'Pavilion',
        ownerAddress: currentAccount.address,
        kioskId: selectedKioskId,
        kioskOwnerCapId: selectedCap,
        platformConfigId: PLATFORM_CONFIG_ID,
        platformRecipient: PLATFORM_RECIPIENT,
        suiClient,
      });
      
      const result = await signAndExecuteTransaction({ transaction: tx });
      
      // Check if transaction was successful
      const effects = (result as SuiTransactionResult)?.effects;
      const status = effects?.status?.status;
      
      if (status !== 'success') {
        // Transaction failed
        const errorMsg = effects?.status?.error || 'Transaction execution failed';
        setError(errorMsg);
        return;
      }

      // Only set digest if transaction succeeded
      const digest = (result as SuiTransactionResult)?.digest ?? null;
      setTxDigest(digest);
      
      // Set global kiosk state and fetch contents
      kioskState.setKioskFromIds({ kioskId: selectedKioskId, kioskOwnerCapId: selectedCap });
      try {
        await fetchKioskContents({ kioskClient, kioskId: selectedKioskId });
      } catch {}
    } catch (e) {
      const error = e as Error;
      // Handle user rejection
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        setError('Transaction cancelled by user');
      } else {
        setError(error.message || 'Failed to initialize pavilion with existing kiosk');
      }
    } finally {
      setCreating(false);
    }
  };

  return {
    creating,
    error,
    txDigest,
    createdKioskId,
    pavilionName,
    setPavilionName,
    setError,
    createPavilion,
    initializeExistingKiosk,
  };
}
