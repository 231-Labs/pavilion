import { useState } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { buildPurchaseTransaction, parsePurchaseError } from '../../lib/tx/purchase';
import { mistToSui, suiToMist } from '../../lib/tx/royalty';

interface PurchaseItemParams {
  itemId: string;
  itemType: string;
  price: string;
  sellerKiosk: string;
  targetKioskId?: string;
  targetKioskCapId?: string;
}

export function useNftPurchase() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(null);
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const kioskClient = useKioskClient();
  const currentAccount = useCurrentAccount();

  /**
   * Clear purchase status
   */
  const clearPurchaseStatus = () => {
    setPurchaseError(null);
    setPurchaseSuccess(false);
    setTransactionDigest(null);
  };

  /**
   * Purchase an item from a kiosk
   * Uses buildPurchaseTransaction from tx/purchase.ts for transaction logic
   */
  const purchaseItem = async ({ itemId, itemType, price, sellerKiosk, targetKioskId, targetKioskCapId }: PurchaseItemParams): Promise<void> => {
    if (!currentAccount) {
      setPurchaseError('Please connect your wallet first');
      throw new Error('Please connect your wallet first');
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    setTransactionDigest(null);

    try {
      // Build the purchase transaction
      const { transaction } = await buildPurchaseTransaction({
        kioskClient,
        itemId,
        itemType,
        price,
        sellerKiosk,
        buyerAddress: currentAccount.address,
        targetKioskId,
        targetKioskCapId,
      });

      // Execute the transaction - this will trigger the wallet
      const executionResult = await signAndExecuteTransaction({
        transaction,
      });

      console.log('✅ Purchase successful:', executionResult);
      
      // Save transaction digest
      if (executionResult.digest) {
        setTransactionDigest(executionResult.digest);
        console.log('📝 Transaction digest:', executionResult.digest);
      }
      
      // Set success status
      setPurchaseSuccess(true);
      
      // Auto-clear success after 10 seconds (give user time to click the link)
      setTimeout(() => {
        setPurchaseSuccess(false);
        setTransactionDigest(null);
      }, 10000);
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      // Try to extract transaction digest from error if available
      if ((error as any)?.digest) {
        setTransactionDigest((error as any).digest);
        console.log('📝 Failed transaction digest:', (error as any).digest);
      }
      
      // Parse error message using helper function
      const errorMessage = parsePurchaseError(error);
      setPurchaseError(errorMessage);
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  };

  return {
    purchaseItem,
    isPurchasing,
    purchaseError,
    purchaseSuccess,
    transactionDigest,
    clearPurchaseStatus,
    mistToSui,
    suiToMist,
  };
}

