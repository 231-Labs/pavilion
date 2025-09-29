import * as THREE from 'three';
// @ts-expect-error - Three.js examples don't have proper TypeScript definitions
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SculptureConfig, SculptureInstance, sculptureGeometryFactories, defaultSculptures } from '../../types/sculpture';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DefaultScene, DefaultSceneConfig } from './DefaultScene';
import { ThreeSceneConfig, LoadGLBOptions } from '../../types/three';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  private resizeHandler: () => void;
  private sculptures: Map<string, SculptureInstance> = new Map();
  private loadedModels: Map<string, THREE.Group> = new Map();
  private defaultScene?: DefaultScene;

  constructor(canvas: HTMLCanvasElement, config: ThreeSceneConfig = {}) {
    // Setup scene
    this.scene = new THREE.Scene();

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const [x, y, z] = config.cameraPosition || [0, 5, 10];
    this.camera.position.set(x, y, z);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (config.enableShadows !== false) {
      this.renderer.shadowMap.enabled = true;
    }

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Initialize default scene (if enabled)
    if (config.defaultScene) {
      this.defaultScene = new DefaultScene(this.scene, config.defaultScene);
    } else {
      // Fallback to basic background if no default scene
      this.scene.background = new THREE.Color(config.backgroundColor || 0xeeeeee);
    }

    // Add lighting
    this.setupLights(config);

    // Setup resize handler
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }

  private setupLights(config: ThreeSceneConfig) {
    // Ambient light - significantly increase for better base lighting
    const ambientLight = new THREE.AmbientLight(
      config.ambientLightColor || 0x6a6a8a, // Brighten color further
      config.ambientLightIntensity || 0.8 // Increased from 0.6 to 0.8
    );
    this.scene.add(ambientLight);

    // Main directional light - provide bright illumination
    const directionalLight = new THREE.DirectionalLight(
      config.directionalLightColor || 0xffffff, // Pure white light
      config.directionalLightIntensity || 1.8 // Increased from 1.2 to 1.8
    );
    directionalLight.position.set(8, 20, 8); // Raise and reposition for better coverage
    directionalLight.castShadow = true;

    // Enhanced shadow configuration
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.bias = -0.00005; // Reduce shadow acne

    this.scene.add(directionalLight);

    // Enhanced hemisphere light for better ambient environment
    const hemisphereLight = new THREE.HemisphereLight(
      0xa0d8ff, // Brighter sky blue
      0x404060, // Slightly brighter ground
      0.6 // Increased from 0.4 to 0.6
    );
    this.scene.add(hemisphereLight);

    // Additional fill lights for comprehensive illumination
    const fillLight1 = new THREE.DirectionalLight(0x6a90e2, 0.5); // Increased intensity
    fillLight1.position.set(-8, 12, -8);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0x8a6ae2, 0.4); // Additional purple fill
    fillLight2.position.set(8, 12, -8);
    this.scene.add(fillLight2);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 25, -15);
    this.scene.add(rimLight);
  }

  // Initialize default scene with cosmic/tech aesthetic
  initializeDefaultScene(config: DefaultSceneConfig = {}) {
    if (this.defaultScene) {
      this.defaultScene.dispose();
    }
    this.defaultScene = new DefaultScene(this.scene, config);
  }

  // Add sculptures (using default configuration)
  addSculptures() {
    defaultSculptures.forEach(config => {
      this.addSculpture(config);
    });
  }

  // Create and add individual sculpture
  addSculpture(config: SculptureConfig) {
    // Create geometry
    const geometry = sculptureGeometryFactories[config.type](config);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: config.material.color,
      metalness: config.material.metalness || 0.5,
      roughness: config.material.roughness || 0.5
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.set(config.position.x, config.position.y, config.position.z);
    
    // Set rotation (if available)
    if (config.rotation) {
      mesh.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    }
    
    // Set scale (if available)
    if (config.scale) {
      mesh.scale.set(config.scale.x, config.scale.y, config.scale.z);
    }
    
    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add to scene
    this.scene.add(mesh);

    // Save to manager
    const instance: SculptureInstance = { config, mesh };
    this.sculptures.set(config.id, instance);

    return instance;
  }

  // Update sculpture position
  updateSculpturePosition(id: string, position: { x: number; y: number; z: number }) {
    const sculpture = this.sculptures.get(id);
    if (sculpture) {
      sculpture.mesh.position.set(position.x, position.y, position.z);
      sculpture.config.position = { ...position };
    }
  }

  // Update sculpture rotation
  updateSculptureRotation(id: string, rotation: { x: number; y: number; z: number }) {
    const sculpture = this.sculptures.get(id);
    if (sculpture) {
      sculpture.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      sculpture.config.rotation = { ...rotation };
    }
  }

  // Update sculpture scale
  updateSculptureScale(id: string, scale: { x: number; y: number; z: number }) {
    const sculpture = this.sculptures.get(id);
    if (sculpture) {
      sculpture.mesh.scale.set(scale.x, scale.y, scale.z);
      sculpture.config.scale = { ...scale };
    }
  }

  // Remove sculpture
  removeSculpture(id: string) {
    const sculpture = this.sculptures.get(id);
    if (sculpture) {
      this.scene.remove(sculpture.mesh);
      sculpture.mesh.geometry.dispose();
      if (Array.isArray(sculpture.mesh.material)) {
        sculpture.mesh.material.forEach(material => material.dispose());
      } else {
        sculpture.mesh.material.dispose();
      }
      this.sculptures.delete(id);
    }
  }

  // Get all sculptures
  getSculptures(): SculptureInstance[] {
    return Array.from(this.sculptures.values());
  }

  // Get specific sculpture
  getSculpture(id: string): SculptureInstance | undefined {
    return this.sculptures.get(id);
  }

  // Add object to scene
  addObject(object: THREE.Object3D) {
    this.scene.add(object);
  }

  // Remove object
  removeObject(object: THREE.Object3D) {
    this.scene.remove(object);
  }

  // Start animation loop
  startAnimation() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();

      // Update default scene animations
      if (this.defaultScene) {
        this.defaultScene.update(0.016); // ~60fps delta time
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  // Stop animation
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Handle window resize
  private handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Get scene object (for debugging or advanced operations)
  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  // Dispose resources
  dispose() {
    this.stopAnimation();
    window.removeEventListener('resize', this.resizeHandler);

    // Dispose default scene
    if (this.defaultScene) {
      this.defaultScene.dispose();
    }

    // Dispose Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.controls.dispose();
  }

  async loadGLBModel(url: string, options: LoadGLBOptions = {}) {
    const loader = new GLTFLoader();

    // Check cache
    if (this.loadedModels.has(url)) {
      console.log(`Loading model from cache: ${url}`);
      const cachedModel = this.loadedModels.get(url)!;

      // If model is not in scene, add it back
      if (cachedModel.parent !== this.scene) {
        // Reapply options
        if (options.name) {
          cachedModel.name = options.name;
        }
        if (options.position) {
          cachedModel.position.set(options.position.x, options.position.y, options.position.z);
        }
        if (options.rotation) {
          cachedModel.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
        }
        if (options.scale) {
          cachedModel.scale.set(options.scale.x, options.scale.y, options.scale.z);
        }

        // Set shadows
        const castShadow = options.castShadow !== false;
        const receiveShadow = options.receiveShadow !== false;
        cachedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
          }
        });

        this.scene.add(cachedModel);
      }

      return Promise.resolve(cachedModel);
    }

    return new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Set name
          if (options.name) {
            model.name = options.name;
          }

          // Set position
          if (options.position) {
            model.position.set(options.position.x, options.position.y, options.position.z);
          }

          // Set rotation
          if (options.rotation) {
            model.rotation.set(options.rotation.x, options.rotation.y, options.rotation.z);
          }

          // Set scale
          if (options.scale) {
            model.scale.set(options.scale.x, options.scale.y, options.scale.z);
          }

          // Enable shadows
          const castShadow = options.castShadow !== false;
          const receiveShadow = options.receiveShadow !== false;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = castShadow;
              child.receiveShadow = receiveShadow;

              // Ensure material is properly set
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                      mat.needsUpdate = true;
                    }
                  });
                } else if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
                  child.material.needsUpdate = true;
                }
              }
            }
          });

          // Add to scene
          this.scene.add(model);

          // Cache model reference for later removal
          this.loadedModels.set(url, model);

          console.log(`GLB model loaded successfully: ${url}`);
          resolve(model);
        },
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`Loading progress ${url}: ${percent}%`);

          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          console.error(`Failed to load GLB model: ${url}`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          reject(new Error(`Failed to load GLB model: ${url}. ${errorMessage}`));
        }
      );
    });
  }



  // Load multiple GLB models
  async loadMultipleGLBModels(models: Array<{ url: string; options?: LoadGLBOptions }>): Promise<THREE.Group[]> {
    const promises = models.map(({ url, options = {} }) =>
      this.loadGLBModel(url, options)
    );

    try {
      const loadedModels = await Promise.all(promises);
      console.log(`Successfully loaded ${loadedModels.length} GLB models`);
      return loadedModels;
    } catch (error) {
      console.error('Error loading multiple GLB models:', error);
      throw error;
    }
  }

  // Remove loaded model
  removeLoadedModel(model: THREE.Group) {
    this.scene.remove(model);

    // Clean up resources
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  // Remove all loaded GLB models
  removeAllLoadedModels() {
    console.log('Starting to clear all loaded GLB models, current cache size:', this.loadedModels.size);

    // Clear all models in cache
    this.loadedModels.forEach((model, url) => {
      console.log('Removing model:', url, model.name);

      // Ensure model is still in scene
      if (model.parent === this.scene) {
        this.scene.remove(model);
        console.log('Removed model from scene:', model.name);
      } else {
        console.log('Model not in scene:', model.name);
      }

      // Clean up resources
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });

    // Clear cache
    this.loadedModels.clear();
    console.log('All loaded GLB models cleared, cache emptied');
  }

  // Clear model cache
  clearModelCache() {
    this.loadedModels.clear();
    console.log('GLB model cache cleared');
  }
}
