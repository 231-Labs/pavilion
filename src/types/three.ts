/**
 * Three.js related type definitions
 */

import { DefaultSceneConfig } from '../lib/three/DefaultScene';

// Configuration for Three.js scene rendering
export interface ThreeSceneConfig {
  backgroundColor?: number;
  ambientLightColor?: number;
  ambientLightIntensity?: number;
  directionalLightColor?: number;
  directionalLightIntensity?: number;
  enableShadows?: boolean;
  cameraPosition?: [number, number, number];
  defaultScene?: DefaultSceneConfig;
}

// Options for loading GLB models
export interface LoadGLBOptions {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
  // Support both ProgressEvent (for Three.js loader) and custom progress callback
  onProgress?: ((progress: ProgressEvent) => void) | ((progress: number, stage: string) => void);
}
