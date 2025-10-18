const DEFAULT_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

export function getWalrusUrl(blobId: string, aggregator?: string): string {
  const aggregatorBase = aggregator || DEFAULT_AGGREGATOR;
  // Remove 0x prefix if present, as Walrus aggregator doesn't accept it
  const cleanBlobId = blobId.startsWith('0x') ? blobId.slice(2) : blobId;
  return `${aggregatorBase.replace(/\/$/, '')}/v1/blobs/${encodeURIComponent(cleanBlobId)}`;
}

/**
 * Get Walrus URL with automatic fallback to SDK for large files
 * This function will:
 * 1. Try aggregator first (fast, but 4MB limit)
 * 2. If aggregator returns 403, fallback to SDK (slower, but no size limit)
 */
export async function getWalrusUrlSmart(blobId: string, options?: {
  preferSDK?: boolean;
  estimatedSize?: number;
}): Promise<string> {
  const cleanBlobId = blobId.startsWith('0x') ? blobId.slice(2) : blobId;
  
  // Try aggregator first for small files
  const aggregatorUrl = getWalrusUrl(cleanBlobId);
  
  try {
    const response = await fetch(aggregatorUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return aggregatorUrl;
    }
    
    // If 403, likely size exceeded - use SDK
    if (response.status === 403) {
      console.log(`⚠️ [Walrus] Blob exceeds aggregator limit, will use SDK when loading`);
      // Return a special marker that indicates SDK should be used
      return `walrus-sdk://${cleanBlobId}`;
    }
  } catch (error) {
    console.warn(`[Walrus] Aggregator check failed:`, error);
  }
  
  // Fallback to aggregator URL (let the loader handle the error)
  return aggregatorUrl;
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
