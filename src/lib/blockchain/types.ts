import type { KioskClient } from '@mysten/kiosk';
import type { Transaction } from '@mysten/sui/transactions';

export type PavilionTxConfig =
  | {
      mode: 'create';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
      platformConfigId: string;
      platformRecipient: string;
      suiClient: any;
    }
  | {
      mode: 'existing';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
      kioskId: string;
      kioskOwnerCapId: string;
      platformConfigId: string;
      platformRecipient: string;
      suiClient: any;
    }
  | {
      mode: 'auto';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
      platformConfigId: string;
      platformRecipient: string;
      suiClient: any;
    };

export interface PavilionTxParams {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
  platformConfigId: string;
  platformRecipient: string;
  suiClient: any;
}

export interface ExistingKioskParams extends PavilionTxParams {
  kioskId: string;
  kioskOwnerCapId: string;
}

export interface KioskIdsResult {
  kioskId?: string;
  kioskOwnerCapId?: string;
}

export interface FetchKioskContentsParams {
  kioskClient: KioskClient;
  kioskId: string;
  retries?: number;
  delayMs?: number;
}

export interface ResolveKioskOwnerCapParams {
  kioskClient: KioskClient;
  ownerAddress: string;
  kioskId: string;
}

export interface FetchKioskIdsParams {
  kioskClient: KioskClient;
  digest?: string;
  result?: any;
}

export interface SceneConfigParams {
  suiClient: any;
  packageId: string;
  kioskId: string;
}

export interface SetSceneConfigParams {
  kioskClient: KioskClient;
  packageId: string;
  kioskId: string;
  kioskOwnerCapId: string;
  json: string;
}

export interface DebugDynamicFieldsParams {
  suiClient: any;
  kioskId: string;
}

export interface PurchaseTransactionParams {
  kioskClient: KioskClient;
  itemId: string;
  itemType: string;
  price: string;
  sellerKiosk: string;
  buyerAddress: string;
}

export interface PurchaseTransactionResult {
  transaction: Transaction;
  isNewKiosk: boolean;
  buyerKioskId?: string;
}
