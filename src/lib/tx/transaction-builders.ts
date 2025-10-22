import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk';
import type { PavilionTxConfig, PavilionTxParams, ExistingKioskParams, SetSceneConfigParams } from './types';

/**
 * Fetch creation fee from PlatformConfig on-chain
 */
async function fetchCreationFee(suiClient: any, platformConfigId: string, packageId: string): Promise<string> {
  try {
    // Call the view function to get creation fee
    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: (() => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::platform::get_creation_fee`,
          arguments: [tx.object(platformConfigId)],
        });
        return tx;
      })(),
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    // Extract the fee from the result
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue && returnValue[0]) {
        // Parse u64 from bytes
        const bytes = returnValue[0];
        const view = new DataView(new Uint8Array(bytes).buffer);
        return view.getBigUint64(0, true).toString();
      }
    }
    
    // Fallback to default fee if query fails
    return '1000000000'; // 1 SUI
  } catch (error) {
    console.error('Failed to fetch creation fee from chain:', error);
    return '1000000000'; // 1 SUI fallback
  }
}

/**
 * Build a transaction to initialize a pavilion on an existing kiosk
 */
async function buildPavilionTxInternal(config: PavilionTxConfig): Promise<Transaction> {
  const { kioskClient, packageId, pavilionName, ownerAddress, suiClient } = config;

  // Fetch creation fee from chain
  const creationFeeStr = await fetchCreationFee(suiClient, config.platformConfigId, packageId);
  const feeAmount = parseInt(creationFeeStr, 10);

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  // according to mode initialize kiosk
  if (config.mode === 'create' || config.mode === 'auto') {
    kioskTx.create();
  } else {
    kioskTx.setKiosk(tx.object(config.kioskId));
    kioskTx.setKioskCap(tx.object(config.kioskOwnerCapId));
  }

  // common initialize_pavilion call with payment
  const { platformConfigId, platformRecipient } = config;
  
  // Split payment coin for the creation fee
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(feeAmount)]);
  
  tx.moveCall({
    target: `${packageId}::pavilion::initialize_pavilion`,
    arguments: [
      kioskTx.getKiosk(),
      kioskTx.getKioskCap(),
      tx.pure.string(pavilionName),
      tx.object(platformConfigId),
      paymentCoin,
      tx.pure.address(platformRecipient),
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
