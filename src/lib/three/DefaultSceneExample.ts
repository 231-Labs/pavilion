import { SceneManager } from './SceneManager';

/**
 * Example usage of the new DefaultScene with cosmic/tech aesthetic
 */
export function createCosmicSceneExample(canvas: HTMLCanvasElement) {
  // Create SceneManager with default scene configuration
  const sceneManager = new SceneManager(canvas, {
    // Disable default background since DefaultScene handles it
    backgroundColor: 0x0a0a0f,

    // Configure the cosmic default scene
    defaultScene: {
      backgroundColor: 0x0a0a0f, // Deep space blue-black
      enableGrid: true,          // Show 3D space grid
      enableParticles: true,     // Floating cosmic particles
      enableHolographicElements: true // Tech rings and lines
    },

    // Camera setup
    cameraPosition: [0, 5, 15],

    // Lighting
    ambientLightColor: 0x4a90e2,
    ambientLightIntensity: 0.3,
    directionalLightColor: 0xffffff,
    directionalLightIntensity: 0.8,

    // Enable shadows for better depth
    enableShadows: true
  });

  // Alternative: Initialize default scene separately
  // sceneManager.initializeDefaultScene({
  //   backgroundColor: 0x0a0a0f,
  //   enableGrid: true,
  //   enableParticles: true,
  //   enableHolographicElements: true
  //
  //
  // });

  return sceneManager;
}

/**
 * Configuration options for different scene styles
 */
export const ScenePresets = {
  // Full cosmic experience with spotlights
  cosmic: {
    backgroundColor: 0x0a0a0f,
    enableGrid: true,
    enableParticles: true,
    enableHolographicElements: true,
    enableSpotlights: true
  },

  // Particle field focus with spotlights
  particles: {
    backgroundColor: 0x0a0a0f,
    enableGrid: false,
    enableParticles: true,
    enableHolographicElements: true,
    enableSpotlights: true
  },

  // Holographic showcase with enhanced lighting
  holographic: {
    backgroundColor: 0x0a0a0f,
    enableGrid: true,
    enableParticles: false,
    enableHolographicElements: true,
    enableSpotlights: true
  },

  // Dark mode without spotlights
  dark: {
    backgroundColor: 0x0a0a0f,
    enableGrid: true,
    enableParticles: true,
    enableHolographicElements: true,
    enableSpotlights: false
  },

  // Performance optimized - minimal elements for better performance
  minimal: {
    backgroundColor: 0x0a0a0f,
    enableGrid: true,
    enableParticles: false,
    enableHolographicElements: false,
    enableSpotlights: true
  },

  // Clean cosmic - only essential elements
  clean: {
    backgroundColor: 0x0a0a0f,
    enableGrid: false,
    enableParticles: false,
    enableHolographicElements: true,
    enableSpotlights: true
  },

  // Bright showcase - maximum illumination for exhibitions
  bright: {
    backgroundColor: 0x0a0a0f,
    enableGrid: true,
    enableParticles: true,
    enableHolographicElements: true,
    enableSpotlights: true
  }
};
