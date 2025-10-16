import React, { useState } from 'react';
import { SceneManager } from '../../lib/three/SceneManager';
import { fetchModels } from '../../lib/services/walrus-client';

interface GLBLoaderProps {
  sceneManager: SceneManager;
}

export const GLBLoader: React.FC<GLBLoaderProps> = ({ sceneManager }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load all models from public/models via API
  const loadAllModels = async () => {
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

      const groups = await sceneManager.loadMultipleGLBModels(modelsToLoad);
      const modelNames = modelsToLoad.map((m) => (m.options as { name: string }).name);
      setLoadedModels((prev) => [...prev, ...modelNames]);
      console.log(`Loaded ${groups.length} models from /public/models`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loading failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Load custom model
  const loadCustomModel = async () => {
    const url = prompt('Please enter the URL or relative path of the GLB file:');
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      const model = await sceneManager.loadGLBModel(url, {
        position: { x: 0, y: 0, z: 0 },
        name: `CustomModel_${Date.now()}`,
        onProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingProgress(percent);
        }
      });

      setLoadedModels(prev => [...prev, model.name]);
      console.log('Custom model loaded successfully:', model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loading failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all loaded models
  const clearAllModels = () => {
    sceneManager.removeAllLoadedModels();
    setLoadedModels([]);
    setError(null);
    console.log('All loaded models cleared');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">GLB Model Loader</h2>

      <div className="space-y-3">

        <button
          onClick={loadAllModels}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
        >
          {isLoading ? 'Loading...' : 'Load All Models (from /public/models)'}
        </button>

        <button
          onClick={loadCustomModel}
          disabled={isLoading}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
        >
          {isLoading ? 'Loading...' : 'Load Custom Model'}
        </button>

        <button
          onClick={clearAllModels}
          className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
        >
          Clear Model List
        </button>
      </div>

      {isLoading && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Loading Progress: {loadingProgress}%</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loadedModels.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-gray-700 mb-2">Loaded Models:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {loadedModels.map((modelName, index) => (
              <li key={index} className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {modelName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported Features:</strong></p>
        <ul className="mt-1 space-y-1">
          <li>• Local file loading (/models/...)</li>
          <li>• Load all models from /public/models via API</li>
          <li>• External URL loading</li>
          <li>• Model caching and cloning</li>
          <li>• Custom position, rotation, scale</li>
          <li>• Shadow settings</li>
          <li>• Loading progress tracking</li>
        </ul>
      </div>
    </div>
  );
};
