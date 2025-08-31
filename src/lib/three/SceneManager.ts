import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SculptureConfig, SculptureInstance, sculptureGeometryFactories, defaultSculptures } from '../../types/sculpture';

export interface SceneConfig {
  backgroundColor?: number;
  ambientLightColor?: number;
  ambientLightIntensity?: number;
  directionalLightColor?: number;
  directionalLightIntensity?: number;
  enableShadows?: boolean;
  cameraPosition?: [number, number, number];
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  private resizeHandler: () => void;
  private sculptures: Map<string, SculptureInstance> = new Map();

  constructor(canvas: HTMLCanvasElement, config: SceneConfig = {}) {
    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.backgroundColor || 0xeeeeee);

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

    // Add lighting
    this.setupLights(config);

    // Setup resize handler
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }

  private setupLights(config: SceneConfig) {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(
      config.ambientLightColor || 0xffffff, 
      config.ambientLightIntensity || 0.6
    );
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(
      config.directionalLightColor || 0xffffff, 
      config.directionalLightIntensity || 1
    );
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  // Create gallery environment
  createGalleryEnvironment() {
    // Floor
    const floorGeometry = new THREE.BoxGeometry(20, 0.5, 20); // Use BoxGeometry and set thickness to 0.5
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.25; // Move floor down half thickness so top surface aligns with y=0 plane
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(20, 5, 0.1);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 2.5, -10);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
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
}
