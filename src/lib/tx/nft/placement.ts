/**
 * NFT placement transaction builders
 * Handles placing NFTs into kiosks
 */

import { Transaction } from '@mysten/sui/transactions';

export interface PlaceNFTInKioskParams {
  kioskId: string;
  kioskOwnerCapId: string;
  nftId: string;
  nftType: string;
}

/**
 * Build a transaction to place an NFT in a kiosk
 * Uses the standard kiosk::place function from Sui framework
 */
export function buildPlaceNFTInKioskTx(
  params: PlaceNFTInKioskParams
): Transaction {
  const { kioskId, kioskOwnerCapId, nftId, nftType } = params;

  if (!kioskId) {
    throw new Error('Kiosk ID is required');
  }
  if (!kioskOwnerCapId) {
    throw new Error('Kiosk Owner Cap ID is required');
  }
  if (!nftId) {
    throw new Error('NFT ID is required');
  }
  if (!nftType) {
    throw new Error('NFT type is required');
  }

  const tx = new Transaction();

  // Call kiosk::place to add NFT to kiosk
  tx.moveCall({
    target: '0x2::kiosk::place',
    arguments: [
      tx.object(kioskId),
      tx.object(kioskOwnerCapId),
      tx.object(nftId),
    ],
    typeArguments: [nftType],
  });

  return tx;
}

/**
 * Build NFT type string from contract config
 */
export function buildNFTType(
  packageId: string,
  module: string,
  typeName: string
): string {
  return `${packageId}::${module}::${typeName}`;
}

