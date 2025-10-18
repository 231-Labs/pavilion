const DEFAULT_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export function getWalrusUrl(blobId: string, aggregator?: string): string {
  const aggregatorBase = aggregator || DEFAULT_AGGREGATOR;
  // Remove 0x prefix if present, as Walrus aggregator doesn't accept it
  const cleanBlobId = blobId.startsWith('0x') ? blobId.slice(2) : blobId;
  return `${aggregatorBase.replace(/\/$/, '')}/v1/blobs/${encodeURIComponent(cleanBlobId)}`;
}

export async function fetchModels(): Promise<{ files: Array<{ name: string; url: string }> }> {
  try {
    const response = await fetch('/config/models.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load models:', error);
    return { files: [] };
  }
}
