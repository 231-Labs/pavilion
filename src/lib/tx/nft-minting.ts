/**
 * NFT minting transaction builders
 * Supports both 2D and 3D NFT minting
 */

import { Transaction } from '@mysten/sui/transactions';
import type { SuiClient } from '@mysten/sui/client';

export interface MintNFT2DParams {
  packageId: string;
  module: string;
  mintFunction: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes?: string[];
  recipient: string;
}

export interface MintNFT3DParams {
  packageId: string;
  module: string;
  mintFunction: string;
  name: string;
  description: string;
  imageUrl: string;
  glbBlobId: string;
  recipient: string;
}

export interface ParseMintedNFTParams {
  suiClient: SuiClient;
  digest: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Build a transaction to mint a 2D NFT
 */
export function buildMint2DNFTTx(params: MintNFT2DParams): Transaction {
  const {
    packageId,
    module,
    mintFunction,
    name,
    description,
    imageUrl,
    attributes = [],
    recipient,
  } = params;

  if (!packageId) {
    throw new Error(
      '2D NFT contract Package ID not configured. Please deploy the contract and set NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID'
    );
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::${module}::${mintFunction}`,
    arguments: [
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(imageUrl),
      tx.pure.vector('string', attributes),
      tx.pure.address(recipient),
    ],
  });

  return tx;
}

/**
 * Build a transaction to mint a 3D NFT
 */
export function buildMint3DNFTTx(params: MintNFT3DParams): Transaction {
  const {
    packageId,
    module,
    mintFunction,
    name,
    description,
    imageUrl,
    glbBlobId,
    recipient,
  } = params;

  if (!packageId) {
    throw new Error(
      '3D NFT contract Package ID not configured. Please deploy the contract and set NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID'
    );
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::${module}::${mintFunction}`,
    arguments: [
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(imageUrl),
      tx.pure.string(glbBlobId),
      tx.pure.address(recipient),
    ],
  });

  return tx;
}

/**
 * Parse minted NFT ID from transaction result
 * Retries if transaction is not immediately indexed
 */
export async function parseMintedNFTId(
  params: ParseMintedNFTParams
): Promise<string | null> {
  const { suiClient, digest, maxRetries = 5, retryDelay = 1000 } = params;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const txDetails = await suiClient.getTransactionBlock({
        digest,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
      });

      const changes = txDetails?.objectChanges ?? [];

      // Find the minted NFT
      const nftChange = changes.find(
        (ch: any) =>
          ch.type === 'created' &&
          (ch.objectType?.includes('DemoNFT2D') ||
            ch.objectType?.includes('DemoNFT3D') ||
            ch.objectType?.includes('demo_nft_2d') ||
            ch.objectType?.includes('demo_nft_3d'))
      ) as any;

      if (nftChange?.objectId) {
        return nftChange.objectId as string;
      }

      // If no NFT found, return null (no retry needed)
      return null;
    } catch (error) {
      // If not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        // On last attempt, log error and return null
        console.error('Failed to parse minted NFT ID:', error);
        return null;
      }
    }
  }

  return null;
}

