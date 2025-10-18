/**
 * NFT Field Configuration System
 * Allows flexible configuration of field names for different NFT collections
 */

export interface NFTFieldConfig {
  /** Collection identifier (can be package ID, creator address, or custom identifier) */
  collectionId: string;
  
  /** Human readable collection name */
  collectionName: string;
  
  /** Optional: collection description */
  description?: string;
  
  /** Field names for 3D model resources */
  modelFields: {
    /** Fields to check for 3D model blob IDs */
    blobIdFields: string[];
    /** Fields to check for 3D model URLs */
    urlFields: string[];
  };
  
  /** Field names for 2D image resources */
  imageFields: {
    /** Fields to check for 2D image blob IDs */
    blobIdFields: string[];
    /** Fields to check for 2D image URLs */
    urlFields: string[];
  };
  
  /** Priority order: which resource type to prefer if multiple are available */
  resourcePriority: ('3d-model' | '2d-image')[];
  
  /** Whether this configuration is enabled (default: true) */
  enabled?: boolean;
  
  /** Optional: custom field extraction logic */
  customExtractor?: (displayData: any, contentFields: any) => {
    type: '3d-model' | '2d-image';
    blobId?: string;
    url?: string;
  } | null;
}

/** Default field configuration for unknown collections */
export const DEFAULT_NFT_FIELD_CONFIG: NFTFieldConfig = {
  collectionId: 'default',
  collectionName: 'Default Collection',
  modelFields: {
    blobIdFields: ['glb_file', 'blob_id', 'walrus_blob_id', 'model_blob_id'],
    urlFields: ['glb_url', 'model_url', 'url'],
  },
  imageFields: {
    blobIdFields: ['image_blob_id', 'img_blob_id', 'picture_blob_id'],
    urlFields: ['image_url', 'image', 'img', 'picture', 'photo'],
  },
  resourcePriority: ['3d-model', '2d-image'],
};

/** Pre-configured field mappings for known NFT collections */
export const KNOWN_COLLECTION_CONFIGS: NFTFieldConfig[] = [
  {
    collectionId: 'demo_nft',
    collectionName: 'Demo NFT Collection',
    modelFields: {
      blobIdFields: ['glb_file', 'walrus_blob_id'],
      urlFields: ['glb_url'],
    },
    imageFields: {
      blobIdFields: ['image_blob_id'],
      urlFields: ['image_url'],
    },
    resourcePriority: ['3d-model', '2d-image'],
  },
  // Add more collection configurations as needed
];

/** Resource extraction result */
export interface NFTResourceInfo {
  type: '3d-model' | '2d-image';
  blobId?: string;
  url?: string;
  fieldName: string; // Which field was used to extract the resource
  collectionConfig: NFTFieldConfig;
}

/**
 * NFT Field Configuration Manager
 */
export class NFTFieldConfigManager {
  private configs: Map<string, NFTFieldConfig> = new Map();
  
  constructor() {
    // Load known configurations
    KNOWN_COLLECTION_CONFIGS.forEach(config => {
      this.configs.set(config.collectionId, config);
    });
  }
  
  /**
   * Add or update a collection configuration
   */
  addConfig(config: NFTFieldConfig): void {
    this.configs.set(config.collectionId, config);
  }
  
  /**
   * Get configuration for a collection
   */
  getConfig(collectionId: string): NFTFieldConfig {
    return this.configs.get(collectionId) || DEFAULT_NFT_FIELD_CONFIG;
  }
  
  /**
   * Extract resource information from NFT item using appropriate configuration
   */
  extractResourceInfo(
    item: any,
    collectionId?: string
  ): NFTResourceInfo | null {
    const displayData = item.data?.display?.data || {};
    const contentFields = item.data?.content?.fields || {};
    
    // Determine collection ID if not provided
    const resolvedCollectionId = collectionId || this.detectCollectionId(item);
    const config = this.getConfig(resolvedCollectionId);
    
    console.log(`🔍 [NFT Config] Extracting resource for collection: ${config.collectionName} (ID: ${resolvedCollectionId})`);
    console.log(`🔍 [NFT Config] Available display fields:`, Object.keys(displayData));
    console.log(`🔍 [NFT Config] Available content fields:`, Object.keys(contentFields));
    
    // Try custom extractor first
    if (config.customExtractor) {
      const result = config.customExtractor(displayData, contentFields);
      if (result) {
        return {
          ...result,
          fieldName: 'custom',
          collectionConfig: config,
        };
      }
    }
    
    // Try each resource type based on priority
    for (const resourceType of config.resourcePriority) {
      const result = this.extractResourceByType(
        displayData,
        contentFields,
        resourceType,
        config
      );
      if (result) {
        return {
          ...result,
          collectionConfig: config,
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract resource by specific type
   */
  private extractResourceByType(
    displayData: any,
    contentFields: any,
    resourceType: '3d-model' | '2d-image',
    config: NFTFieldConfig
  ): Omit<NFTResourceInfo, 'collectionConfig'> | null {
    const fields = resourceType === '3d-model' ? config.modelFields : config.imageFields;
    
    // Check blob ID fields first
    for (const fieldName of fields.blobIdFields) {
      const blobId = displayData[fieldName] || contentFields[fieldName];
      if (blobId && this.isValidValue(blobId)) {
        console.log(`🔍 [NFT Config] Found ${resourceType} blob ID in field '${fieldName}':`, blobId?.slice(0, 20));
        return {
          type: resourceType,
          blobId,
          fieldName,
        };
      }
    }
    
    // Check URL fields
    for (const fieldName of fields.urlFields) {
      const url = displayData[fieldName] || contentFields[fieldName];
      if (url && this.isValidValue(url)) {
        console.log(`🔍 [NFT Config] Found ${resourceType} URL in field '${fieldName}':`, url?.slice(0, 50));
        return {
          type: resourceType,
          url,
          fieldName,
        };
      }
    }
    
    return null;
  }
  
  /**
   * Detect collection ID from NFT item
   */
  private detectCollectionId(item: any): string {
    // Try to extract from type field (correct location: item.type)
    if (item.type && typeof item.type === 'string' && item.type.includes('::')) {
      const parts = item.type.split('::');
      const moduleName = parts[1]; // e.g., "demo_nft_3d"
      if (moduleName) {
        return moduleName;
      }
      // Fallback to package ID
      const packageId = parts[0];
      if (packageId) {
        return packageId;
      }
    }
    
    // Also check item.data?.type as fallback
    if (item.data?.type && typeof item.data.type === 'string' && item.data.type.includes('::')) {
      const parts = item.data.type.split('::');
      const moduleName = parts[1];
      if (moduleName) {
        return moduleName;
      }
      const packageId = parts[0];
      if (packageId) {
        return packageId;
      }
    }
    
    // Could also check creator address or other metadata
    return 'default';
  }
  
  /**
   * Check if a value is valid (not null, undefined, empty, or "None")
   */
  private isValidValue(value: any): boolean {
    return value !== null && 
           value !== undefined && 
           value !== '' && 
           value !== 'None';
  }
  
  /**
   * Get all configured collections
   */
  getAllConfigs(): NFTFieldConfig[] {
    return Array.from(this.configs.values());
  }
}
