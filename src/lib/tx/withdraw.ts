import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk';
import type { WithdrawProfitsParams, WithdrawProfitsResult } from './types';

/**
 * Build a transaction to withdraw profits from a kiosk
 * Reference: https://sdk.mystenlabs.com/kiosk/kiosk-client/kiosk-transaction
 * 
 * @param params - Withdraw profits parameters
 * @returns Promise<WithdrawProfitsResult> - Transaction and metadata
 */
export async function buildWithdrawProfitsTx(
  params: WithdrawProfitsParams
): Promise<WithdrawProfitsResult> {
  const { kioskClient, kioskId, kioskOwnerCapId, ownerAddress, amount } = params;

  // Create a new transaction
  const tx = new Transaction();

  // Create KioskTransaction instance with existing kiosk
  const kioskTx = new KioskTransaction({ 
    kioskClient, 
    transaction: tx 
  });

  // Set the kiosk and kiosk owner cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // Withdraw profits from the kiosk
  // If amount is specified, withdraw that amount, otherwise withdraw all
  if (amount) {
    kioskTx.withdraw(ownerAddress, amount);
  } else {
    kioskTx.withdraw(ownerAddress);
  }

  // Finalize the transaction
  kioskTx.finalize();

  return {
    transaction: tx,
    withdrawnAmount: amount,
  };
}

/**
 * Parse error messages from withdraw transactions
 * @param error - Error object from transaction execution
 * @returns Formatted error message
 */
export function parseWithdrawError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to withdraw profits';
  }

  const errorMessage = error.message;

  // Handle specific error cases
  if (errorMessage.includes('Insufficient profits')) {
    return 'Insufficient profits in kiosk. Please check your profit balance.';
  } else if (errorMessage.includes('User rejected')) {
    return 'Transaction was rejected';
  } else if (errorMessage.includes('Dry run failed')) {
    return 'Transaction validation failed. Please try again.';
  } else if (errorMessage.includes('Not owner')) {
    return 'You do not have permission to withdraw from this kiosk.';
  }

  return errorMessage;
}

