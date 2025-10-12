import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { buildBatchListItemsTx, suiToMist } from '../../lib/tx/listing';

interface ListItemsParams {
  items: Array<{ itemId: string; price: string }>;
  allKioskItems: any[];
}

/**
 * Hook for handling NFT listing functionality
 */
export function useNftListing() {
  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const kioskState = useKioskState();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  /**
   * List multiple NFT items with individual prices
   */
  const listItems = async ({ items, allKioskItems }: ListItemsParams): Promise<void> => {
    // Validate kiosk state
    if (!kioskState.kioskId || !kioskState.kioskOwnerCapId) {
      throw new Error('Kiosk ID or Kiosk Owner Cap ID not available');
    }

    // Validate wallet connection
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    // Build the items array with types and convert prices to MIST
    const itemsToList = items.map(({ itemId, price }) => {
      const item = allKioskItems.find(i => i.objectId === itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found in kiosk items`);
      }
      
      return {
        itemId,
        itemType: item.type || '',
        price: suiToMist(parseFloat(price)),
      };
    });

    // Build the transaction
    const tx = buildBatchListItemsTx({
      kioskClient,
      kioskId: kioskState.kioskId,
      kioskOwnerCapId: kioskState.kioskOwnerCapId,
      items: itemsToList,
    });

    // Execute the transaction
    return new Promise<void>((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('✅ List transaction successful:', result);
            
            // Refresh kiosk data to get updated listing status
            if (kioskState.kioskId) {
              await kioskState.refresh();
            }
            
            resolve();
          },
          onError: (error) => {
            console.error('❌ List transaction failed:', error);
            reject(error);
          },
        }
      );
    });
  };

  return {
    listItems,
  };
}

