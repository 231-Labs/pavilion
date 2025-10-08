import { useState, useCallback } from 'react';
import { SceneManager } from '../lib/three/SceneManager';
import { fetchModels, getWalrusUrl } from '../lib/walrus/client';

/**
 * Model loading state and logic management hook
 */
export function useModelLoader(sceneManager: SceneManager | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [walrusBlobId, setWalrusBlobId] = useState<string>('');

  /**
   * Load a single model from Walrus
   */
  const loadWalrusModel = useCallback(async (overrideBlobId?: string) => {
    if (!sceneManager) return;
    
    const sourceId = (overrideBlobId ?? walrusBlobId).trim();
    if (!sourceId) {
      setError('Please enter a valid Walrus Blob ID');
      return;
    }

    // Limit the number of external models
    const externalCount = loadedModels.length;
    if (externalCount >= 10) {
      setError('Too many external models loaded, please clear some models first');
      return;
    }

    const modelName = `Walrus_${sourceId.slice(0, 8)}`;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      const url = getWalrusUrl(sourceId);
      await sceneManager.loadGLBModel(url, {
        position: { x: 0, y: 0, z: 0 },
        name: modelName,
        onProgress: (progress) => {
          if (progress.lengthComputable) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setLoadingProgress(percent);
          }
        }
      });

      setLoadedModels(prev => [...prev, modelName]);
      setWalrusBlobId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Walrus loading failed');
    } finally {
      setIsLoading(false);
    }
  }, [sceneManager, walrusBlobId, loadedModels]);

  /**
   * Load all models from /public/models
   */
  const loadAllModels = useCallback(async () => {
    if (!sceneManager) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      const data = await fetchModels();
      const files = data.files || [];

      if (files.length === 0) {
        setError('No models found in /public/models');
        return;
      }

      const modelsToLoad = files.map((file, index) => ({
        url: file.url,
        options: {
          name: file.name.replace(/\.(glb|gltf)$/i, ''),
          position: { x: (index - Math.floor(files.length / 2)) * 2.5, y: 1.5, z: 0 },
        },
      }));

      await sceneManager.loadMultipleGLBModels(modelsToLoad);
      const modelNames = modelsToLoad.map((m) => (m.options as { name: string }).name);
      setLoadedModels(prev => [...prev, ...modelNames]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loading failed');
    } finally {
      setIsLoading(false);
    }
  }, [sceneManager]);

  return {
    isLoading,
    setIsLoading,
    loadingProgress,
    setLoadingProgress,
    loadedModels,
    setLoadedModels,
    error,
    setError,
    walrusBlobId,
    setWalrusBlobId,
    loadWalrusModel,
    loadAllModels,
  };
}

