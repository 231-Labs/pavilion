/**
 * Walrus library exports
 */

// Re-export client functions
export { getWalrusUrl } from './client';

// Re-export upload functions
export {
  uploadToWalrus,
  uploadMultipleToWalrus,
  validateFileForUpload,
} from './upload';
export type {
  WalrusUploadResult,
  WalrusUploadOptions,
} from './upload';

// Note: SDK client functions are not exported by default to prevent
// server-side imports. Import them directly from './sdk-client' when needed:
// import { getWalrusClient, readBlobWithSDK } from '@/lib/walrus/sdk-client';
export type { ReadBlobOptions } from './sdk-client';

