import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { resolveKioskOwnerCapId } from '../../lib/tx/pavilion';
import type { UsePavilionInitializationReturn } from '../../types/pavilion';

export function usePavilionInitialization(): UsePavilionInitializationReturn {
  const searchParams = useSearchParams();
  const kioskId = searchParams.get('kioskId');
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const kioskState = useKioskState();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Handle kioskId parameter - update kiosk state for WalletTerminal display
  useEffect(() => {
    const initializeKiosk = async () => {
      if (kioskId && currentAccount) {
        try {
          setInitializationError(null);
          const capId = await resolveKioskOwnerCapId({
            kioskClient,
            ownerAddress: currentAccount.address,
            kioskId,
          });

          if (capId) {
            kioskState.setKioskFromIds({ kioskId, kioskOwnerCapId: capId });
          } else {
            kioskState.setKioskFromIds({ kioskId });
            console.warn('Kiosk found but no owner cap available for current account');
          }
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to resolve kiosk owner cap:', error);
          setInitializationError('Failed to initialize kiosk');
          kioskState.setKioskFromIds({ kioskId });
          setIsInitialized(true); // Still consider it initialized, just without owner cap
        }
      } else if (kioskId) {
        // No account connected, but we have a kioskId
        setIsInitialized(true);
      }
    };

    initializeKiosk();
  }, [kioskId, currentAccount, kioskClient, kioskState]);

  return {
    kioskId,
    isInitialized,
    initializationError,
  };
}
