import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk'; 
import type { KioskClient } from '@mysten/kiosk';
// import type { KioskOwnerCap } from '@mysten/kiosk';

// export async function getCap(params: { kioskClient: KioskClient; address: string; }): Promise<KioskOwnerCap> {
//   const { kioskClient, address } = params;
//   const { kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address });
//   if (!kioskOwnerCaps || kioskOwnerCaps.length === 0) {
//     throw new Error('No kiosk owner cap found for the provided address');
//   }
//   return kioskOwnerCaps[0];
// }

export async function buildCreatePavilionTx(params: {
  kioskClient: KioskClient;
  packageId: string;
  pavilionName: string;
  ownerAddress: string;
}): Promise<Transaction> {
  const { kioskClient, packageId, pavilionName, ownerAddress } = params;

  const tx = new Transaction();
  const kioskTx = new KioskTransaction({ kioskClient, transaction: tx });

  kioskTx.create();

  tx.moveCall({
    target: `${packageId}::pavilion::initialize_pavilion`,
    arguments: [
      kioskTx.getKiosk(),
      kioskTx.getKioskCap(),
      tx.pure.string(pavilionName),
      tx.pure.address(ownerAddress),
    ],
  })
  
  kioskTx.shareAndTransferCap(ownerAddress);
  kioskTx.finalize();

  return tx;
}
