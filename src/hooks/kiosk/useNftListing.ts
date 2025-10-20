import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { buildBatchListItemsTx, buildDelistItemTx, suiToMist, mistToSui } from '../../lib/tx/kiosk/listing';

interface ListItemsParams {
  items: Array<{ itemId: string; price: string }>;
  allKioskItems: any[];
}

interface DelistItemParams {
  itemId: string;
  itemType: string;
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
            
            // Wait for blockchain to update, then refresh kiosk data
            if (kioskState.kioskId) {
              console.log('🔄 Waiting for blockchain update...');
              // Wait 2 seconds for the transaction to be indexed
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              console.log('🔄 Refreshing kiosk data after listing...');
              await kioskState.refresh();
              console.log('✅ Kiosk data refreshed after listing');
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

  /**
   * Delist a single NFT item
   */
  const delistItem = async ({ itemId, itemType }: DelistItemParams): Promise<void> => {
    // Validate kiosk state
    if (!kioskState.kioskId || !kioskState.kioskOwnerCapId) {
      throw new Error('Kiosk ID or Kiosk Owner Cap ID not available');
    }

    // Validate wallet connection
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    // Build the transaction
    const tx = buildDelistItemTx({
      kioskClient,
      kioskId: kioskState.kioskId,
      kioskOwnerCapId: kioskState.kioskOwnerCapId,
      itemId,
      itemType,
    });

    // Execute the transaction
    return new Promise<void>((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('✅ Delist transaction successful:', result);
            
            // Wait for blockchain to update, then refresh kiosk data
            if (kioskState.kioskId) {
              console.log('🔄 Waiting for blockchain update...');
              // Wait 2 seconds for the transaction to be indexed
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              console.log('🔄 Refreshing kiosk data after delisting...');
              await kioskState.refresh();
              console.log('✅ Kiosk data refreshed after delisting');
            }
            
            resolve();
          },
          onError: (error) => {
            console.error('❌ Delist transaction failed:', error);
            reject(error);
          },
        }
      );
    });
  };

  return {
    listItems,
    delistItem,
    mistToSui,
  };
}

