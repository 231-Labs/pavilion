/**
 * Unified 3D scene configuration data structure
 * Used for storing and rebuilding entire 3D scenes on-chain
 */

// 3D vector type
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Configuration for a single 3D object
export interface SceneObject {
  /** Unique ID of the object (usually NFT objectId in Kiosk) */
  id: string;
  
  /** Object name */
  name: string;
  
  /** Object type */
  type: 'kiosk_nft' | 'external_model' | 'sculpture' | 'walrus_blob' | '2d_image';
  
  /** Whether to display in the scene */
  displayed: boolean;
  
  /** Position (world coordinates) */
  position: Vector3;
  
  /** Rotation (radians) */
  rotation: Vector3;
  
  /** Uniform scale factor */
  scale: number;
  
  /** Optional: model resource information */
  resource?: {
    /** Walrus blob ID */
    blobId?: string;
    /** Direct model URL */
    url?: string;
    /** Model format */
    format?: 'glb' | 'gltf' | 'obj' | 'stl' | 'jpg' | 'png' | 'gif' | 'webp';
    /** 2D image display style (only for 2d_image type) */
    imageStyle?: 'flat' | 'framed' | 'canvas' | 'floating';
  };
  
  /** Optional: material configuration */
  material?: {
    color?: number;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  };
  
  /** Last update timestamp */
  updatedAt: number;
}

// Camera configuration
export interface CameraConfig {
  /** Camera position */
  position: Vector3;
  /** Camera target point */
  target: Vector3;
  /** Field of view (degrees) */
  fov: number;
  /** Near clipping plane */
  near: number;
  /** Far clipping plane */
  far: number;
}

// Environment configuration
export interface EnvironmentConfig {
  /** Background color */
  backgroundColor: number;
  /** Ambient light intensity */
  ambientLightIntensity: number;
  /** Directional light intensity */
  directionalLightIntensity: number;
  /** Directional light position */
  directionalLightPosition: Vector3;
  /** Whether to enable shadows */
  enableShadows: boolean;
  /** Whether to show gallery environment */
  showGallery: boolean;
}

// Complete scene configuration
export interface SceneConfig {
  /** Configuration version number */
  version: number;
  
  /** Scene name */
  name?: string;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last update timestamp */
  updatedAt: number;
  
  /** All objects in the scene */
  objects: SceneObject[];
  
  /** Camera configuration */
  camera: CameraConfig;
  
  /** Environment configuration */
  environment: EnvironmentConfig;
  
  /** Optional: scene metadata */
  metadata?: {
    /** Kiosk ID */
    kioskId?: string;
    /** Creator address */
    creator?: string;
    /** Scene description */
    description?: string;
    /** Tags */
    tags?: string[];
  };
}

// Default scene configuration
export const defaultSceneConfig: Omit<SceneConfig, 'objects' | 'createdAt' | 'updatedAt'> = {
  version: 1,
  camera: {
    position: { x: 0, y: 1, z: 20 },
    target: { x: 0, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  },
  environment: {
    backgroundColor: 0x1a1a1a,
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 1.0,
    directionalLightPosition: { x: 5, y: 10, z: 5 },
    enableShadows: true,
    showGallery: true,
  },
};

// Utility function: create default scene object
export function createDefaultSceneObject(
  id: string,
  name: string,
  type: SceneObject['type'] = 'kiosk_nft',
  position: Vector3 = { x: 0, y: 0, z: 0 }
): SceneObject {
  return {
    id,
    name,
    type,
    displayed: false, // Default to false, user needs to manually enable
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    updatedAt: Date.now(),
  };
}

// Utility function: create scene object from Kiosk item
export function createSceneObjectFromKioskItem(
  kioskItem: any,
  index: number = 0
): SceneObject {
  const displayData = kioskItem.data?.display?.data || {};
  const contentFields = kioskItem.data?.content?.fields || {};
  
  // Extract name
  const name = displayData.name || contentFields.name || `NFT ${kioskItem.objectId.slice(-8)}`;
  
  // Extract resource information
  const blobId = displayData.glb_file || displayData.blob_id || displayData.walrus_blob_id ||
                 contentFields.glb_file || contentFields.blob_id || contentFields.walrus_blob_id;
  
  const modelUrl = displayData.glb_url || displayData.model_url || displayData.url ||
                   contentFields.glb_url || contentFields.model_url || contentFields.url;
  
  // Calculate default position (grid layout)
  const itemsPerRow = 5;
  const spacing = 3;
  const row = Math.floor(index / itemsPerRow);
  const col = index % itemsPerRow;
  
  const position: Vector3 = {
    x: (col - (itemsPerRow - 1) / 2) * spacing,
    y: 2,
    z: row * -2,
  };
  
  let type: SceneObject['type'] = 'kiosk_nft';
  let resource: SceneObject['resource'] | undefined;
  
  if (blobId) {
    type = 'walrus_blob';
    resource = {
      blobId,
      format: 'glb',
    };
  } else if (modelUrl) {
    type = 'external_model';
    resource = {
      url: modelUrl,
      format: detectModelFormat(modelUrl),
    };
  }
  
  return {
    id: kioskItem.objectId,
    name,
    type,
    displayed: false, // Default to false, user needs to manually enable
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    resource,
    updatedAt: Date.now(),
  };
}

// Utility function: detect model format
function detectModelFormat(url: string): 'glb' | 'gltf' | 'obj' | 'stl' {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('.glb')) return 'glb';
  if (lowerUrl.includes('.gltf')) return 'gltf';
  if (lowerUrl.includes('.obj')) return 'obj';
  if (lowerUrl.includes('.stl')) return 'stl';
  
  // Default to GLB
  return 'glb';
}

// Compact on-chain storage format (save gas)
export interface CompactSceneConfig {
  v: number;           // version
  o: CompactSceneObject[]; // objects
  t: number;           // updatedAt timestamp
  k?: string;          // kioskId (optional)
}

export interface CompactSceneObject {
  i: string;           // id
  n: string;           // name
  d: 0 | 1;           // displayed (0=false, 1=true)
  p: [number, number, number]; // position [x, y, z]
  r: [number, number, number]; // rotation [x, y, z]
  s: number;           // scale
  b?: string;          // blobId (optional)
  u?: string;          // url (optional)
  f?: string;          // format (optional)
}

// Utility function: compress scene config to on-chain format
export function compressSceneConfig(config: SceneConfig): CompactSceneConfig {
  return {
    v: config.version,
    o: config.objects.map(obj => ({
      i: obj.id,
      n: obj.name,
      d: obj.displayed ? 1 : 0,
      p: [obj.position.x, obj.position.y, obj.position.z],
      r: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      s: obj.scale,
      ...(obj.resource?.blobId && { b: obj.resource.blobId }),
      ...(obj.resource?.url && { u: obj.resource.url }),
      ...(obj.resource?.format && obj.resource.format !== 'glb' && { f: obj.resource.format }),
    })),
    t: config.updatedAt,
    ...(config.metadata?.kioskId && { k: config.metadata.kioskId }),
  };
}

// Utility function: decompress on-chain format to full config
export function decompressSceneConfig(compact: CompactSceneConfig, originalConfig?: SceneConfig): SceneConfig {
  const baseConfig = originalConfig || {
    ...defaultSceneConfig,
    createdAt: compact.t,
  };

  return {
    ...baseConfig,
    version: compact.v,
    updatedAt: compact.t,
    objects: compact.o.map(obj => ({
      id: obj.i,
      name: obj.n,
      type: (obj.b ? 'walrus_blob' : obj.u ? 'external_model' : 'kiosk_nft') as SceneObject['type'],
      displayed: obj.d === 1,
      position: { x: obj.p[0], y: obj.p[1], z: obj.p[2] },
      rotation: { x: obj.r[0], y: obj.r[1], z: obj.r[2] },
      scale: obj.s,
      ...(obj.b || obj.u || obj.f) && {
        resource: {
          ...(obj.b && { blobId: obj.b }),
          ...(obj.u && { url: obj.u }),
          format: (obj.f as 'glb' | 'gltf' | 'obj' | 'stl') || 'glb',
        },
      },
      updatedAt: compact.t,
    })),
    ...(compact.k && {
      metadata: {
        ...baseConfig.metadata,
        kioskId: compact.k,
      },
    }),
  };
}

// Utility function: validate scene config
export function validateSceneConfig(config: any): config is SceneConfig {
  try {
    return (
      typeof config === 'object' &&
      typeof config.version === 'number' &&
      typeof config.createdAt === 'number' &&
      typeof config.updatedAt === 'number' &&
      Array.isArray(config.objects) &&
      typeof config.camera === 'object' &&
      typeof config.environment === 'object'
    );
  } catch {
    return false;
  }
}

// Utility function: validate compact scene config
export function validateCompactSceneConfig(config: any): config is CompactSceneConfig {
  try {
    return (
      typeof config === 'object' &&
      typeof config.v === 'number' &&
      typeof config.t === 'number' &&
      Array.isArray(config.o) &&
      config.o.every((obj: any) => 
        typeof obj.i === 'string' &&
        typeof obj.n === 'string' &&
        (obj.d === 0 || obj.d === 1) &&
        Array.isArray(obj.p) && obj.p.length === 3 &&
        Array.isArray(obj.r) && obj.r.length === 3 &&
        typeof obj.s === 'number'
      )
    );
  } catch {
    return false;
  }
}

// Utility function: create complete scene configuration
export function createSceneConfig(
  objects: SceneObject[],
  metadata?: SceneConfig['metadata']
): SceneConfig {
  const now = Date.now();
  
  return {
    ...defaultSceneConfig,
    objects,
    createdAt: now,
    updatedAt: now,
    metadata,
  };
}
