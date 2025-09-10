import React from 'react';
import { useKioskScene, formatObjectPosition, formatObjectTransform, isObjectInView } from '@/hooks/useKioskScene';
import type { SuiClient } from '@mysten/sui/client';
import * as THREE from 'three';

interface KioskSceneViewerProps {
  suiClient: SuiClient;
  packageId: string;
  kioskId: string;
}

/**
 * Kiosk 場景查看器組件 - 展示 kiosk 中所有物件的狀態和位置信息
 */
export function KioskSceneViewer({ suiClient, packageId, kioskId }: KioskSceneViewerProps) {
  const {
    sceneConfig,
    loading,
    error,
    objects,
    visibleObjects,
    hiddenObjects,
    getObjectStatus,
    getVisibleObjectsSummary,
    hasSceneConfiguration,
    refreshScene,
  } = useKioskScene({
    suiClient,
    packageId,
    kioskId,
  });

  if (loading) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        <div className="text-white">載入場景配置中...</div>
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900 rounded-lg">
        <div className="text-white font-semibold">載入失敗</div>
        <div className="text-red-300 mt-1">{error}</div>
        <button
          onClick={refreshScene}
          className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm"
        >
          重試
        </button>
      </div>
    );
  }

  if (!hasSceneConfiguration()) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="text-white">此 Kiosk 尚未配置場景</div>
        <div className="text-gray-400 text-sm mt-1">
          Kiosk ID: {kioskId}
        </div>
        <button
          onClick={refreshScene}
          className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          重新檢查
        </button>
      </div>
    );
  }

  const visibleSummary = getVisibleObjectsSummary();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Kiosk 場景配置</h2>
        <button
          onClick={refreshScene}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 場景統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{visibleObjects.length}</div>
          <div className="text-gray-300">可見物件</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-400">{hiddenObjects.length}</div>
          <div className="text-gray-300">隱藏物件</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{objects.length}</div>
          <div className="text-gray-300">總物件數</div>
        </div>
      </div>

      {/* 燈光配置 */}
      {sceneConfig?.lighting && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">燈光配置</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">環境光:</span>
              <div className="text-white">
                顏色: #{sceneConfig.lighting.ambient_light_color.toString(16)}
              </div>
              <div className="text-white">
                強度: {sceneConfig.lighting.ambient_light_intensity.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-400">方向光:</span>
              <div className="text-white">
                位置: ({sceneConfig.lighting.directional_light_x.toFixed(1)}, {sceneConfig.lighting.directional_light_y.toFixed(1)}, {sceneConfig.lighting.directional_light_z.toFixed(1)})
              </div>
              <div className="text-white">
                顏色: #{sceneConfig.lighting.directional_light_color.toString(16)}
              </div>
              <div className="text-white">
                強度: {sceneConfig.lighting.directional_light_intensity.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 可見物件列表 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">可見物件 ({visibleObjects.length})</h3>
        <div className="space-y-3">
          {visibleObjects.map((obj) => (
            <ObjectCard key={obj.object_id} object={obj} />
          ))}
        </div>
      </div>

      {/* 隱藏物件列表 */}
      {hiddenObjects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-400 mb-3">隱藏物件 ({hiddenObjects.length})</h3>
          <div className="space-y-3">
            {hiddenObjects.map((obj) => (
              <ObjectCard key={obj.object_id} object={obj} />
            ))}
          </div>
        </div>
      )}

      {/* 詳細資訊 */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">場景摘要</h3>
        <div className="text-gray-300 text-sm space-y-1">
          <div>Kiosk ID: <span className="font-mono text-blue-400">{kioskId}</span></div>
          <div>Package ID: <span className="font-mono text-blue-400">{packageId}</span></div>
          <div>總物件數: {objects.length}</div>
          <div>可見物件: {visibleObjects.length}</div>
          <div>隱藏物件: {hiddenObjects.length}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 單個物件信息卡片
 */
function ObjectCard({ object }: { object: any }) {
  const transform = formatObjectTransform(object);
  const status = getObjectStatus ? getObjectStatus(object.object_id) : null;

  return (
    <div className={`p-4 rounded-lg border ${object.visible ? 'bg-gray-800 border-gray-600' : 'bg-red-900/20 border-red-600'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium text-white">
          物件 ID: {object.object_id.slice(0, 8)}...
        </div>
        <div className={`px-2 py-1 rounded text-xs ${object.visible ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {object.visible ? '可見' : '隱藏'}
        </div>
      </div>

      <div className="text-sm text-gray-300 space-y-1">
        <div>Blob ID: <span className="font-mono text-blue-400">{object.blob_id.slice(0, 8)}...</span></div>
        <div>位置: <span className="font-mono text-green-400">{transform.position}</span></div>
        <div>縮放: <span className="font-mono text-yellow-400">{transform.scale}</span></div>
        <div>旋轉: <span className="font-mono text-purple-400">{transform.rotation}</span></div>
      </div>
    </div>
  );
}

/**
 * 簡單的物件狀態檢查函數（模擬）
 */
function getObjectStatus(objectId: string) {
  // 這裡可以實現更複雜的狀態檢查邏輯
  return {
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    blobId: objectId,
  };
}

export default KioskSceneViewer;
