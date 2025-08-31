import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager, SceneConfig } from '../lib/three/SceneManager';
import { SculptureInstance } from '../types/sculpture';

export interface UseThreeSceneOptions extends SceneConfig {
  createGallery?: boolean;
  addSculptures?: boolean;
}

export function useThreeScene(options: UseThreeSceneOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [sculptures, setSculptures] = useState<SculptureInstance[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene manager
    const sceneManager = new SceneManager(canvasRef.current, options);
    sceneManagerRef.current = sceneManager;

    // Add content based on options
    if (options.createGallery !== false) {
      sceneManager.createGalleryEnvironment();
    }

    if (options.addSculptures !== false) {
      sceneManager.addSculptures();
      // Update sculpture status
      setSculptures(sceneManager.getSculptures());
    }

    // Start animation
    sceneManager.startAnimation();

    // Cleanup function
    return () => {
      sceneManager.dispose();
      sceneManagerRef.current = null;
      setSculptures([]);
    };
  }, [
    options.backgroundColor,
    options.ambientLightColor,
    options.ambientLightIntensity,
    options.directionalLightColor,
    options.directionalLightIntensity,
    options.enableShadows,
    options.createGallery,
    options.addSculptures,
  ]);

  // Provide access interface for scene manager
  const getSceneManager = () => sceneManagerRef.current;

  // Callback for updating sculpture position
  const updateSculpturePosition = useCallback((id: string, position: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculpturePosition(id, position);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  // Callback for updating sculpture rotation
  const updateSculptureRotation = useCallback((id: string, rotation: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculptureRotation(id, rotation);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  // Callback for updating sculpture scale
  const updateSculptureScale = useCallback((id: string, scale: { x: number; y: number; z: number }) => {
    const sceneManager = sceneManagerRef.current;
    if (sceneManager) {
      sceneManager.updateSculptureScale(id, scale);
      setSculptures([...sceneManager.getSculptures()]);
    }
  }, []);

  return {
    canvasRef,
    sceneManager: getSceneManager,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale,
  };
}
