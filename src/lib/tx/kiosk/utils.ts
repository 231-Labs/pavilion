import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import type { KioskIdsResult, FetchKioskContentsParams, ResolveKioskOwnerCapParams, FetchKioskIdsParams, DebugDynamicFieldsParams } from '../types';

/**
 * Parse the transaction result (or fetch by digest) and return created kiosk & kiosk cap object ids.
 */
export async function fetchKioskIdsFromTx(params: FetchKioskIdsParams): Promise<KioskIdsResult> {
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
 * Resolve the KioskOwnerCap object id for a given kiosk owned by an address
 */
export async function resolveKioskOwnerCapId(params: ResolveKioskOwnerCapParams): Promise<string | null> {
  const { kioskClient, ownerAddress, kioskId } = params;
  const { kioskOwnerCaps = [] } = await kioskClient.getOwnedKiosks({ address: ownerAddress });
  const match = kioskOwnerCaps.find((c: any) => c.kioskId === kioskId);
  return match?.objectId ?? null;
}

/**
 * Convenience helper to query kiosk contents for UI.
 */
export async function fetchKioskContents(params: FetchKioskContentsParams) {
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

/**
 * Debug helper function to test dynamic field access
 * Use this in the browser console to troubleshoot
 */
export async function debugDynamicFields(params: DebugDynamicFieldsParams) {
  const { suiClient, kioskId } = params;
  
  try {
    // Get all dynamic fields
    const fieldsResp = await suiClient.getDynamicFields({
      parentId: kioskId,
    });
    
    // Get kiosk object structure
    const objResp = await suiClient.getObject({
      id: kioskId,
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    });
    
    return { fields: fieldsResp, object: objResp };
  } catch (error) {
    throw error;
  }
}
