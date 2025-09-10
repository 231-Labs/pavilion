import { useState, useEffect, useCallback } from 'react';
import type { SuiClient } from '@mysten/sui/client';
import { getSceneConfiguration, SceneConfiguration, SceneObject } from '@/lib/tx/pavilion';

export interface UseKioskSceneOptions {
  suiClient: SuiClient;
  packageId: string;
  kioskId: string;
  autoLoad?: boolean;
}

export interface KioskSceneState {
  sceneConfig: SceneConfiguration | null;
  loading: boolean;
  error: string | null;
  objects: SceneObject[];
  visibleObjects: SceneObject[];
  hiddenObjects: SceneObject[];
}

export function useKioskScene(options: UseKioskSceneOptions) {
  const { suiClient, packageId, kioskId, autoLoad = true } = options;

  const [state, setState] = useState<KioskSceneState>({
    sceneConfig: null,
    loading: false,
    error: null,
    objects: [],
    visibleObjects: [],
    hiddenObjects: [],
  });

  const loadSceneConfiguration = useCallback(async () => {
    if (!suiClient || !packageId || !kioskId) {
      setState(prev => ({
        ...prev,
        error: 'Missing required parameters',
        loading: false
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const sceneConfig = await getSceneConfiguration({
        suiClient,
        packageId,
        kioskId,
      });

      const objects = sceneConfig.objects;
      const visibleObjects = objects.filter(obj => obj.visible);
      const hiddenObjects = objects.filter(obj => !obj.visible);

      setState({
        sceneConfig,
        loading: false,
        error: null,
        objects,
        visibleObjects,
        hiddenObjects,
      });

      console.log(`Loaded scene configuration for kiosk ${kioskId}:`, {
        totalObjects: objects.length,
        visibleObjects: visibleObjects.length,
        hiddenObjects: hiddenObjects.length,
        lighting: sceneConfig.lighting,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scene configuration';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      console.error('Failed to load kiosk scene:', error);
    }
  }, [suiClient, packageId, kioskId]);

  const refreshScene = useCallback(() => {
    loadSceneConfiguration();
  }, [loadSceneConfiguration]);

  // 獲取特定物件的狀態
  const getObjectStatus = useCallback((objectId: string) => {
    const object = state.objects.find(obj => obj.object_id === objectId);
    if (!object) {
      return null;
    }

    return {
      visible: object.visible,
      position: object.transform.position,
      rotation: object.transform.rotation,
      scale: object.transform.scale,
      blobId: object.blob_id,
    };
  }, [state.objects]);

  // 獲取所有可見物件的位置摘要
  const getVisibleObjectsSummary = useCallback(() => {
    return state.visibleObjects.map(obj => ({
      id: obj.object_id,
      blobId: obj.blob_id,
      position: `${obj.transform.position.x.toFixed(2)}, ${obj.transform.position.y.toFixed(2)}, ${obj.transform.position.z.toFixed(2)}`,
      scale: obj.transform.scale.toFixed(2),
    }));
  }, [state.visibleObjects]);

  // 檢查 kiosk 是否有場景配置
  const hasSceneConfiguration = useCallback(() => {
    return state.sceneConfig !== null && state.objects.length > 0;
  }, [state.sceneConfig, state.objects]);

  useEffect(() => {
    if (autoLoad) {
      loadSceneConfiguration();
    }
  }, [autoLoad, loadSceneConfiguration]);

  return {
    ...state,
    loadSceneConfiguration,
    refreshScene,
    getObjectStatus,
    getVisibleObjectsSummary,
    hasSceneConfiguration,
  };
}

// 實用函數：格式化物件位置信息
export function formatObjectPosition(obj: SceneObject): string {
  const { x, y, z } = obj.transform.position;
  return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
}

// 實用函數：格式化物件變換信息
export function formatObjectTransform(obj: SceneObject): {
  position: string;
  rotation: string;
  scale: string;
} {
  const { transform } = obj;
  return {
    position: `(${transform.position.x.toFixed(2)}, ${transform.position.y.toFixed(2)}, ${transform.position.z.toFixed(2)})`,
    rotation: `(${transform.rotation.x.toFixed(2)}, ${transform.rotation.y.toFixed(2)}, ${transform.rotation.z.toFixed(2)})`,
    scale: transform.scale.toFixed(2),
  };
}

// 實用函數：檢查物件是否在可見範圍內
export function isObjectInView(obj: SceneObject, cameraPosition: THREE.Vector3, viewDistance: number = 50): boolean {
  if (!obj.visible) return false;

  const objPosition = new THREE.Vector3(
    obj.transform.position.x,
    obj.transform.position.y,
    obj.transform.position.z
  );

  const distance = cameraPosition.distanceTo(objPosition);
  return distance <= viewDistance;
}
