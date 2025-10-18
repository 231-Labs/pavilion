import * as THREE from 'three';
import { getWalrusUrl } from '../walrus/client';

/**
 * 2D Image to 3D Renderer
 * Converts 2D images into 3D objects for display in Three.js scenes
 */

export interface Image3DOptions {
  /** Image display style */
  style: 'flat' | 'framed' | 'canvas' | 'floating';
  
  /** Image dimensions */
  width?: number;
  height?: number;
  
  /** Thickness for 3D effect */
  thickness?: number;
  
  /** Frame options (when style is 'framed') */
  frame?: {
    width: number;
    height: number;
    depth: number;
    color: number;
    material: 'wood' | 'metal' | 'plastic';
  };
  
  /** Canvas options (when style is 'canvas') */
  canvas?: {
    frameWidth: number;
    frameColor: number;
    canvasColor: number;
  };
  
  /** Floating options (when style is 'floating') */
  floating?: {
    glowColor: number;
    glowIntensity: number;
    shadowOpacity: number;
  };
}

export class Image3DRenderer {
  private scene: THREE.Scene;
  private textureLoader: THREE.TextureLoader;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
  }
  
  /**
   * Create 3D object from image URL or blob ID
   */
  async create3DImageObject(
    imageSource: string,
    options: Image3DOptions = { style: 'framed' }
  ): Promise<THREE.Group> {
    const texture = await this.loadTexture(imageSource);
    
    switch (options.style) {
      case 'flat':
        return this.createFlatImage(texture, options);
      case 'framed':
        return this.createFramedImage(texture, options);
      case 'canvas':
        return this.createCanvasImage(texture, options);
      case 'floating':
        return this.createFloatingImage(texture, options);
      default:
        return this.createFramedImage(texture, options);
    }
  }
  
  /**
   * Load texture from URL or Walrus blob ID
   */
  private async loadTexture(imageSource: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      // Check if it's a Walrus blob ID (no http/https prefix)
      const imageUrl = imageSource.startsWith('http') 
        ? imageSource 
        : getWalrusUrl(imageSource);
      
      this.textureLoader.load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error('Failed to load texture:', error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Create flat image plane with optional thickness
   */
  private createFlatImage(texture: THREE.Texture, options: Image3DOptions): THREE.Group {
    const group = new THREE.Group();
    
    // Calculate dimensions based on texture aspect ratio
    const aspectRatio = texture.image.width / texture.image.height;
    const width = options.width || 2;
    const height = options.height || width / aspectRatio;
    const thickness = options.thickness || 0.02;
    
    if (thickness > 0) {
      // Create extruded geometry for thickness
      const shape = new THREE.Shape();
      shape.moveTo(-width/2, -height/2);
      shape.lineTo(width/2, -height/2);
      shape.lineTo(width/2, height/2);
      shape.lineTo(-width/2, height/2);
      shape.lineTo(-width/2, -height/2);
      
      const extrudeSettings = {
        depth: thickness,
        bevelEnabled: false,
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Create materials
      const frontMaterial = new THREE.MeshStandardMaterial({ map: texture });
      const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const materials = [sideMaterial, sideMaterial, sideMaterial, sideMaterial, frontMaterial, frontMaterial];
      
      const mesh = new THREE.Mesh(geometry, materials);
      group.add(mesh);
    } else {
      // Simple plane
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
    }
    
    return group;
  }
  
  /**
   * Create holographic image effect - Floating 2D image
   */
  private createFramedImage(texture: THREE.Texture, options: Image3DOptions): THREE.Group {
    const group = new THREE.Group();
    
    // Image dimensions
    const aspectRatio = texture.image.width / texture.image.height;
    const imageWidth = options.width || 2;
    const imageHeight = options.height || imageWidth / aspectRatio;
    
    // Create holographic image plane
    const imageGeometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
    const imageMaterial = new THREE.MeshStandardMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.95, // Slightly more opaque for better visibility
      side: THREE.DoubleSide, // Visible from both sides
      emissive: new THREE.Color(0x444444), // Brighter gray glow for more illumination
      emissiveIntensity: 0.15, // Increased intensity for brighter appearance
      metalness: 0.1, // Slight metalness for better light reflection
      roughness: 0.3, // Lower roughness for more light reflection
    });
    const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    group.add(imageMesh);
    
    // Add subtle glow effect around the image - silver gray
    const glowGeometry = new THREE.PlaneGeometry(imageWidth * 1.05, imageHeight * 1.05);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xC0C0C0, // Silver gray holographic glow
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.001; // Slightly behind the image
    group.add(glowMesh);
    
    // Enable shadows for the main image only
    imageMesh.castShadow = false; // Holograms don't cast shadows
    imageMesh.receiveShadow = false;
    
    return group;
  }
  
  
  /**
   * Create canvas-style image with artistic frame
   */
  private createCanvasImage(texture: THREE.Texture, options: Image3DOptions): THREE.Group {
    const group = new THREE.Group();
    
    const aspectRatio = texture.image.width / texture.image.height;
    const imageWidth = options.width || 2;
    const imageHeight = options.height || imageWidth / aspectRatio;
    
    const canvasSettings = options.canvas || {
      frameWidth: 0.05,
      frameColor: 0x2F1B14, // Dark brown
      canvasColor: 0xF5F5DC, // Beige canvas background
    };
    
    // Create canvas background
    const canvasGeometry = new THREE.PlaneGeometry(
      imageWidth + canvasSettings.frameWidth * 2,
      imageHeight + canvasSettings.frameWidth * 2
    );
    const canvasMaterial = new THREE.MeshStandardMaterial({ 
      color: canvasSettings.canvasColor,
      roughness: 0.8,
    });
    const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvasMesh.position.z = -0.001;
    group.add(canvasMesh);
    
    // Create image with double-sided material
    const imageGeometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
    const imageMaterial = new THREE.MeshStandardMaterial({ 
      map: texture,
      side: THREE.DoubleSide, // Fix back face visibility
    });
    const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    group.add(imageMesh);
    
    // Create simple frame border
    const frameGeometry = new THREE.RingGeometry(
      Math.max(imageWidth, imageHeight) / 2 + canvasSettings.frameWidth,
      Math.max(imageWidth, imageHeight) / 2 + canvasSettings.frameWidth + 0.02,
      32
    );
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: canvasSettings.frameColor 
    });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.z = 0.001;
    group.add(frameMesh);
    
    return group;
  }
  
  /**
   * Create floating image with glow effect
   */
  private createFloatingImage(texture: THREE.Texture, options: Image3DOptions): THREE.Group {
    const group = new THREE.Group();
    
    const aspectRatio = texture.image.width / texture.image.height;
    const imageWidth = options.width || 2;
    const imageHeight = options.height || imageWidth / aspectRatio;
    
    const floatingSettings = options.floating || {
      glowColor: 0x00FFFF,
      glowIntensity: 0.5,
      shadowOpacity: 0.3,
    };
    
    // Create main image with double-sided material
    const imageGeometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
    const imageMaterial = new THREE.MeshStandardMaterial({ 
      map: texture,
      emissive: new THREE.Color(floatingSettings.glowColor),
      emissiveIntensity: floatingSettings.glowIntensity * 0.1,
      side: THREE.DoubleSide, // Fix back face visibility
    });
    const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    group.add(imageMesh);
    
    // Create glow effect
    const glowGeometry = new THREE.PlaneGeometry(imageWidth * 1.1, imageHeight * 1.1);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: floatingSettings.glowColor,
      opacity: floatingSettings.glowIntensity,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.01;
    group.add(glowMesh);
    
    // Create shadow
    const shadowGeometry = new THREE.PlaneGeometry(imageWidth * 0.8, imageHeight * 0.8);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: floatingSettings.shadowOpacity,
      transparent: true,
    });
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.set(0.1, -0.1, -0.02);
    shadowMesh.rotation.x = -Math.PI / 2;
    group.add(shadowMesh);
    
    return group;
  }
  
}
