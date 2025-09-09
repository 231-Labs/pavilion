import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk'; 
import type { KioskClient, KioskOwnerCap } from '@mysten/kiosk';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';

// export async function getCap(params: { kioskClient: KioskClient; address: string; }): Promise<KioskOwnerCap> {
//   const { kioskClient, address } = params;
//   const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address });
//   if (!kioskOwnerCaps || kioskOwnerCaps.length === 0) {
//     throw new Error('No kiosk owner cap found for the provided address');
//   }
//   return kioskOwnerCaps[0];
// }

type PavilionTxConfig =
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
    };

/**
 * Build a transaction to initialize a pavilion on an existing kiosk
 */
async function buildPavilionTxInternal(config: PavilionTxConfig): Promise<Transaction> {
  const { kioskClient, packageId, pavilionName, ownerAddress } = config;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // according to mode initialize kiosk
  if (config.mode === 'create') {
    kioskTx.create();
  } else {
    kioskTx.setKiosk(tx.object(config.kioskId));
    kioskTx.setKioskCap(tx.object(config.kioskOwnerCapId));
  }

  // common initialize_pavilion call
  tx.moveCall({
    target: `${packageId}::pavilion::initialize_pavilion`,
    arguments: [
      kioskTx.getKiosk(),
      kioskTx.getKioskCap(),
      tx.pure.string(pavilionName),
      tx.pure.address(ownerAddress),
    ],
  });

  // only need to share and transfer cap when creating new kiosk
  if (config.mode === 'create') {
    kioskTx.shareAndTransferCap(ownerAddress);
  }

  kioskTx.finalize();
  return tx;
}

export async function buildCreatePavilionTx(params: {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
}): Promise<Transaction> {
  return buildPavilionTxInternal({
    mode: 'create',
    ...params,
  });
}

export async function buildInitializePavilionWithExistingKioskTx(params: {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
  kioskId: string;
  kioskOwnerCapId: string;
}): Promise<Transaction> {
  return buildPavilionTxInternal({
    mode: 'existing',
    ...params,
  });
}

/**
 * Parse the transaction result (or fetch by digest) and return created kiosk & kiosk cap object ids.
 */
export async function fetchKioskIdsFromTx(params: {
  kioskClient: KioskClient;
  digest?: string;
  result?: SuiTransactionBlockResponse;
}): Promise<{ kioskId?: string; kioskOwnerCapId?: string }>
{
  const { kioskClient, digest, result } = params;
  let tx = result;
  // If we don't have a tx or it lacks objectChanges, fetch by digest (from arg or from result.digest)
  const ensureTxWithChanges = async () => {
    if (tx && Array.isArray((tx as any).objectChanges) && (tx as any).objectChanges.length > 0) return tx;
    const d = digest ?? ((tx as any)?.digest as string | undefined);
    if (!d) return tx;
    return kioskClient.client.getTransactionBlock({
      digest: d,
      options: { showObjectChanges: true, showEffects: false, showEvents: false },
    });
  };
  tx = await ensureTxWithChanges();

  const objectChanges = (tx as SuiTransactionBlockResponse | undefined)?.objectChanges ?? [];
  let kioskId: string | undefined;
  let kioskOwnerCapId: string | undefined;
  for (const change of objectChanges) {
    if (change.type !== 'created') continue;
    const createdType = (change as any).objectType as string | undefined;
    const objectId = (change as any).objectId as string | undefined;
    if (!createdType || !objectId) continue;
    // Match kiosk objects created by 0x2::kiosk
    if (createdType.includes('::kiosk::Kiosk')) kioskId = objectId;
    if (createdType.includes('::kiosk::KioskOwnerCap')) kioskOwnerCapId = objectId;
  }
  return { kioskId, kioskOwnerCapId };
}

/**
 * Convenience helper to query kiosk contents for UI.
 */
export async function fetchKioskContents(params: {
  kioskClient: KioskClient;
  kioskId: string;
  retries?: number;
  delayMs?: number;
}) {
  const { kioskClient, kioskId, retries = 8, delayMs = 300 } = params;
  const options = {
    withKioskFields: true,
    withListingPrices: true,
    withObjects: true,
    objectOptions: { showDisplay: true, showContent: true },
  } as const;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await kioskClient.getKiosk({ id: kioskId, options });
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, Math.floor(delayMs * Math.pow(1.5, attempt))));
    }
  }
  // Unreachable
  return kioskClient.getKiosk({ id: kioskId, options });
}
