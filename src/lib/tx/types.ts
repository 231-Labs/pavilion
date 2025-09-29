import type { KioskClient } from '@mysten/kiosk';

export type PavilionTxConfig =
  | {
      mode: 'create';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
    }
  | {
      mode: 'existing';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
      kioskId: string;
      kioskOwnerCapId: string;
    }
  | {
      mode: 'auto';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
    };

export interface PavilionTxParams {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
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
