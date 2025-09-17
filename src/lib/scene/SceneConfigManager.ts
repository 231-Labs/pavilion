/**
 * Scene config manager
 * Unified logic for saving, loading, and rebuilding scene
 */

import { 
  SceneConfig, 
  SceneObject, 
  createSceneConfig, 
  createSceneObjectFromKioskItem, 
  validateSceneConfig,
  validateCompactSceneConfig,
  compressSceneConfig,
  decompressSceneConfig
} from '../../types/scene';
import { readSceneConfig, setSceneConfigTx } from '../tx/pavilion';
import { KioskClient } from '@mysten/kiosk';
import { SceneManager } from '../three/SceneManager';
import * as THREE from 'three';

export interface SceneConfigManagerOptions {
  kioskClient: KioskClient;
  suiClient: any;
  packageId: string;
  sceneManager?: SceneManager;
}

export class SceneConfigManager {
  private kioskClient: KioskClient;
  private suiClient: any;
  private packageId: string;
  private sceneManager?: SceneManager;

  constructor(options: SceneConfigManagerOptions) {
    this.kioskClient = options.kioskClient;
    this.suiClient = options.suiClient;
    this.packageId = options.packageId;
    this.sceneManager = options.sceneManager;
  }

  /**
   * Create scene config from kiosk items
   */
  createSceneConfigFromKioskItems(
    kioskItems: any[],
    kioskId?: string,
    creator?: string
  ): SceneConfig {
    const objects: SceneObject[] = kioskItems.map((item, index) =>
      createSceneObjectFromKioskItem(item, index)
    );

    const metadata = {
      kioskId,
      creator,
      description: `3D scene config - contains ${objects.length} objects`,
    };

    return createSceneConfig(objects, metadata);
  }

  /**
   * Collect current scene state from scene manager
   */
  captureCurrentSceneState(
    baseConfig: SceneConfig,
    kioskItems: any[]
  ): SceneConfig {
    if (!this.sceneManager) {
      console.warn('SceneManager not available, using base config');
      return baseConfig;
    }

    const scene = this.sceneManager.getScene();
    if (!scene) {
      console.warn('Scene not available, using base config');
      return baseConfig;
    }

    // Create objectId to suffix mapping
    const objectIdToSuffix: Record<string, string> = {};
    const suffixToObjectId: Record<string, string> = {};
    
    kioskItems.forEach(item => {
      if (typeof item.objectId === 'string') {
        const suffix = item.objectId.slice(-8);
        objectIdToSuffix[item.objectId] = suffix;
        suffixToObjectId[suffix] = item.objectId;
      }
    });

    // Copy base config
    const updatedConfig: SceneConfig = {
      ...baseConfig,
      updatedAt: Date.now(),
    };

    // Update object state
    const updatedObjects: SceneObject[] = baseConfig.objects.map(obj => {
      const suffix = objectIdToSuffix[obj.id];
      if (!suffix) return obj;

      // Find corresponding 3D object in the scene
      let sceneObject: THREE.Object3D | null = null;
      try {
        scene.traverse((child) => {
          if (!child?.name || typeof child.name !== 'string') return;
          if (child.name.endsWith(suffix)) {
            sceneObject = child;
          }
        });
      } catch (error) {
        console.warn(`Error finding scene object for ${obj.id}:`, error);
      }

      if (!sceneObject) {
        return { ...obj, displayed: false };
      }

      const validSceneObject = sceneObject as THREE.Object3D;

      // Update transform information
      return {
        ...obj,
        displayed: validSceneObject.visible !== false,
        position: {
          x: validSceneObject.position.x ?? obj.position.x,
          y: validSceneObject.position.y ?? obj.position.y,
          z: validSceneObject.position.z ?? obj.position.z,
        },
        rotation: {
          x: validSceneObject.rotation.x ?? obj.rotation.x,
          y: validSceneObject.rotation.y ?? obj.rotation.y,
          z: validSceneObject.rotation.z ?? obj.rotation.z,
        },
        scale: validSceneObject.scale.x ?? obj.scale,
        updatedAt: Date.now(),
      };
    });

    updatedConfig.objects = updatedObjects;
    return updatedConfig;
  }

  /**
   * Load scene config from chain
   */
  async loadSceneConfig(kioskId: string): Promise<SceneConfig | null> {
    try {
      const jsonStr = await readSceneConfig({
        suiClient: this.suiClient,
        packageId: this.packageId,
        kioskId,
      });

      if (!jsonStr) {
        console.log('No scene config found on chain');
        return null;
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse scene config JSON:', parseError);
        return null;
      }

      // Try to validate as compact format first (new format)
      if (validateCompactSceneConfig(parsedData)) {
        console.log(`Loaded compact scene config with ${parsedData.o.length} objects`);
        return decompressSceneConfig(parsedData);
      }
      
      // Fall back to full format (legacy support)
      if (validateSceneConfig(parsedData)) {
        console.log(`Loaded full scene config with ${parsedData.objects.length} objects`);
        return parsedData;
      }

      console.error('Invalid scene config format:', parsedData);
      return null;
    } catch (error) {
      console.error('Failed to load scene config:', error);
      return null;
    }
  }

  /**
   * Create save scene config transaction (using compact format to save gas)
   */
  createSaveTransaction(
    config: SceneConfig,
    kioskId: string,
    kioskOwnerCapId: string
  ) {
    // Use compact format to minimize gas cost
    const compactConfig = compressSceneConfig(config);
    const jsonStr = JSON.stringify(compactConfig);
    
    return setSceneConfigTx({
      kioskClient: this.kioskClient,
      packageId: this.packageId,
      kioskId,
      kioskOwnerCapId,
      json: jsonStr,
    });
  }

  /**
   * Convert scene config to panel state format
   * This should be used instead of directly applying to 3D scene
   */
  convertSceneConfigToPanelState(
    config: SceneConfig,
    kioskItems: any[]
  ): {
    displayedNftItems: Set<string>;
    kioskNftTransforms: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>;
  } {
    const displayedNftItems = new Set<string>();
    const kioskNftTransforms = new Map();

    // Create objectId mapping for matching
    const objectIdToItem: Record<string, any> = {};
    kioskItems.forEach(item => {
      if (typeof item.objectId === 'string') {
        objectIdToItem[item.objectId] = item;
      }
    });

    // Process each scene config object
    config.objects.forEach(sceneObj => {
      const kioskItem = objectIdToItem[sceneObj.id];
      if (!kioskItem) return;

      // Add to displayed items if shown
      if (sceneObj.displayed) {
        displayedNftItems.add(sceneObj.id);
      }

      // Set transform data
      kioskNftTransforms.set(sceneObj.id, {
        position: sceneObj.position,
        rotation: sceneObj.rotation,
        scale: { 
          x: sceneObj.scale, 
          y: sceneObj.scale, 
          z: sceneObj.scale 
        }
      });
    });

    console.log(`✅ Converted scene config to panel state:`, {
      displayedItems: displayedNftItems.size,
      transforms: kioskNftTransforms.size
    });

    return {
      displayedNftItems,
      kioskNftTransforms
    };
  }

  /**
   * Apply scene config to 3D scene (DEPRECATED - use convertSceneConfigToPanelState instead)
   */
  applySceneConfig(
    config: SceneConfig,
    kioskItems: any[],
    maxAttempts: number = 5,
    delayMs: number = 300
  ): void {
    if (!this.sceneManager) {
      console.warn('SceneManager not available, cannot apply scene config');
      return;
    }

    const scene = this.sceneManager.getScene();
    if (!scene) {
      console.warn('Scene not available, cannot apply scene config');
      return;
    }

    console.log(`Applying scene config with ${config.objects.length} objects`);
    
    // Debug: Log kiosk items
    console.log('🎒 Kiosk items for matching:', kioskItems.map(item => ({
      objectId: item.objectId,
      suffix: item.objectId?.slice(-8),
      type: item.type,
      name: item.data?.display?.name
    })));

    // Create objectId to suffix mapping
    const objectIdToSuffix: Record<string, string> = {};
    kioskItems.forEach(item => {
      if (typeof item.objectId === 'string') {
        const suffix = item.objectId.slice(-8);
        objectIdToSuffix[item.objectId] = suffix;
      }
    });
    
    // Debug: Log scene config objects
    console.log('📋 Scene config objects:', config.objects.map(obj => ({
      id: obj.id,
      suffix: objectIdToSuffix[obj.id],
      name: obj.name,
      displayed: obj.displayed
    })));

    const applyTransforms = () => {
      let appliedCount = 0;
      
      // Debug: Log all 3D scene objects
      const sceneObjects: string[] = [];
      scene.traverse((child: any) => {
        if (child?.name && typeof child.name === 'string') {
          sceneObjects.push(child.name);
        }
      });
      console.log('🎭 3D Scene objects:', sceneObjects);
      
      try {
        scene.traverse((child: any) => {
          if (!child?.name || typeof child.name !== 'string') return;

          // Find matching scene object config
          for (const sceneObj of config.objects) {
            const suffix = objectIdToSuffix[sceneObj.id];
            console.log(`🔍 Trying to match: 3D object "${child.name}" with config object "${sceneObj.name}" (suffix: "${suffix}")`);
            
            if (!suffix || !child.name.endsWith(suffix)) continue;

            // Apply displayed status
            child.visible = sceneObj.displayed;

            // Apply position
            if (child.position?.set) {
              child.position.set(
                sceneObj.position.x,
                sceneObj.position.y,
                sceneObj.position.z
              );
            }

            // Apply rotation
            if (child.rotation) {
              child.rotation.x = sceneObj.rotation.x;
              child.rotation.y = sceneObj.rotation.y;
              child.rotation.z = sceneObj.rotation.z;
            }

            // Apply scale
            if (child.scale?.set) {
              child.scale.set(sceneObj.scale, sceneObj.scale, sceneObj.scale);
            }

            appliedCount++;
            console.log(`✅ Applied transforms to ${child.name}:`, {
              displayed: sceneObj.displayed,
              position: sceneObj.position,
              rotation: sceneObj.rotation,
              scale: sceneObj.scale,
            });
            
            break; // Find matching item, exit inner loop
          }
        });
      } catch (error) {
        console.warn('Error applying scene transforms:', error);
      }

      console.log(`Applied transforms to ${appliedCount} objects`);
      return appliedCount;
    };

    // Try multiple times to apply config (wait for model loading to complete)
    let attempts = 0;
    const tryApply = () => {
      attempts++;
      const appliedCount = applyTransforms();
      
      // If some config is applied or reached max attempts, stop
      if (appliedCount > 0 || attempts >= maxAttempts) {
        if (appliedCount === 0) {
          console.warn(`Failed to apply scene config after ${attempts} attempts`);
        } else {
          console.log(`Successfully applied scene config after ${attempts} attempts`);
        }
        return;
      }

      // Continue trying
      setTimeout(tryApply, delayMs);
    };

    // Try once immediately, then set delay retry
    setTimeout(tryApply, 100);
  }

  /**
   * Get scene stats
   */
  getSceneStats(config: SceneConfig): {
    totalObjects: number;
    displayedObjects: number;
    objectTypes: Record<string, number>;
  } {
    const stats = {
      totalObjects: config.objects.length,
      displayedObjects: config.objects.filter(obj => obj.displayed).length,
      objectTypes: {} as Record<string, number>,
    };

    config.objects.forEach(obj => {
      stats.objectTypes[obj.type] = (stats.objectTypes[obj.type] || 0) + 1;
    });

    return stats;
  }
}
