import { useState } from 'react';
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk';

interface PurchaseItemParams {
  itemId: string;
  itemType: string;
  price: string;
  sellerKiosk: string;
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
   * Helper function to register a RoyaltyRule resolver for a specific NFT type
   */
  const registerRoyaltyResolver = (itemType: string) => {
    // Extract package ID and module name from itemType
    // itemType format: packageId::moduleName::TypeName
    const parts = itemType.split('::');
    if (parts.length !== 3) {
      console.error('Invalid itemType format:', itemType);
      return;
    }
    
    const [packageId, moduleName] = parts;
    const ruleType = `${packageId}::${moduleName}::RoyaltyRule`;
    
    // Check if resolver already exists
    const existingResolver = kioskClient.rules.find(r => r.rule === ruleType);
    if (existingResolver) {
      console.log('ℹ️ RoyaltyRule resolver already registered for:', ruleType);
      return;
    }
    
    // Define the RoyaltyRule resolver
    const royaltyRuleResolver = {
      rule: ruleType,
      packageId: packageId,
      resolveRuleFunction: (params: any) => {
        const { transaction, itemType, transferRequest, policyId, price } = params;
        
        console.log('🔧 Resolving RoyaltyRule:', { itemType, price, policyId });
        
        // Extract package and module info from itemType
        const [pkg, mod] = itemType.split('::');
        
        // Convert policyId string to object reference
        const policyObj = transaction.object(policyId);

        // Call calculate_royalty to get the exact royalty amount from chain config
        const [royaltyAmount] = transaction.moveCall({
          target: `${pkg}::${mod}::calculate_royalty`,
          arguments: [
            policyObj,                   // &TransferPolicy
            transaction.pure.u64(price), // price: u64
          ],
        });

        console.log('💰 Calculating royalty from chain config for', `${pkg}::${mod}`);

        // Split coin for royalty payment
        const royaltyCoin = transaction.splitCoins(transaction.gas, [royaltyAmount]);

        // Call pay_royalty_and_add_receipt function
        transaction.moveCall({
          target: `${pkg}::${mod}::pay_royalty_and_add_receipt`,
          arguments: [
            policyObj,        // &TransferPolicy
            transferRequest,  // &mut TransferRequest
            royaltyCoin,      // Coin<SUI> for royalty payment
          ],
        });
        
        console.log('✅ RoyaltyRule resolved for', `${pkg}::${mod}`);
      },
    };

    // Add the resolver to kioskClient
    try {
      kioskClient.addRuleResolver(royaltyRuleResolver);
      console.log('✅ RoyaltyRule resolver registered:', ruleType);
    } catch (error) {
      console.error('Failed to register RoyaltyRule resolver:', error);
    }
  };

  /**
   * Clear purchase status
   */
  const clearPurchaseStatus = () => {
    setPurchaseError(null);
    setPurchaseSuccess(false);
    setTransactionDigest(null);
  };

  /**
   * Convert MIST to SUI
   */
  const mistToSui = (mistAmount: string | number): number => {
    const MIST_TO_SUI = 1000000000;
    const mist = typeof mistAmount === 'string' ? parseFloat(mistAmount) : mistAmount;
    return mist / MIST_TO_SUI;
  };

  /**
   * Convert SUI to MIST
   */
  const suiToMist = (suiAmount: string | number): string => {
    const MIST_TO_SUI = 1000000000;
    const sui = typeof suiAmount === 'string' ? parseFloat(suiAmount) : suiAmount;
    return Math.floor(sui * MIST_TO_SUI).toString();
  };

  /**
   * Purchase an item from a kiosk
   * Reference: https://github.com/MystenLabs/sui/blob/main/dapps/kiosk/src/mutations/kiosk.ts
   */
  const purchaseItem = async ({ itemId, itemType, price, sellerKiosk }: PurchaseItemParams): Promise<void> => {
    if (!currentAccount) {
      setPurchaseError('Please connect your wallet first');
      throw new Error('Please connect your wallet first');
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);

    try {
      // Register RoyaltyRule resolver for this NFT type before purchase
      registerRoyaltyResolver(itemType);
      
      // Create a new transaction
      const tx = new Transaction();

      // Get or create a personal kiosk for the buyer
      const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ 
        address: currentAccount.address 
      });

      let buyerKioskTx: KioskTransaction;

      if (kioskOwnerCaps && kioskOwnerCaps.length > 0) {
        // Use existing kiosk
        buyerKioskTx = new KioskTransaction({ 
          kioskClient, 
          transaction: tx, 
          cap: kioskOwnerCaps[0] 
        });
      } else {
        // Create new personal kiosk
        buyerKioskTx = new KioskTransaction({ 
          kioskClient, 
          transaction: tx 
        });
        buyerKioskTx.create();
      }

      // Purchase the item from the seller's kiosk and place it in buyer's kiosk
      // This will automatically handle Transfer Policy rules
      // IMPORTANT: purchaseAndResolve is async, must await it
      await buyerKioskTx.purchaseAndResolve({
        itemType,
        itemId,
        price,
        sellerKiosk,
      });

      // Finalize the transaction after purchase is complete
      buyerKioskTx.finalize();
      
      // Share the kiosk with the buyer if it's a new kiosk
      if (!(kioskOwnerCaps && kioskOwnerCaps.length > 0)) {
        buyerKioskTx.shareAndTransferCap(currentAccount.address);
      }

      // Execute the transaction - this will trigger the wallet
      const executionResult = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log('Purchase successful:', executionResult);
      
      // Save transaction digest
      if (executionResult.digest) {
        setTransactionDigest(executionResult.digest);
        console.log('Transaction digest:', executionResult.digest);
      }
      
      // Set success status
      setPurchaseSuccess(true);
      
      // Auto-clear success after 10 seconds (give user time to click the link)
      setTimeout(() => {
        setPurchaseSuccess(false);
        setTransactionDigest(null);
      }, 10000);
    } catch (error) {
      console.error('Purchase failed:', error);
      let errorMessage = 'Failed to purchase item';
      
      // Try to extract transaction digest from error if available
      if ((error as any)?.digest) {
        setTransactionDigest((error as any).digest);
        console.log('Failed transaction digest:', (error as any).digest);
      }
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (errorMessage.includes('RoyaltyRule')) {
          errorMessage = 'Transfer policy requires royalty payment. Please ensure you have enough SUI to cover the item price and royalty.';
        } else if (errorMessage.includes('Insufficient funds')) {
          errorMessage = 'Insufficient funds. Please ensure you have enough SUI.';
        } else if (errorMessage.includes('User rejected')) {
          errorMessage = 'Transaction was rejected';
        }
      }
      
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

