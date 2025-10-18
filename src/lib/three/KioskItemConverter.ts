import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Kiosk item interface (matches Sui Kiosk SDK return format)
export interface KioskItem {
  objectId: string;
  type: string;
  data?: {
    display?: {
      data?: any;
    };
    content?: {
      fields?: any;
    };
  };
}

// 3D display object configuration
export interface KioskItem3DConfig {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  type: 'glb' | 'obj' | 'stl' | 'image' | 'geometry' | 'text' | 'walrus';
  url?: string; // For 3D models or images
  geometryType?: 'box' | 'sphere' | 'cylinder' | 'torus' | 'cone' | 'octahedron'; // For geometry
  text?: string; // For text display
  color?: number;
  modelFormat?: 'glb' | 'obj' | 'stl'; // Specify model format when type is model
}

// Conversion result
export interface KioskItem3DResult {
  config: KioskItem3DConfig;
  object3D: THREE.Object3D | null; // null if not loaded yet (for lazy loading)
  kioskItem: KioskItem;
  blobId?: string; // Walrus blob ID if available
  modelUrl?: string; // Direct model URL if available
  needsWalrusLoad?: boolean; // Whether this item needs to be loaded via Walrus
}

// Simplified result for kiosk analysis
export interface KioskItemAnalysis {
  kioskItem: KioskItem;
  blobId?: string;
  modelUrl?: string;
  type: 'walrus' | 'direct' | 'image' | 'geometry';
  name: string;
}

export class KioskItemConverter {
  private sceneManager: SceneManager;
  private loadedItems: Map<string, KioskItem3DResult> = new Map();

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  /**
   * Analyze kiosk items and extract blob IDs/models without loading
   */
  analyzeKioskItems(kioskItems: KioskItem[]): KioskItemAnalysis[] {

    return kioskItems.map((item, index) => {

      // Handle both nested Sui structure and flat structure
      let displayData = item.data?.display?.data;
      let contentFields = item.data?.content?.fields;

        // Check if data is flat structure
        if (!displayData && !contentFields && item.data && typeof item.data === 'object') {
          // Check if it's a flat object with properties
          const keys = Object.keys(item.data);
          if (keys.length > 0) {
            displayData = item.data;
            contentFields = item.data;
          }
        }

        // Additional check: if item.data itself has the fields we need
        if (!displayData && !contentFields && item.data) {
          displayData = item.data;
          contentFields = item.data;
        }

        const name = this.extractItemName(item, displayData) || `Item ${index + 1}`;


      // Try to extract Walrus blob ID FIRST (since this is likely what we want)
      const blobId = this.extractWalrusBlobId(displayData, contentFields);
      if (blobId) {
        return {
          kioskItem: item,
          blobId,
          type: 'walrus' as const,
          name,
        };
      }

      // Try to extract model URL
      const modelUrl = this.extractModelUrl(displayData, contentFields);
      if (modelUrl) {
        return {
          kioskItem: item,
          modelUrl,
          type: 'direct' as const,
          name,
        };
      }

      // Try to extract image URL
      const imageUrl = this.extractImageUrl(displayData, contentFields);
      if (imageUrl) {
        return {
          kioskItem: item,
          modelUrl: imageUrl,
          type: 'image' as const,
          name,
        };
      }

      return {
        kioskItem: item,
        type: 'geometry' as const,
        name,
      };
    });
  }

  /**
   * Convert kiosk items to 3D objects
   */
  async convertKioskItemsTo3D(kioskItems: KioskItem[]): Promise<KioskItem3DResult[]> {
    const results: KioskItem3DResult[] = [];

    for (let i = 0; i < kioskItems.length; i++) {
      const item = kioskItems[i];

      try {
        const result = await this.convertSingleItemTo3D(item, i);
        if (result) {
          results.push(result);
          this.loadedItems.set(item.objectId, result);
        } else {
          // Item not found or not suitable for 3D conversion
        }
      } catch (error) {
        console.error(`❌ Failed to convert kiosk item ${item.objectId}:`, error);
        console.error(`   Error details:`, error);
      }
    }

    return results;
  }

  /**
   * Convert single kiosk item to 3D object
   */
  private async convertSingleItemTo3D(item: KioskItem, index: number): Promise<KioskItem3DResult | null> {
    const config = this.create3DConfigFromKioskItem(item, index);

    if (!config) {
      return null;
    }

    let object3D: THREE.Object3D | null;

    try {
      switch (config.type) {
        case 'glb':
          if (config.url) {
            object3D = await this.sceneManager.loadGLBModel(config.url, {
              position: config.position,
              rotation: config.rotation,
              scale: config.scale,
              name: config.name,
              castShadow: true,
              receiveShadow: true,
            });
          } else {
            throw new Error('GLB URL not found');
          }
          break;

        case 'walrus':
          // console.log(`🐋 Walrus item detected for ${item.objectId} - will load later via SculptureControlPanel`);
          // For Walrus items, don't load immediately - mark for later loading via SculptureControlPanel
          object3D = null;
          break;

        case 'obj':
          if (config.url) {
            object3D = await this.loadOBJModel(config);
          } else {
            throw new Error('OBJ URL not found');
          }
          break;

        case 'stl':
          if (config.url) {
            object3D = await this.loadSTLModel(config);
          } else {
            throw new Error('STL URL not found');
          }
          break;

        case 'image':
          console.log(`📸 Image item detected for ${item.objectId} - will create on demand`);
          object3D = null;
          break;

        case 'geometry':
          object3D = this.createGeometryObject(config);
          break;

        case 'text':
          object3D = await this.createTextObject(config);
          break;

        default:
          throw new Error(`Unsupported 3D type: ${config.type}`);
      }

      return {
        config,
        object3D,
        kioskItem: item,
      };
    } catch (error) {
      console.error(`❌ Failed to create 3D object for item ${item.objectId}:`, error);
      console.error(`   Error details:`, error);

      // Fallback to a simple geometry
      object3D = this.createFallbackGeometry(config);

      return {
        config,
        object3D,
        kioskItem: item,
      };
    }
  }

  /**
   * Create 3D configuration from kiosk item
   */
  private create3DConfigFromKioskItem(item: KioskItem, index: number): KioskItem3DConfig | null {
    const displayData = item.data?.display?.data;
    const contentFields = item.data?.content?.fields;

    // Extract basic information
    const name = this.extractItemName(item, displayData) || `Item ${index + 1}`;
    const position = this.calculatePosition(index);

    // Try to identify 3D model URL
    const modelUrl = this.extractModelUrl(displayData, contentFields);
    if (modelUrl) {
      const modelFormat = this.detectModelFormat(modelUrl);
      return {
        id: item.objectId,
        name,
        position,
        scale: { x: 1, y: 1, z: 1 },
        type: modelFormat,
        url: modelUrl,
        modelFormat,
      };
    }

    // Try to identify image URL
    const imageUrl = this.extractImageUrl(displayData, contentFields);
    if (imageUrl) {
      return {
        id: item.objectId,
        name,
        position,
        scale: { x: 2, y: 2, z: 1 },
        type: 'image',
        url: imageUrl,
      };
    }

    // Try to identify Walrus blob ID
    const blobId = this.extractWalrusBlobId(displayData, contentFields);
    if (blobId) {
      return {
        id: item.objectId,
        name,
        position,
        scale: { x: 1, y: 1, z: 1 },
        type: 'walrus',
        url: blobId, // Store blob ID as URL for now
      };
    }

    // Default to using geometry
    return {
      id: item.objectId,
      name,
      position,
      scale: { x: 1, y: 1, z: 1 },
      type: 'geometry',
      geometryType: 'box',
      color: this.generateColorFromId(item.objectId),
    };
  }

  /**
   * Extract item name
   */
  private extractItemName(item: KioskItem, displayData?: any): string {
    if (displayData?.name) return displayData.name;
    if (displayData?.title) return displayData.title;

    // Extract from type
    const typeParts = item.type.split('::');
    return typeParts[typeParts.length - 1] || 'Unknown Item';
  }

  /**
   * Extract GLB model URL
   */
  private extractGLBUrl(displayData?: any, contentFields?: any): string | null {
    // Check GLB URL in display data
    if (displayData) {
      const possibleKeys = ['glb_url', 'model_url', '3d_url', 'glb', 'model'];
      for (const key of possibleKeys) {
        if (displayData[key]) {
          return displayData[key];
        }
      }
    }

    // Check content fields
    if (contentFields) {
      const possibleKeys = ['glb_url', 'model_url', 'url'];
      for (const key of possibleKeys) {
        if (contentFields[key]) {
          return contentFields[key];
        }
      }
    }

    return null;
  }

  /**
   * Extract Walrus blob ID
   */
  private extractWalrusBlobId(displayData?: any, contentFields?: any): string | null {
    // Check for blob ID in display data
    if (displayData) {
      const possibleKeys = ['blob_id', 'walrus_blob_id', 'blob', 'walrus_id'];
      for (const key of possibleKeys) {
        if (displayData[key]) {
          return displayData[key];
        }
      }
    }

    // Check for blob ID in content fields
    if (contentFields) {
      const possibleKeys = ['blob_id', 'walrus_blob_id', 'blob', 'walrus_id'];
      for (const key of possibleKeys) {
        if (contentFields[key]) {
          return contentFields[key];
        }
      }
    }

    return null;
  }

  /**
   * Extract image URL
   */
  private extractImageUrl(displayData?: any, contentFields?: any): string | null {
    // Check image URL in display data
    if (displayData) {
      const possibleKeys = ['image_url', 'image', 'img', 'picture', 'photo'];
      for (const key of possibleKeys) {
        if (displayData[key] && displayData[key] !== 'None' && displayData[key] !== null && displayData[key] !== undefined) {
          // console.log(`Found image URL in display data using key '${key}':`, displayData[key]);
          return displayData[key];
        }
      }
    }

    // Check content fields
    if (contentFields) {
      const possibleKeys = ['image_url', 'image', 'url'];
      for (const key of possibleKeys) {
        if (contentFields[key] && contentFields[key] !== 'None' && contentFields[key] !== null && contentFields[key] !== undefined) {
          // console.log(`Found image URL in content fields using key '${key}':`, contentFields[key]);
          return contentFields[key];
        }
      }
    }

    return null;
  }

  /**
   * Calculate item position in scene
   */
  private calculatePosition(index: number): { x: number; y: number; z: number } {
    // Simple grid layout
    const itemsPerRow = 5;
    const spacing = 3;

    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;

    return {
      x: (col - (itemsPerRow - 1) / 2) * spacing,
      y: 1 + row * 2, // Slightly raise to avoid overlap
      z: row * -2, // Slightly move back rows
    };
  }

  /**
   * Generate color from ID
   */
  private generateColorFromId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 0xffffff;
  }

  /**
   * Extract model URL (supports multiple formats)
   */
  private extractModelUrl(displayData?: any, contentFields?: any): string | null {
    // Check model URL in display data
    if (displayData) {
      const possibleKeys = ['glb_url', 'model_url', '3d_url', 'obj_url', 'stl_url', 'glb', 'obj', 'stl', 'model'];
      for (const key of possibleKeys) {
        if (displayData[key]) {
          return displayData[key];
        }
      }
    }

    // Check content fields
    if (contentFields) {
      const possibleKeys = ['glb_url', 'model_url', 'obj_url', 'stl_url', 'url'];
      for (const key of possibleKeys) {
        if (contentFields[key]) {
          return contentFields[key];
        }
      }
    }

    return null;
  }

  /**
   * Detect model format
   */
  private detectModelFormat(url: string): 'glb' | 'obj' | 'stl' {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('.glb') || lowerUrl.includes('.gltf')) {
      return 'glb';
    } else if (lowerUrl.includes('.obj')) {
      return 'obj';
    } else if (lowerUrl.includes('.stl')) {
      return 'stl';
    }

    // Default to GLB (most common format)
    return 'glb';
  }

  /**
   * Create image plane
   */
  private async createImagePlane(config: KioskItem3DConfig): Promise<THREE.Object3D> {
    if (!config.url) {
      throw new Error('Image URL is required');
    }

    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        config.url!,
        (texture) => {
          // Create plane geometry
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // Set position and scale
          if (config.position) {
            mesh.position.set(config.position.x, config.position.y, config.position.z);
          }
          if (config.scale) {
            mesh.scale.set(config.scale.x, config.scale.y, config.scale.z);
          }

          // Add to scene
          this.sceneManager.addObject(mesh);
          resolve(mesh);
        },
        undefined,
        (error) => {
          console.warn('Failed to load texture:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Create geometry object
   */
  private createGeometryObject(config: KioskItem3DConfig): THREE.Object3D {
    let geometry: THREE.BufferGeometry;

    switch (config.geometryType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(0.5);
        break;
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }

    const material = new THREE.MeshStandardMaterial({
      color: config.color || 0x888888,
      metalness: 0.5,
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Set position and scale
    if (config.position) {
      mesh.position.set(config.position.x, config.position.y, config.position.z);
    }
    if (config.scale) {
      mesh.scale.set(config.scale.x, config.scale.y, config.scale.z);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add to scene
    this.sceneManager.addObject(mesh);
    return mesh;
  }

  /**
   * Create text object
   */
  private async createTextObject(config: KioskItem3DConfig): Promise<THREE.Object3D> {
    // Simple text implementation (can use Three.js TextGeometry or Canvas texture)
    // Here we use a simple plane instead
    const geometry = new THREE.PlaneGeometry(2, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (config.position) {
      mesh.position.set(config.position.x, config.position.y, config.position.z);
    }

    this.sceneManager.addObject(mesh);
    return mesh;
  }

  /**
   * Create fallback geometry
   */
  private createFallbackGeometry(config: KioskItem3DConfig): THREE.Object3D {

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.5,
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (config.position) {
      mesh.position.set(config.position.x, config.position.y, config.position.z);
      // console.log(`   Position set to: (${config.position.x}, ${config.position.y}, ${config.position.z})`);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `FALLBACK_RED_BOX_${config.id}`;

    // console.log(`   Red fallback geometry created and added to scene for ${config.id}`);

    this.sceneManager.addObject(mesh);
    return mesh;
  }

  /**
   * Load OBJ model
   */
  private async loadOBJModel(config: KioskItem3DConfig): Promise<THREE.Object3D> {
    if (!config.url) {
      throw new Error('OBJ URL is required');
    }

    return new Promise((resolve, reject) => {
      const loader = new OBJLoader();

      loader.load(
        config.url!,
        (object) => {
          // Set name
          if (config.name) {
            object.name = config.name;
          }

          // Set position
          if (config.position) {
            object.position.set(config.position.x, config.position.y, config.position.z);
          }

          // Set rotation
          if (config.rotation) {
            object.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
          }

          // Set scale
          if (config.scale) {
            object.scale.set(config.scale.x, config.scale.y, config.scale.z);
          }

          // Set material and shadow
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material instanceof THREE.MeshPhongMaterial) {
                child.material.needsUpdate = true;
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Add to scene
          this.sceneManager.addObject(object);

          resolve(object);
        },
        () => {
          // Progress callback - currently unused
        },
        (error) => {
          console.error(`Failed to load OBJ model: ${config.url}`, error);
          reject(new Error(`Failed to load OBJ model: ${config.url}`));
        }
      );
    });
  }

  /**
   * Load STL model
   */
  private async loadSTLModel(config: KioskItem3DConfig): Promise<THREE.Object3D> {
    if (!config.url) {
      throw new Error('STL URL is required');
    }

    return new Promise((resolve, reject) => {
      const loader = new STLLoader();

      loader.load(
        config.url!,
        (geometry) => {
          // Create material
          const material = new THREE.MeshStandardMaterial({
            color: config.color || 0x888888,
            metalness: 0.5,
            roughness: 0.5,
          });

          // Create mesh
          const mesh = new THREE.Mesh(geometry, material);

          // Set name
          if (config.name) {
            mesh.name = config.name;
          }

          // Set position
          if (config.position) {
            mesh.position.set(config.position.x, config.position.y, config.position.z);
          }

          // Set rotation
          if (config.rotation) {
            mesh.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
          }

          // Set scale
          if (config.scale) {
            mesh.scale.set(config.scale.x, config.scale.y, config.scale.z);
          }

          // Set shadow
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Add to scene
          this.sceneManager.addObject(mesh);

          resolve(mesh);
        },
        () => {
          // Progress callback - currently unused
        },
        (error) => {
          console.error(`Failed to load STL model: ${config.url}`, error);
          reject(new Error(`Failed to load STL model: ${config.url}`));
        }
      );
    });
  }

  /**
   * Clear all loaded kiosk items
   */
  clearAllItems(): void {
    this.loadedItems.forEach((result) => {
      if (result.object3D) {
        this.sceneManager.removeObject(result.object3D);
      }
    });
    this.loadedItems.clear();
  }

  /**
   * Get loaded kiosk items
   */
  getLoadedItems(): KioskItem3DResult[] {
    return Array.from(this.loadedItems.values());
  }

  /**
   * get item by objectId
   */
  getItemById(objectId: string): KioskItem3DResult | undefined {
    return this.loadedItems.get(objectId);
  }
}
