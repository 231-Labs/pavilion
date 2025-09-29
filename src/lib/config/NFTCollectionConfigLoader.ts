/**
 * NFT Collection Configuration Loader
 */

import { NFTFieldConfig } from '../../types/nft-field-config';

export interface NFTCollectionConfigFile {
  version: string;
  lastUpdated: string;
  collections: NFTFieldConfig[];
  defaultConfig: NFTFieldConfig;
}

export class NFTCollectionConfigLoader {
  private configCache: NFTCollectionConfigFile | null = null;
  private lastLoadTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  /**
   * 
   */
  async loadConfig(forceReload = false): Promise<NFTCollectionConfigFile> {
    const now = Date.now();
    
    if (!forceReload && this.configCache && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      return this.configCache;
    }

    try {
      const response = await fetch('/config/nft-collections.json');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
      }
      
      const config: NFTCollectionConfigFile = await response.json();
      
      this.validateConfig(config);
      
      this.configCache = config;
      this.lastLoadTime = now;
      
      console.log(`✅ Loaded NFT collection config (${config.collections.length} collections)`);
      return config;
      
    } catch (error) {
      console.error('❌ Failed to load NFT collection config:', error);
      
      if (!this.configCache) {
        return this.getEmergencyConfig();
      }
      
      return this.configCache;
    }
  }

  /**
   * according to collection ID to get config
   */
  async getCollectionConfig(collectionId: string): Promise<NFTFieldConfig> {
    const config = await this.loadConfig();
    
    // find matching config
    const collection = config.collections.find(c => 
      c.enabled !== false && (
        c.collectionId === collectionId ||
        collectionId.includes(c.collectionId) ||
        c.collectionId.includes(collectionId)
      )
    );
    
    if (collection) {
      console.log(`🎯 Found config for collection: ${collection.collectionName}`);
      return collection;
    }
    
    console.log(`📋 Using default config for collection: ${collectionId}`);
    return {
      ...config.defaultConfig,
      collectionId: collectionId,
      collectionName: `Unknown Collection (${collectionId.slice(0, 8)}...)`,
    };
  }

  /**
   * get all enabled configs
   */
  async getAllConfigs(): Promise<NFTFieldConfig[]> {
    const config = await this.loadConfig();
    return config.collections.filter(c => c.enabled !== false);
  }

  /**
   * reload config
   */
  async reloadConfig(): Promise<NFTCollectionConfigFile> {
    return this.loadConfig(true);
  }

  /**
   * validate config format
   */
  private validateConfig(config: any): void {
    if (!config.version || !config.collections || !Array.isArray(config.collections)) {
      throw new Error('Invalid config format: missing version or collections');
    }

    if (!config.defaultConfig) {
      throw new Error('Invalid config format: missing defaultConfig');
    }

    // validate each config item
    for (const collection of config.collections) {
      if (!collection.collectionId || !collection.collectionName) {
        throw new Error(`Invalid collection config: missing collectionId or collectionName`);
      }
      
      if (!collection.modelFields || !collection.imageFields) {
        throw new Error(`Invalid collection config for ${collection.collectionId}: missing modelFields or imageFields`);
      }
    }
  }

  /**
   * basic config in emergency situation
   */
  private getEmergencyConfig(): NFTCollectionConfigFile {
    return {
      version: '1.0.0-emergency',
      lastUpdated: new Date().toISOString(),
      collections: [
        {
          collectionId: 'demo_nft',
          collectionName: 'Demo NFT Collection',
          modelFields: {
            blobIdFields: ['glb_file', 'walrus_blob_id', 'blob_id'],
            urlFields: ['glb_url', 'model_url'],
          },
          imageFields: {
            blobIdFields: ['image_blob_id', 'img_blob'],
            urlFields: ['image_url', 'image', 'img'],
          },
          resourcePriority: ['3d-model', '2d-image'],
        }
      ],
      defaultConfig: {
        collectionId: 'default',
        collectionName: 'Unknown Collection',
        modelFields: {
          blobIdFields: ['glb_file', 'blob_id', 'walrus_blob_id'],
          urlFields: ['glb_url', 'model_url', 'url'],
        },
        imageFields: {
          blobIdFields: ['image_blob_id', 'img_blob_id'],
          urlFields: ['image_url', 'image', 'img'],
        },
        resourcePriority: ['3d-model', '2d-image'],
      },
    };
  }

  /**
   * clear cache
   */
  clearCache(): void {
    this.configCache = null;
    this.lastLoadTime = 0;
  }
}
