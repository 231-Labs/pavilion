import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/KioskClientProvider';
import { useKioskState } from '../../components/KioskStateProvider';
import { buildCreatePavilionTx, buildInitializePavilionWithExistingKioskTx, fetchKioskContents } from '../../lib/tx/pavilion';
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

  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
          showEvents: false,
        },
      }),
  });

  const createPavilion = async () => {
    setError(null);
    setTxDigest(null);
    
    if (!currentAccount) {
      setError('Please connect your wallet');
      return;
    }
    
    if (!PAVILION_PACKAGE_ID) {
      setError('Missing NEXT_PUBLIC_PAVILION_PACKAGE_ID environment variable');
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
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
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
      setError((e as Error).message ?? 'Create Pavilion transaction failed');
    } finally {
      setCreating(false);
    }
  };

  const initializeExistingKiosk = async (selectedKioskId: string, selectedCap: string) => {
    if (!currentAccount || !PAVILION_PACKAGE_ID) {
      setError('Missing requirements for initialization');
      return;
    }

    if (!pavilionName.trim()) {
      setError('Pavilion name is required');
      return;
    }

    setCreating(true);
    try {
      setError(null);
      const tx = await buildInitializePavilionWithExistingKioskTx({
        kioskClient,
        packageId: PAVILION_PACKAGE_ID,
        pavilionName: pavilionName || 'Pavilion',
        ownerAddress: currentAccount.address,
        kioskId: selectedKioskId,
        kioskOwnerCapId: selectedCap,
      });
      
      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = (result as SuiTransactionResult)?.digest ?? null;
      setTxDigest(digest);
      
      // Set global kiosk state and fetch contents
      kioskState.setKioskFromIds({ kioskId: selectedKioskId, kioskOwnerCapId: selectedCap });
      try {
        await fetchKioskContents({ kioskClient, kioskId: selectedKioskId });
      } catch {}
    } catch (e) {
      setError((e as Error).message || 'Failed to initialize pavilion with existing kiosk');
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
