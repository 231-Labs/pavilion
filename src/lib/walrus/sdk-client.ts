/**
 * Walrus SDK Client for reading blobs directly from storage nodes
 * Bypasses aggregator 4MB size limit
 * ⚠️ This module can only be used in the browser (client-side only)
 */

import { SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';

let walrusClient: ReturnType<typeof createWalrusClient> | null = null;

/**
 * Create Walrus SDK client
 * Only works in browser environment
 */
function createWalrusClient() {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('Walrus SDK can only be used in browser environment');
  }

  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet';
  const rpcUrl = network === 'mainnet' 
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443';
  
  // For Next.js, we use CDN to load WASM instead of bundling it
  // This avoids build issues with Next.js webpack configuration
  const wasmUrl = 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm';
  
  const client = new SuiClient({
    url: rpcUrl,
  }).$extend(
    walrus({
      network: network, // Required: must specify network for Walrus
      // Load wasm from CDN for Next.js compatibility
      wasmUrl: wasmUrl,
      // Configure storage node client
      storageNodeClientOptions: {
        timeout: 120_000, // 2 minutes timeout for large files
        // Custom fetch to handle SSL issues in development (browser only)
        fetch: window.fetch.bind(window),
        onError: (error) => {
          // Only warn about expected SSL errors
          const errorStr = error?.toString() || '';
          if (!errorStr.includes('ERR_CERT_DATE_INVALID')) {
            console.warn('[Walrus SDK] Storage node error:', error);
          }
        },
      },
    })
  );

  return client;
}

/**
 * Get or create Walrus client singleton
 * Only works in browser environment
 */
export function getWalrusClient() {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('Walrus SDK can only be used in browser environment');
  }

  if (!walrusClient) {
    walrusClient = createWalrusClient();
  }
  return walrusClient;
}

export interface ReadBlobOptions {
  onProgress?: (progress: number, stage: string) => void;
}

/**
 * Read blob using Walrus SDK (no size limit, but slower)
 * Use this for blobs that exceed aggregator limits (>4MB)
 * 
 * @param blobId - The blob ID to read
 * @param options - Optional progress callback
 */
export async function readBlobWithSDK(blobId: string, options?: ReadBlobOptions): Promise<Uint8Array> {
  const client = getWalrusClient();
  
  try {
    console.log(`📦 [Walrus SDK] Reading blob ${blobId.slice(0, 20)}... (may take a moment for large files)`);
    const startTime = Date.now();
    
    // Notify start
    options?.onProgress?.(10, 'Connecting to storage nodes...');
    
    // Allow UI to update by yielding to the event loop
    await new Promise(resolve => setTimeout(resolve, 0));
    
    options?.onProgress?.(30, 'Downloading data from storage nodes...');
    
    const blob = await client.walrus.readBlob({ blobId });
    
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
    
    options?.onProgress?.(80, 'Processing downloaded data...');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [Walrus SDK] Successfully read blob in ${duration}s, size: ${blob.length} bytes`);
    
    options?.onProgress?.(100, 'Download complete!');
    
    return blob;
  } catch (error) {
    console.error(`❌ [Walrus SDK] Failed to read blob:`, error);
    throw error;
  }
}

/**
 * Read blob as a Blob object (for use with Three.js loaders)
 */
export async function readBlobAsBlob(blobId: string, mimeType: string = 'model/gltf-binary', options?: ReadBlobOptions): Promise<Blob> {
  const data = await readBlobWithSDK(blobId, options);
  return new Blob([new Uint8Array(data)], { type: mimeType });
}

/**
 * Read blob and create an object URL (for direct use in Three.js)
 */
export async function readBlobAsObjectURL(blobId: string, mimeType: string = 'model/gltf-binary', options?: ReadBlobOptions): Promise<string> {
  const blob = await readBlobAsBlob(blobId, mimeType, options);
  return URL.createObjectURL(blob);
}

/**
 * Check if a blob should use SDK (for large files) or aggregator (for small files)
 * This is a heuristic - you might want to adjust based on your needs
 */
export function shouldUseSDK(estimatedSize?: number): boolean {
  // Use SDK for files larger than 3.5MB (留一些緩衝空間)
  const SIZE_THRESHOLD = 3.5 * 1024 * 1024;
  
  if (estimatedSize && estimatedSize > SIZE_THRESHOLD) {
    return true;
  }
  
  // Default to aggregator (faster for small files)
  return false;
}

/**
 * Smart blob reader that automatically chooses between SDK and aggregator
 */
export async function readBlobSmart(
  blobId: string,
  options?: {
    preferSDK?: boolean;
    estimatedSize?: number;
    fallbackToSDK?: boolean;
  }
): Promise<string> {
  const { preferSDK = false, estimatedSize, fallbackToSDK = true } = options || {};
  
  // Decide which method to use
  const useSDK = preferSDK || shouldUseSDK(estimatedSize);
  
  if (useSDK) {
    // Use SDK for large files
    return await readBlobAsObjectURL(blobId);
  }
  
  // Try aggregator first (faster for small files)
  try {
    const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
    const response = await fetch(aggregatorUrl);
    
    if (response.ok) {
      return aggregatorUrl;
    }
    
    // If 403 (size exceeded) and fallback is enabled, try SDK
    if (response.status === 403 && fallbackToSDK) {
      console.log(`⚠️ Aggregator returned 403 (likely size limit), falling back to SDK`);
      return await readBlobAsObjectURL(blobId);
    }
    
    throw new Error(`Aggregator returned ${response.status}`);
  } catch (error) {
    if (fallbackToSDK) {
      console.log(`⚠️ Aggregator failed, falling back to SDK:`, error);
      return await readBlobAsObjectURL(blobId);
    }
    throw error;
  }
}

