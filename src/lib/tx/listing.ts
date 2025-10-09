import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk';
import type { KioskClient } from '@mysten/kiosk';

/**
 * Parameters for listing an item in the kiosk
 */
export interface ListItemParams {
  kioskClient: KioskClient;
  kioskId: string;
  kioskOwnerCapId: string;
  itemId: string;
  itemType: string;
  price: string; // Price in MIST (1 SUI = 1,000,000,000 MIST)
}

/**
 * Parameters for delisting an item from the kiosk
 */
export interface DelistItemParams {
  kioskClient: KioskClient;
  kioskId: string;
  kioskOwnerCapId: string;
  itemId: string;
  itemType: string;
}

/**
 * Parameters for batch listing multiple items
 */
export interface BatchListItemsParams {
  kioskClient: KioskClient;
  kioskId: string;
  kioskOwnerCapId: string;
  items: Array<{
    itemId: string;
    itemType: string;
    price: string;
  }>;
}

/**
 * Build a transaction to list an item for sale in the kiosk
 * Reference: https://sdk.mystenlabs.com/kiosk/kiosk-client/kiosk-transaction/purchasing
 */
export function buildListItemTx(params: ListItemParams): Transaction {
  const { kioskClient, kioskId, kioskOwnerCapId, itemId, itemType, price } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set the kiosk and kiosk owner cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // List the item with the specified price
  kioskTx.list({
    itemType,
    itemId: tx.object(itemId),
    price,
  });

  kioskTx.finalize();
  return tx;
}

/**
 * Build a transaction to delist an item from the kiosk
 */
export function buildDelistItemTx(params: DelistItemParams): Transaction {
  const { kioskClient, kioskId, kioskOwnerCapId, itemId, itemType } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set the kiosk and kiosk owner cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // Delist the item
  kioskTx.delist({
    itemType,
    itemId: tx.object(itemId),
  });

  kioskTx.finalize();
  return tx;
}

/**
 * Build a transaction to list multiple items at once
 * This is more efficient than creating separate transactions for each item
 */
export function buildBatchListItemsTx(params: BatchListItemsParams): Transaction {
  const { kioskClient, kioskId, kioskOwnerCapId, items } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set the kiosk and kiosk owner cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // List each item
  for (const item of items) {
    kioskTx.list({
      itemType: item.itemType,
      itemId: tx.object(item.itemId),
      price: item.price,
    });
  }

  kioskTx.finalize();
  return tx;
}

/**
 * Helper function to convert SUI amount to MIST
 * 1 SUI = 1,000,000,000 MIST
 */
export function suiToMist(suiAmount: number): string {
  return Math.floor(suiAmount * 1_000_000_000).toString();
}

/**
 * Helper function to convert MIST to SUI
 */
export function mistToSui(mistAmount: string | number): number {
  const mist = typeof mistAmount === 'string' ? parseInt(mistAmount, 10) : mistAmount;
  return mist / 1_000_000_000;
}

