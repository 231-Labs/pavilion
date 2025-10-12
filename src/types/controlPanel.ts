export type ControllableObjectType = 'sculpture' | 'external' | 'kiosk_nft';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface ControllableObject {
  id: string;
  name: string;
  type: ControllableObjectType;
  position: Vector3Like;
  rotation?: Vector3Like;
  scale?: Vector3Like;
  // Using unknown to avoid tight coupling with THREE types in shared types
  object?: unknown;
}

export interface KioskNftItem {
  id: string;
  name: string;
  blobId: string;
  displayData?: Record<string, unknown>;
  contentFields?: Record<string, unknown>;
  fullItem?: unknown;
  isListed?: boolean;
  listPrice?: string; // Price in MIST
  itemType?: string; // Full type string for transactions
}

export type KioskNftTransformsMap = Map<string, {
  position: Vector3Like;
  rotation: Vector3Like;
  scale: Vector3Like;
}>;


