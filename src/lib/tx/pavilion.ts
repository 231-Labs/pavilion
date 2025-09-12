import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk'; 
import type { KioskClient } from '@mysten/kiosk';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';


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
    }
  | {
      mode: 'auto';
      kioskClient: KioskClient;
      packageId: string;
      pavilionName: string;
      ownerAddress: string;
    };

/**
 * Build a transaction to initialize a pavilion on an existing kiosk
 */
async function buildPavilionTxInternal(config: PavilionTxConfig): Promise<Transaction> {
  const { kioskClient, packageId, pavilionName, ownerAddress } = config;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // according to mode initialize kiosk
  if (config.mode === 'create' || config.mode === 'auto') {
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
    ],
  });

  // only need to share and transfer cap when creating new kiosk
  if (config.mode === 'create' || config.mode === 'auto') {
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
 * Build a transaction to initialize a pavilion automatically
 * If user has existing kiosk, use it; otherwise create a new one
 * The kiosk cap will be transferred back to the owner in both cases
 */
export async function buildAutoPavilionTx(params: {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
}): Promise<Transaction> {
  const { kioskClient, ownerAddress } = params;

  try {
    // Try to get existing kiosk for the user
    const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address: ownerAddress });

    if (kioskOwnerCaps && kioskOwnerCaps.length > 0) {
      // User has existing kiosk, use it
      const existingKioskCap = kioskOwnerCaps[0];
      return buildPavilionTxInternal({
        mode: 'existing',
        ...params,
        kioskId: existingKioskCap.kioskId,
        kioskOwnerCapId: existingKioskCap.objectId,
      });
    }
  } catch (error) {
    // If there's an error getting kiosks (e.g., no kiosks), continue to create new one
    console.log('No existing kiosk found, creating new one:', error);
  }

  // No existing kiosk found, create a new one
  return buildPavilionTxInternal({
    mode: 'auto',
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
 * Resolve the KioskOwnerCap object id for a given kiosk owned by an address
 */
export async function resolveKioskOwnerCapId(params: {
  kioskClient: KioskClient;
  ownerAddress: string;
  kioskId: string;
}): Promise<string | null> {
  const { kioskClient, ownerAddress, kioskId } = params;
  const { kioskOwnerCaps = [] } = await kioskClient.getOwnedKiosks({ address: ownerAddress });
  const match = kioskOwnerCaps.find((c: any) => c.kioskId === kioskId);
  return match?.objectId ?? null;
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

/**
 * Debug helper function to test dynamic field access
 * Use this in the browser console to troubleshoot
 */
export async function debugDynamicFields(params: {
  suiClient: any;
  kioskId: string;
}) {
  const { suiClient, kioskId } = params;
  console.log('🔍 Starting dynamic field debugging for kiosk:', kioskId);
  
  try {
    // Get all dynamic fields
    const fieldsResp = await suiClient.getDynamicFields({
      parentId: kioskId,
    });
    console.log('📋 All dynamic fields:', JSON.stringify(fieldsResp, null, 2));
    
    // Get kiosk object structure
    const objResp = await suiClient.getObject({
      id: kioskId,
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    });
    console.log('🏛️ Kiosk structure:', JSON.stringify(objResp, null, 2));
    
    return { fields: fieldsResp, object: objResp };
  } catch (error) {
    console.error('💥 Debug failed:', error);
    throw error;
  }
}

export async function readSceneConfig(params: {
  suiClient: any;
  packageId: string;
  kioskId: string;
}): Promise<string | null> {
  const { suiClient, packageId, kioskId } = params;
  
  try {
    // Primary method: Direct getDynamicFieldObject call
    const resp = await suiClient.getDynamicFieldObject({
      parentId: kioskId,
      name: {
        type: `${packageId}::pavilion::SceneConfig`,
        value: {},
      },
    });
    
    // Extract the JSON string from the dynamic field
    const value = resp?.data?.content?.fields?.value;
    
    if (typeof value === 'string' && value.length > 0) {
      console.log('✅ Successfully loaded scene config from chain');
      return value;
    }
    
    console.log('⚠️ Scene config field exists but value is empty or invalid');
    return null;
    
  } catch {
    // Fallback method: Use getDynamicFields to find the field first
    try {
      const fieldsResp = await suiClient.getDynamicFields({
        parentId: kioskId,
      });
      
      if (fieldsResp?.data && Array.isArray(fieldsResp.data)) {
        const sceneConfigField = fieldsResp.data.find((field: any) => {
          const fieldType = field?.name?.type;
          return fieldType?.includes('SceneConfig');
        });
        
        if (sceneConfigField) {
          const fieldResp = await suiClient.getDynamicFieldObject({
            parentId: kioskId,
            name: sceneConfigField.name,
          });
          
          const value = fieldResp?.data?.content?.fields?.value;
          if (typeof value === 'string' && value.length > 0) {
            console.log('✅ Successfully loaded scene config from chain (fallback method)');
            return value;
          }
        }
      }
    } catch (fallbackError) {
      console.log('❌ Both primary and fallback methods failed:', fallbackError);
    }
    
    console.log('💭 No scene config found on chain');
    return null;
  }
}

export function setSceneConfigTx(params: {
  kioskClient: KioskClient;
  packageId: string;
  kioskId: string;
  kioskOwnerCapId: string;
  json: string;
}): Transaction {
  const { kioskClient, packageId, kioskId, kioskOwnerCapId, json } = params;
  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));
  tx.moveCall({
    target: `${packageId}::pavilion::set_scene_config`,
    arguments: [kioskTx.getKiosk(), kioskTx.getKioskCap(), tx.pure.string(json)],
  });
  kioskTx.finalize();
  return tx;
}

