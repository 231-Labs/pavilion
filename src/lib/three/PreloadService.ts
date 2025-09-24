'use client';

import { SceneManager } from './SceneManager';
import { ThreeSceneConfig } from '../../types/three';
import { KioskItemConverter } from './KioskItemConverter';
import { SceneConfigManager } from '../scene/SceneConfigManager';

export interface PreloadServiceOptions {
  kioskClient: any;
  suiClient: any;
  kioskId?: string;
  kioskItems?: any[];
  packageId: string;
  onProgress?: (progress: number, stage: string, details?: string) => void;
  onComplete?: (sceneManager: SceneManager, preloadedData: any) => void;
  onError?: (error: Error) => void;
}

export interface PreloadedSceneData {
  sceneManager: SceneManager;
  kioskItemConverter?: KioskItemConverter;
  sceneConfigManager?: SceneConfigManager;
  loadedModelNames: string[];
  displayedItems: Set<string>;
  transforms: Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>;
}

export class PreloadService {
  private options: PreloadServiceOptions;
  private preloadedData: PreloadedSceneData | null = null;
  private isPreloading: boolean = false;

  constructor(options: PreloadServiceOptions) {
    this.options = options;
  }

  async startPreloading(): Promise<PreloadedSceneData> {
    if (this.isPreloading) {
      throw new Error('Preloading already in progress');
    }

    if (this.preloadedData) {
      console.log('🎯 Using cached preloaded data');
      return this.preloadedData;
    }

    this.isPreloading = true;
    console.log('🚀 Starting scene preloading...');

    try {
      this.options.onProgress?.(5, 'Initializing Scene Manager');

      // Create a hidden canvas for preloading
      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.style.position = 'absolute';
      hiddenCanvas.style.left = '-9999px';
      hiddenCanvas.style.top = '-9999px';
      hiddenCanvas.width = 800;
      hiddenCanvas.height = 600;
      document.body.appendChild(hiddenCanvas);

      // Initialize scene manager
      const sceneConfig: ThreeSceneConfig = {
        backgroundColor: 0x1a1a1a,
        cameraPosition: [0, 1.6, 8],
        defaultScene: {
          backgroundColor: 0x0a0a0f,
          enableGrid: true,
          enableParticles: true,
          enableHolographicElements: true,
        }
      };

      const sceneManager = new SceneManager(hiddenCanvas, sceneConfig);
      this.options.onProgress?.(15, 'Scene Manager Created');

      // Initialize converters
      const kioskItemConverter = new KioskItemConverter(sceneManager);
      this.options.onProgress?.(25, 'Kiosk Item Converter Ready');

      // Initialize scene config manager
      let sceneConfigManager: SceneConfigManager | undefined;
      if (this.options.packageId) {
        sceneConfigManager = new SceneConfigManager({
          kioskClient: this.options.kioskClient,
          suiClient: this.options.suiClient,
          packageId: this.options.packageId,
          sceneManager,
        });
        this.options.onProgress?.(35, 'Scene Config Manager Ready');
      }

      let displayedItems = new Set<string>();
      let transforms = new Map<string, { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }>();
      const loadedModelNames: string[] = [];

      // Load saved scene config if available
      if (sceneConfigManager && this.options.kioskId) {
        this.options.onProgress?.(45, 'Loading Saved Scene Config');
        try {
          const savedConfig = await sceneConfigManager.loadSceneConfig(this.options.kioskId);
          if (savedConfig && this.options.kioskItems) {
            const { displayedNftItems, kioskNftTransforms } = sceneConfigManager.convertSceneConfigToPanelState(
              savedConfig, 
              this.options.kioskItems
            );
            displayedItems = displayedNftItems;
            transforms = kioskNftTransforms;
            console.log(`📋 Scene config loaded: ${displayedItems.size} items to display`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to load scene config, using defaults:', error);
        }
      }

      this.options.onProgress?.(55, 'Analyzing Kiosk Items');

      // Preload models that should be displayed
      if (this.options.kioskItems && displayedItems.size > 0) {
        const itemsToLoad = this.options.kioskItems.filter(item => displayedItems.has(item.objectId));
        
        if (itemsToLoad.length > 0) {
          console.log(`📦 Preloading ${itemsToLoad.length} models...`);
          
          for (let i = 0; i < itemsToLoad.length; i++) {
            const item = itemsToLoad[i];
            const progress = 55 + Math.round((i / itemsToLoad.length) * 40);
            
            // Extract model info
            const displayData = item.data?.display?.data || {};
            const contentFields = item.data?.content?.fields || {};
            const name = displayData.name || contentFields.name || `NFT ${item.objectId.slice(-8)}`;
            const blobId = displayData.glb_file || displayData.blob_id || displayData.walrus_blob_id ||
                          contentFields.glb_file || contentFields.blob_id || contentFields.walrus_blob_id;

            if (blobId) {
              this.options.onProgress?.(progress, `Loading ${name}...`, `${i + 1}/${itemsToLoad.length}`);
              
              try {
                const modelName = `KioskNFT_${name}_${item.objectId.slice(-8)}`;
                const url = `/api/walrus/${encodeURIComponent(blobId)}`;
                const itemTransform = transforms.get(item.objectId);
                
                await sceneManager.loadGLBModel(url, {
                  name: modelName,
                  position: itemTransform?.position || { x: 0, y: 2, z: 0 },
                  rotation: itemTransform?.rotation || { x: 0, y: 0, z: 0 },
                  scale: itemTransform?.scale || { x: 1, y: 1, z: 1 },
                });

                loadedModelNames.push(modelName);
                console.log(`✅ Preloaded model: ${modelName}`);
              } catch (error) {
                console.error(`❌ Failed to preload model ${name}:`, error);
                this.options.onError?.(error as Error);
              }
            }
          }
        }
      }

      this.options.onProgress?.(95, 'Finalizing Preloaded Scene');

      // Start scene animation
      sceneManager.startAnimation();

      // Remove hidden canvas from DOM
      document.body.removeChild(hiddenCanvas);

      this.preloadedData = {
        sceneManager,
        kioskItemConverter,
        sceneConfigManager,
        loadedModelNames,
        displayedItems,
        transforms
      };

      this.options.onProgress?.(100, 'Preloading Complete');
      this.options.onComplete?.(sceneManager, this.preloadedData);

      console.log('🎉 Scene preloading completed successfully!');
      return this.preloadedData;

    } catch (error) {
      console.error('❌ Scene preloading failed:', error);
      this.options.onError?.(error as Error);
      throw error;
    } finally {
      this.isPreloading = false;
    }
  }

  getPreloadedData(): PreloadedSceneData | null {
    return this.preloadedData;
  }

  clearPreloadedData(): void {
    if (this.preloadedData?.sceneManager) {
      this.preloadedData.sceneManager.dispose();
    }
    this.preloadedData = null;
    console.log('🧹 Preloaded data cleared');
  }

  isPreloadingInProgress(): boolean {
    return this.isPreloading;
  }
}
