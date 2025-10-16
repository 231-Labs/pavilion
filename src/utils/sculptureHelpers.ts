import * as THREE from 'three';
import { SceneManager } from '../lib/three/SceneManager';

/**
 * Sculpture/NFT helper utility functions
 */

// Logger type
type ConsoleArgs = Parameters<typeof console.log>;
export const logger = {
  log: (...args: ConsoleArgs) => console.log(...args),
  warn: (...args: ConsoleArgs) => console.warn(...args),
  error: (...args: ConsoleArgs) => console.error(...args),
};

/**
 * Generate consistent model name for Kiosk NFTs
 */
export const kioskModelName = (name: string, id: string) => 
  `KioskNFT_${name}_${id.slice(-8)}`;

/**
 * Safely traverse scene and apply operation to specific model group
 */
export const withKioskModelGroup = (
  sceneManager: SceneManager | undefined,
  modelName: string,
  onGroup: (group: THREE.Group) => void,
  warnMessage: string
) => {
  const scene = sceneManager?.getScene();
  if (scene) {
    try {
      scene.traverse((child) => {
        if (child && child.name === modelName && child instanceof THREE.Group) {
          onGroup(child);
        }
      });
    } catch (error) {
      logger.warn(warnMessage, error);
    }
  }
};

/**
 * Remove model with specified name from scene
 */
export const removeModelFromScene = (
  sceneManager: SceneManager | undefined,
  modelName: string
): boolean => {
  const scene = sceneManager?.getScene();
  if (!scene) return false;

  let removed = false;
  try {
    scene.traverse((child) => {
      if (child && child.name === modelName && child.parent) {
        child.parent.remove(child);
        removed = true;
      }
    });
  } catch (error) {
    logger.warn('Error removing model from scene:', error);
  }
  return removed;
};

