import { Transaction } from '@mysten/sui/transactions';
import { KioskTransaction } from '@mysten/kiosk'; 
import type { KioskClient } from '@mysten/kiosk';

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
  kioskTx.shareAndTransferCap(ownerAddress);
  kioskTx.finalize();

  return tx;
}
