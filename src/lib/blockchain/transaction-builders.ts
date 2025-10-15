import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction, type KioskClient } from '@mysten/kiosk';
import type { PavilionTxConfig, PavilionTxParams, ExistingKioskParams, SetSceneConfigParams } from './types';

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

export async function buildCreatePavilionTx(params: PavilionTxParams): Promise<Transaction> {
  return buildPavilionTxInternal({
    mode: 'create',
    ...params,
  });
}

export async function buildInitializePavilionWithExistingKioskTx(params: ExistingKioskParams): Promise<Transaction> {
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
export async function buildAutoPavilionTx(params: PavilionTxParams): Promise<Transaction> {
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

export function setSceneConfigTx(params: SetSceneConfigParams): Transaction {
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
