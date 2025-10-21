const DEFAULT_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export function getWalrusUrl(blobId: string, aggregator?: string): string {
  const aggregatorBase = aggregator || DEFAULT_AGGREGATOR;
  // Remove 0x prefix if present, as Walrus aggregator doesn't accept it
  const cleanBlobId = blobId.startsWith('0x') ? blobId.slice(2) : blobId;
  return `${aggregatorBase.replace(/\/$/, '')}/v1/blobs/${encodeURIComponent(cleanBlobId)}`;
}

