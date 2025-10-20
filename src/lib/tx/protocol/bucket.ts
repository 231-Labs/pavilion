import { Transaction } from '@mysten/sui/transactions';
import { BucketClient } from 'bucket-protocol-sdk';
import { KioskTransaction } from '@mysten/kiosk';
import { KioskClient } from '@mysten/kiosk';

/**
 * Parameters for deposit and borrow transaction
 */
export interface DepositAndBorrowParams {
  bucketClient: BucketClient;
  kioskClient: KioskClient;
  kioskId: string;
  kioskOwnerCapId: string;
  ownerAddress: string;
  collateralAmount: number;
  borrowAmount: number;
}

/**
 * Result of deposit and borrow transaction
 */
export interface DepositAndBorrowResult {
  transaction: Transaction;
  collateralAmount: number;
  borrowAmount: number;
}

/**
 * Build a transaction that:
 * 1. Withdraws profits from kiosk
 * 2. Deposits SUI as collateral to Bucket Protocol
 * 3. Borrows USDB against the collateral
 * 
 * @param params - Deposit and borrow parameters
 * @returns Transaction with withdraw and Bucket operations
 */
export async function buildDepositAndBorrowTx(
  params: DepositAndBorrowParams
): Promise<DepositAndBorrowResult> {
  const {
    bucketClient,
    kioskClient,
    kioskId,
    kioskOwnerCapId,
    ownerAddress,
    collateralAmount,
    borrowAmount,
  } = params;

  // Create a new transaction
  const tx = new Transaction();

  // Step 1: Withdraw profits from kiosk
  const kioskTx = new KioskTransaction({
    kioskClient,
    transaction: tx,
  });

  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));
  kioskTx.withdraw(ownerAddress);
  kioskTx.finalize();

  // Step 2: Add Bucket Protocol operations to the same transaction
  await bucketClient.buildManagePositionTransaction(tx, {
    coinType: '0x2::sui::SUI',
    depositCoinOrAmount: collateralAmount,
    borrowAmount: borrowAmount,
  });

  return {
    transaction: tx,
    collateralAmount,
    borrowAmount,
  };
}

/**
 * Calculate borrowable USDB amount based on collateral
 * Using 200% collateral ratio (1 SUI can borrow 0.5 USDB worth)
 * 
 * @param collateralMist - Collateral amount in MIST (1 SUI = 1e9 MIST)
 * @returns Borrowable USDB amount (1 USDB = 1e6)
 */
export function calculateBorrowableUsdb(collateralMist: number): number {
  // 1 SUI = 1e9 MIST, 1 USDB = 1e6
  // Borrow amount = (collateral / 2) * (1e6 / 1e9) = collateral / 2000
  return Math.floor(collateralMist / 2000);
}

/**
 * Parse error messages from Bucket transactions
 * @param error - Error object from transaction execution
 * @returns Formatted error message
 */
export function parseBucketError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to complete Bucket transaction';
  }

  const errorMessage = error.message;

  if (errorMessage.includes('Insufficient balance')) {
    return 'Insufficient balance';
  } else if (errorMessage.includes('User rejected')) {
    return 'Transaction rejected';
  } else if (errorMessage.includes('Insufficient collateral')) {
    return 'Insufficient collateral';
  } else if (errorMessage.includes('Position not found')) {
    return 'Position not found';
  } else if (errorMessage.includes('Minimum collateral')) {
    return 'Minimum collateral amount is required';
  }

  return errorMessage;
}

