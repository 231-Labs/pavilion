/**
 * Three.js related type definitions
 */

import { DefaultSceneConfig } from '../lib/scene/DefaultScene';

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
  onProgress?: (progress: ProgressEvent) => void;
}
