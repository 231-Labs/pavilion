import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk';
import type { PurchaseTransactionParams, PurchaseTransactionResult } from './types';
import { registerRoyaltyResolver } from './royalty';

/**
 * Build a purchase transaction for buying an NFT from a kiosk
 * Reference: https://github.com/MystenLabs/sui/blob/main/dapps/kiosk/src/mutations/kiosk.ts
 * 
 * @param params - Purchase transaction parameters
 * @returns Promise<PurchaseTransactionResult> - Transaction and metadata
 */
export async function buildPurchaseTransaction(
  params: PurchaseTransactionParams
): Promise<PurchaseTransactionResult> {
  const { kioskClient, itemId, itemType, price, sellerKiosk, buyerAddress, targetKioskId, targetKioskCapId } = params;

  // Register RoyaltyRule resolver for this NFT type before building transaction
  registerRoyaltyResolver(kioskClient, itemType);
  
  // Create a new transaction
  const tx = new Transaction();

  let buyerKioskTx: KioskTransaction;
  let isNewKiosk = false;
  let usedKioskId: string | undefined;

  // Check if user specified a target kiosk
  if (targetKioskId && targetKioskCapId) {
    // Use the specified target kiosk
    buyerKioskTx = new KioskTransaction({ 
      kioskClient, 
      transaction: tx, 
      cap: {
        objectId: targetKioskCapId,
        kioskId: targetKioskId,
        isPersonal: false
      }
    });
    usedKioskId = targetKioskId;
    console.log('🎯 Using selected pavilion kiosk:', targetKioskId);
  } else {
    // Original behavior: Get or create a personal kiosk for the buyer
    const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ 
      address: buyerAddress 
    });

    if (kioskOwnerCaps && kioskOwnerCaps.length > 0) {
      // Use existing kiosk
      buyerKioskTx = new KioskTransaction({ 
        kioskClient, 
        transaction: tx, 
        cap: kioskOwnerCaps[0] 
      });
      usedKioskId = kioskOwnerCaps[0].kioskId;
      console.log('📦 Using existing kiosk:', kioskOwnerCaps[0].kioskId);
    } else {
      // Create new personal kiosk
      buyerKioskTx = new KioskTransaction({ 
        kioskClient, 
        transaction: tx 
      });
      buyerKioskTx.create();
      isNewKiosk = true;
      console.log('🆕 Creating new kiosk for buyer');
    }
  }

  // Purchase the item from the seller's kiosk and place it in buyer's kiosk
  // This will automatically handle Transfer Policy rules including royalty
  // IMPORTANT: purchaseAndResolve is async, must await it
  await buyerKioskTx.purchaseAndResolve({
    itemType,
    itemId,
    price,
    sellerKiosk,
  });

  console.log('✅ Purchase transaction built successfully');

  // Finalize the transaction after purchase is complete
  buyerKioskTx.finalize();
  
  // Share the kiosk with the buyer if it's a new kiosk
  if (isNewKiosk) {
    buyerKioskTx.shareAndTransferCap(buyerAddress);
  }

  return {
    transaction: tx,
    isNewKiosk,
    buyerKioskId: usedKioskId,
  };
}

/**
 * Parse error messages from purchase transactions
 * @param error - Error object from transaction execution
 * @returns Formatted error message
 */
export function parsePurchaseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to purchase item';
  }

  const errorMessage = error.message;

  // Handle specific error cases
  if (errorMessage.includes('RoyaltyRule')) {
    return 'Transfer policy requires royalty payment. Please ensure you have enough SUI to cover the item price and royalty.';
  } else if (errorMessage.includes('Insufficient funds')) {
    return 'Insufficient funds. Please ensure you have enough SUI.';
  } else if (errorMessage.includes('User rejected')) {
    return 'Transaction was rejected';
  } else if (errorMessage.includes('Dry run failed')) {
    return 'Transaction validation failed. Please check your balance and try again.';
  }

  return errorMessage;
}

