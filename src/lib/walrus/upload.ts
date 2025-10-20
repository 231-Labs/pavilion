/**
 * Walrus upload utilities for storing files
 */

import { WALRUS_CONFIG } from '../../config/nft-contracts';

export interface WalrusUploadResult {
  blobId: string;
  url: string;
}

export interface WalrusUploadOptions {
  epochs?: number;
  onProgress?: (message: string) => void;
}

/**
 * Upload a file to Walrus storage
 * @param file - File to upload
 * @param options - Upload options (epochs, progress callback)
 * @returns Promise<WalrusUploadResult> - Blob ID and URL
 */
export async function uploadToWalrus(
  file: File,
  options: WalrusUploadOptions = {}
): Promise<WalrusUploadResult> {
  const { epochs = 10, onProgress } = options;

  onProgress?.(`Uploading ${file.name} to Walrus...`);

  const response = await fetch(
    `${WALRUS_CONFIG.PUBLISHER_URL}/v1/blobs?epochs=${epochs}`,
    {
      method: 'PUT',
      body: file,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Walrus upload failed: ${response.statusText} - ${errorText}`
    );
  }

  const result = await response.json();

  // Handle Walrus response format
  let blobId: string;
  if (result.newlyCreated?.blobObject?.blobId) {
    blobId = result.newlyCreated.blobObject.blobId;
  } else if (result.alreadyCertified?.blobId) {
    blobId = result.alreadyCertified.blobId;
  } else {
    throw new Error('Failed to get blob ID from Walrus response');
  }

  const url = `${WALRUS_CONFIG.AGGREGATOR_URL}/v1/blobs/${blobId}`;
  
  onProgress?.(`Upload complete: ${blobId}`);

  return { blobId, url };
}

/**
 * Upload multiple files to Walrus in sequence
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Promise<WalrusUploadResult[]> - Array of blob IDs and URLs
 */
export async function uploadMultipleToWalrus(
  files: File[],
  options: WalrusUploadOptions = {}
): Promise<WalrusUploadResult[]> {
  const results: WalrusUploadResult[] = [];

  for (const file of files) {
    const result = await uploadToWalrus(file, options);
    results.push(result);
  }

  return results;
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/png', 'image/jpeg'])
 * @param maxSizeMB - Maximum file size in MB
 * @throws Error if validation fails
 */
export function validateFileForUpload(
  file: File,
  allowedTypes?: string[],
  maxSizeMB?: number
): void {
  if (allowedTypes && !allowedTypes.some(type => file.type.startsWith(type))) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  if (maxSizeMB) {
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
  }
}

