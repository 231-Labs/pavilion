import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/bcs';
import { fromBase64 } from '@mysten/sui/utils';
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
 * Update the display status of a kiosk NFT item (show/hide)
 */
export async function updateKioskNftDisplayStatus(params: {
  kioskClient: KioskClient;
  packageId: string;
  kioskId: string;
  kioskOwnerCapId: string;
  objectId: string;
  displayed: boolean;
}): Promise<Transaction> {
  const { kioskClient, packageId, kioskId, kioskOwnerCapId, objectId, displayed } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set kiosk and kiosk cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // Call toggle_object_display function
  tx.moveCall({
    target: `${packageId}::pavilion::toggle_object_display`,
    arguments: [
      kioskTx.getKiosk(),
      kioskTx.getKioskCap(),
      tx.pure.id(objectId),
    ],
  });

  kioskTx.finalize();
  return tx;
}

/**
 * Batch update kiosk NFT object properties (position, rotation, scale)
 */
export async function batchUpdateKioskNftProperties(params: {
  kioskClient: KioskClient;
  packageId: string;
  kioskId: string;
  kioskOwnerCapId: string;
  updates: Array<{
    objectId: string;
    displayed: boolean;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
  }>;
}): Promise<Transaction> {
  const { kioskClient, packageId, kioskId, kioskOwnerCapId, updates } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set kiosk and kiosk cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // Call set_object_properties for each update (avoid constructing vector<ObjectProperties>)
  for (const update of updates) {
    const positionVec = tx.makeMoveVec({
      type: 'u64',
      elements: [
        tx.pure.u64(Math.round(update.position.x * 1000)),
        tx.pure.u64(Math.round(update.position.y * 1000)),
        tx.pure.u64(Math.round(update.position.z * 1000)),
      ],
    });

    const rotationVec = tx.makeMoveVec({
      type: 'u64',
      elements: [
        tx.pure.u64(Math.round((update.rotation.x * 180 / Math.PI) * 1000)),
        tx.pure.u64(Math.round((update.rotation.y * 180 / Math.PI) * 1000)),
        tx.pure.u64(Math.round((update.rotation.z * 180 / Math.PI) * 1000)),
      ],
    });

    tx.moveCall({
      target: `${packageId}::pavilion::set_object_properties`,
      arguments: [
        kioskTx.getKiosk(),
        kioskTx.getKioskCap(),
        tx.pure.id(update.objectId),
        tx.pure.bool(update.displayed),
        positionVec,
        rotationVec,
        tx.pure.u64(Math.round(update.scale * 1000)),
      ],
    });
  }

  kioskTx.finalize();
  return tx;
}

/**
 * Update single kiosk NFT object properties
 */
export async function updateKioskNftProperties(params: {
  kioskClient: KioskClient;
  packageId: string;
  kioskId: string;
  kioskOwnerCapId: string;
  objectId: string;
  displayed: boolean;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}): Promise<Transaction> {
  const { kioskClient, packageId, kioskId, kioskOwnerCapId, objectId, displayed, position, rotation, scale } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // Set kiosk and kiosk cap
  kioskTx.setKiosk(tx.object(kioskId));
  kioskTx.setKioskCap(tx.object(kioskOwnerCapId));

  // Position vector [x, y, z]
  const positionVec = tx.makeMoveVec({
    elements: [
      tx.pure.u64(Math.round(position.x * 1000)), // Convert to milliunits
      tx.pure.u64(Math.round(position.y * 1000)),
      tx.pure.u64(Math.round(position.z * 1000))
    ]
  });

  // Rotation vector [x, y, z] in degrees
  const rotationVec = tx.makeMoveVec({
    elements: [
      tx.pure.u64(Math.round((rotation.x * 180 / Math.PI) * 1000)),
      tx.pure.u64(Math.round((rotation.y * 180 / Math.PI) * 1000)),
      tx.pure.u64(Math.round((rotation.z * 180 / Math.PI) * 1000))
    ]
  });

  // Call set_object_properties
  tx.moveCall({
    target: `${packageId}::pavilion::set_object_properties`,
    arguments: [
      kioskTx.getKiosk(),
      kioskTx.getKioskCap(),
      tx.pure.id(objectId),
      tx.pure.bool(displayed),
      positionVec,
      rotationVec,
      tx.pure.u64(Math.round(scale * 1000)), // Convert to milliunits
    ],
  });

  kioskTx.finalize();
  return tx;
}

// ================== Scene reconstruction helpers (devInspect) ==================

export type ParsedObjectProperties = {
  displayed: boolean;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // radians
  scale: number; // uniform scale
  updated_at: number;
};

const ObjectPropertiesBcs = bcs.struct('ObjectProperties', {
  displayed: bcs.bool(),
  position: bcs.vector(bcs.u64()),
  rotation: bcs.vector(bcs.u64()),
  scale: bcs.u64(),
  updated_at: bcs.u64(),
});

function decodeOptionObjectProperties(bytes: Uint8Array): ParsedObjectProperties | null {
  // Sui Option encoding: leading tag byte 0=none, 1=some
  if (bytes.length === 0) return null;
  const tag = bytes[0];
  if (tag === 0) return null;
  const inner = bytes.slice(1);
  const raw = ObjectPropertiesBcs.parse(inner) as {
    displayed: boolean;
    position: string[]; // u64s
    rotation: string[]; // u64s
    scale: string; // u64
    updated_at: string; // u64
  };
  const posNums = raw.position.map((v) => Number(v));
  const rotNums = raw.rotation.map((v) => Number(v));
  const scaleNum = Number(raw.scale);
  const toRad = (degTimes1000: number) => (degTimes1000 / 1000) * Math.PI / 180;
  return {
    displayed: raw.displayed,
    position: {
      x: (posNums[0] ?? 0) / 1000,
      y: (posNums[1] ?? 0) / 1000,
      z: (posNums[2] ?? 0) / 1000,
    },
    rotation: {
      x: toRad(rotNums[0] ?? 0),
      y: toRad(rotNums[1] ?? 0),
      z: toRad(rotNums[2] ?? 0),
    },
    scale: scaleNum / 1000,
    updated_at: Number(raw.updated_at),
  };
}

// ================== Simple JSON scene config via dynamic field ==================

export async function readSceneConfig(params: {
  suiClient: any;
  packageId: string;
  kioskId: string;
}): Promise<string | null> {
  const { suiClient, packageId, kioskId } = params;
  try {
    const resp = await suiClient.getDynamicFieldObject({
      parentId: kioskId,
      name: {
        type: `${packageId}::pavilion::SceneConfig`,
        value: {},
      },
    });
    const value = (resp as any)?.data?.content?.fields?.value;
    return typeof value === 'string' ? value : null;
  } catch {
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

export async function devInspectObjectProperties(params: {
  suiClient: any;
  sender: string;
  packageId: string;
  kioskId: string;
  objectIds: string[];
}): Promise<Record<string, ParsedObjectProperties | null>> {
  const { suiClient, sender, packageId, kioskId, objectIds } = params;
  const tx = new Transaction();
  const kiosk = tx.object(kioskId);

  for (const id of objectIds) {
    tx.moveCall({
      target: `${packageId}::pavilion::get_object_properties`,
      arguments: [kiosk, tx.pure.id(id)],
    });
  }

  const res = await suiClient.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });

  const out: Record<string, ParsedObjectProperties | null> = {};
  const results = (res as any)?.results ?? [];
  for (let i = 0; i < objectIds.length; i++) {
    const r = results[i];
    const rv = r?.returnValues?.[0];
    if (!rv) { out[objectIds[i]] = null; continue; }

    // rv is usually [base64, typeStr], but be defensive
    let bytesStr: string | undefined;
    try {
      const a = Array.isArray(rv) ? rv : [];
      const s0 = String(a[0] ?? '');
      const s1 = String(a[1] ?? '');
      const isB64 = (s: string) => /^[A-Za-z0-9+/=]+$/.test(s) && !s.startsWith('0x') && !s.includes('::');
      if (isB64(s0)) bytesStr = s0; else if (isB64(s1)) bytesStr = s1; else bytesStr = undefined;
    } catch {}

    if (!bytesStr) { out[objectIds[i]] = null; continue; }

    let bytes: Uint8Array | null = null;
    try {
      bytes = fromBase64(bytesStr);
    } catch {
      bytes = null;
    }
    out[objectIds[i]] = bytes ? decodeOptionObjectProperties(bytes) : null;
  }
  return out;
}
