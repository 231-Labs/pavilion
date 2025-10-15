import { NFTFieldConfigManager, NFTResourceInfo } from '../../types/nft-field-config';
import { SceneObject, createDefaultSceneObject } from '../../types/scene';
import { Image3DRenderer, Image3DOptions } from '../scene/Image3DRenderer';
import { NFTCollectionConfigLoader } from './NFTCollectionConfigLoader';
import * as THREE from 'three';

/**
 * NFT Processor
 * Handles both 2D and 3D NFT processing with configurable field extraction
 */

export interface ProcessedNFTItem {
  id: string;
  name: string;
  resourceInfo: NFTResourceInfo;
  sceneObject: SceneObject;
  threejsObject?: THREE.Group;
}

export class NFTProcessor {
  private fieldConfigManager: NFTFieldConfigManager;
  private configLoader: NFTCollectionConfigLoader;
  private image3DRenderer?: Image3DRenderer;
  
  constructor(scene?: THREE.Scene) {
    this.fieldConfigManager = new NFTFieldConfigManager();
    this.configLoader = new NFTCollectionConfigLoader();
    if (scene) {
      this.image3DRenderer = new Image3DRenderer(scene);
    }
  }
  
  /**
   * Process multiple NFT items
   */
  async processNFTItems(
    items: any[],
    collectionId?: string
  ): Promise<ProcessedNFTItem[]> {
    const results: ProcessedNFTItem[] = [];
    
    // preload all needed configs
    await this.preloadConfigurations(items);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const processed = await this.processSingleNFT(item, i, collectionId);
      if (processed) {
        results.push(processed);
      }
    }
    
    return results;
  }

  /**
   * preload configs to improve performance
   */
  private async preloadConfigurations(items: any[]): Promise<void> {
    const collectionIds = new Set<string>();
    
    for (const item of items) {
      const collectionId = this.detectCollectionId(item);
      collectionIds.add(collectionId);
    }
    
    // load configs for each detected collection
    for (const collectionId of collectionIds) {
      try {
        const config = await this.configLoader.getCollectionConfig(collectionId);
        this.fieldConfigManager.addConfig(config);
      } catch (error) {
        console.warn(`Failed to load config for collection ${collectionId}:`, error);
      }
    }
  }
  
  /**
   * Process a single NFT item
   */
  async processSingleNFT(
    item: any,
    index: number = 0,
    collectionId?: string
  ): Promise<ProcessedNFTItem | null> {
    // Extract resource information using field configuration
    const resourceInfo = this.fieldConfigManager.extractResourceInfo(item, collectionId);
    
    if (!resourceInfo) {
      console.log(`No valid resource found for NFT ${item.objectId}`);
      return null;
    }
    
    // Create scene object based on resource type
    const sceneObject = this.createSceneObjectFromResource(item, resourceInfo, index);
    
    // Don't create Three.js object here - create on demand when user clicks show
    // This prevents automatic display of images
    let threejsObject: THREE.Group | undefined;
    
    return {
      id: item.objectId,
      name: sceneObject.name,
      resourceInfo,
      sceneObject,
      threejsObject,
    };
  }
  
  /**
   * Create scene object from resource information
   */
  private createSceneObjectFromResource(
    item: any,
    resourceInfo: NFTResourceInfo,
    index: number
  ): SceneObject {
    const displayData = item.data?.display?.data || {};
    const contentFields = item.data?.content?.fields || {};
    
    // Extract name - 優先從 display data 取得，這是鏈上的標準 NFT 名稱欄位
    const name = this.extractNFTName(displayData, contentFields, item.objectId);
    
    // Determine object type and format
    let objectType: SceneObject['type'];
    let format: string;
    
    if (resourceInfo.type === '2d-image') {
      objectType = '2d_image';
      format = this.detectImageFormat(resourceInfo.blobId || resourceInfo.url!);
    } else {
      // 3D model
      if (resourceInfo.blobId) {
        objectType = 'walrus_blob';
        format = 'glb'; // Assume GLB for Walrus blobs
      } else {
        objectType = 'external_model';
        format = this.detectModelFormat(resourceInfo.url!);
      }
    }
    
    // Calculate position (grid layout)
    const itemsPerRow = 5;
    const spacing = 3;
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    
    const position = {
      x: (col - (itemsPerRow - 1) / 2) * spacing,
      y: resourceInfo.type === '2d-image' ? 1.5 : 2, // Lower height for 2D images
      z: row * -2,
    };
    
    // Create scene object
    const sceneObject = createDefaultSceneObject(item.objectId, name, objectType, position);
    
    // Set resource information
    sceneObject.resource = {
      blobId: resourceInfo.blobId,
      url: resourceInfo.url,
      format: format as any,
      imageStyle: resourceInfo.type === '2d-image' ? 'framed' : undefined,
    };
    
    return sceneObject;
  }
  
  /**
   * Get image 3D options from scene object
   */
  private getImageOptionsFromSceneObject(sceneObject: SceneObject): Image3DOptions {
    const imageStyle = sceneObject.resource?.imageStyle || 'framed';
    
    const options: Image3DOptions = {
      style: imageStyle,
      width: 2 * sceneObject.scale,
      thickness: 0.05,
    };
    
    // Customize based on style
    switch (imageStyle) {
      case 'framed':
        options.frame = {
          width: 0.1,
          height: 0.1,
          depth: 0.08,
          color: 0x8B4513,
          material: 'wood',
        };
        break;
      case 'canvas':
        options.canvas = {
          frameWidth: 0.05,
          frameColor: 0x2F1B14,
          canvasColor: 0xF5F5DC,
        };
        break;
      case 'floating':
        options.floating = {
          glowColor: 0x00FFFF,
          glowIntensity: 0.3,
          shadowOpacity: 0.2,
        };
        break;
    }
    
    return options;
  }
  
  /**
   * Detect image format from URL or blob ID
   */
  private detectImageFormat(source: string): string {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('.jpg') || lowerSource.includes('jpeg')) return 'jpg';
    if (lowerSource.includes('.png')) return 'png';
    if (lowerSource.includes('.gif')) return 'gif';
    if (lowerSource.includes('.webp')) return 'webp';
    return 'jpg'; // Default assumption
  }
  
  /**
   * Detect 3D model format from URL
   */
  private detectModelFormat(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.glb')) return 'glb';
    if (lowerUrl.includes('.gltf')) return 'gltf';
    if (lowerUrl.includes('.obj')) return 'obj';
    if (lowerUrl.includes('.stl')) return 'stl';
    return 'glb'; // Default assumption
  }
  
  /**
   * Filter items by resource type
   */
  filterItemsByType(
    items: ProcessedNFTItem[],
    type: '2d-image' | '3d-model'
  ): ProcessedNFTItem[] {
    return items.filter(item => item.resourceInfo.type === type);
  }
  
  /**
   * Get field configuration manager for external configuration
   */
  getFieldConfigManager(): NFTFieldConfigManager {
    return this.fieldConfigManager;
  }
  
  /**
   * Update collection configuration
   */
  updateCollectionConfig(collectionId: string, config: any): void {
    this.fieldConfigManager.addConfig({
      collectionId,
      ...config,
    });
  }

  /**
   * extract NFT name - get from chain dynamically
   */
  private extractNFTName(displayData: any, contentFields: any, objectId: string): string {
    // priority: display.data.name -> content.fields.name -> default name based on objectId
    
    // 1. get name from display data (this is the standard display name for NFT)
    if (displayData?.name && typeof displayData.name === 'string' && displayData.name.trim()) {
      return displayData.name.trim();
    }
    
    if (contentFields?.name && typeof contentFields.name === 'string' && contentFields.name.trim()) {
      return contentFields.name.trim();
    }
    
    const possibleNameFields = ['title', 'label', 'description'];
    for (const field of possibleNameFields) {
      const displayValue = displayData?.[field];
      const contentValue = contentFields?.[field];
      
      if (displayValue && typeof displayValue === 'string' && displayValue.trim()) {
        return displayValue.trim();
      }
      
      if (contentValue && typeof contentValue === 'string' && contentValue.trim()) {
        return contentValue.trim();
      }
    }
    
    // 4. default name
    return `NFT ${objectId.slice(-8)}`;
  }

  /**
   * detect NFT collection ID
   */
  private detectCollectionId(item: any): string {
    // 1. get package ID from type field
    if (item.data?.type) {
      const typeStr = item.data.type;
      if (typeof typeStr === 'string' && typeStr.includes('::')) {
        const packageId = typeStr.split('::')[0];
        if (packageId && packageId.startsWith('0x')) {
          return packageId;
        }
      }
    }
    
    // 2. get from other possible fields
    const displayData = item.data?.display?.data || {};
    const contentFields = item.data?.content?.fields || {};
    
    // check if there is a clear collection_id or package_id
    if (displayData.collection_id || contentFields.collection_id) {
      return displayData.collection_id || contentFields.collection_id;
    }
    
    if (displayData.package_id || contentFields.package_id) {
      return displayData.package_id || contentFields.package_id;
    }
    
    // 3. default value
    return 'default';
  }

  /**
   * reload configurations
   */
  async reloadConfigurations(): Promise<void> {
    await this.configLoader.reloadConfig();
    console.log('🔄 NFT collection configurations reloaded');
  }

  /**
   * get config loader (for external access)
   */
  getConfigLoader(): NFTCollectionConfigLoader {
    return this.configLoader;
  }
}
