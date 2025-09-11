# 3D 場景配置系統文檔

## 概述

本系統提供了一個統一的 JSON 數據結構來描述和管理 3D 場景，支援將場景配置保存到區塊鏈並重建場景。

## 核心組件

### 1. 數據結構 (`/src/types/scene.ts`)

#### SceneConfig
完整的場景配置，包含：
- 版本號、創建/更新時間戳
- 場景中所有對象的配置
- 相機設置
- 環境設置（光照、背景等）
- 元數據（Kiosk ID、創建者等）

#### SceneObject
單個 3D 對象的配置：
```typescript
interface SceneObject {
  id: string;                    // 對象唯一 ID（通常是 NFT objectId）
  name: string;                  // 對象名稱
  type: 'kiosk_nft' | 'external_model' | 'sculpture' | 'walrus_blob';
  displayed: boolean;            // 是否顯示
  position: Vector3;             // 世界坐標位置
  rotation: Vector3;             // 旋轉（弧度）
  scale: number;                 // 統一縮放係數
  resource?: {                   // 可選：模型資源
    blobId?: string;             // Walrus blob ID
    url?: string;                // 直接模型 URL
    format?: 'glb' | 'gltf' | 'obj' | 'stl';
  };
  updatedAt: number;             // 最後更新時間
}
```

### 2. 場景配置管理器 (`/src/lib/scene/SceneConfigManager.ts`)

統一處理場景的保存、加載、重建邏輯：

#### 主要方法
- `createSceneConfigFromKioskItems()` - 從 Kiosk 項目創建場景配置
- `captureCurrentSceneState()` - 捕獲當前 3D 場景狀態
- `loadSceneConfig()` - 從鏈上讀取場景配置
- `createSaveTransaction()` - 創建保存場景配置的交易
- `applySceneConfig()` - 將場景配置應用到 3D 場景

#### 使用示例
```typescript
const manager = new SceneConfigManager({
  kioskClient,
  suiClient,
  packageId: 'YOUR_PACKAGE_ID',
  sceneManager: threeJsSceneManager
});

// 創建場景配置
const config = manager.createSceneConfigFromKioskItems(kioskItems);

// 保存到鏈上
const tx = manager.createSaveTransaction(config, kioskId, kioskOwnerCapId);

// 從鏈上加載並應用
const savedConfig = await manager.loadSceneConfig(kioskId);
if (savedConfig) {
  manager.applySceneConfig(savedConfig, kioskItems);
}
```

## 數據流程

### 1. 場景初始化
```
Kiosk Items → createSceneConfigFromKioskItems() → SceneConfig
```

### 2. 場景狀態捕獲
```
3D Scene + Base Config → captureCurrentSceneState() → Updated SceneConfig
```

### 3. 保存到鏈上
```
SceneConfig → JSON.stringify() → setSceneConfigTx() → 鏈上儲存
```

### 4. 從鏈上重建
```
鏈上 JSON → loadSceneConfig() → SceneConfig → applySceneConfig() → 3D Scene
```

## JSON 格式示例

### 💰 鏈上儲存格式（精簡版，節省 gas）

為了降低鏈上儲存的 gas 成本，系統使用壓縮格式儲存：

```json
{
  "v": 1,
  "o": [
    {
      "i": "0x123...789",
      "n": "馬雕塑 NFT",
      "d": 1,
      "p": [0, 2, 0],
      "r": [0, 1.57, 0],
      "s": 1.5,
      "b": "walrus_blob_id_here"
    }
  ],
  "t": 1672531800000,
  "k": "0xabc...def"
}
```

#### 壓縮格式字段說明：
- `v` = version
- `o` = objects
- `i` = id
- `n` = name
- `d` = displayed (0=false, 1=true)
- `p` = position [x, y, z]
- `r` = rotation [x, y, z]
- `s` = scale
- `b` = blobId
- `u` = url
- `f` = format (預設為 'glb'，只在非 glb 時儲存)
- `t` = updatedAt timestamp
- `k` = kioskId

### 📄 完整格式（僅在內部使用）

在內部處理時使用完整的結構，但不直接儲存到鏈上：

```json
{
  "version": 1,
  "name": "我的展館",
  "createdAt": 1672531200000,
  "updatedAt": 1672531800000,
  "objects": [
    {
      "id": "0x123...789",
      "name": "馬雕塑 NFT",
      "type": "walrus_blob",
      "displayed": true,
      "position": { "x": 0, "y": 2, "z": 0 },
      "rotation": { "x": 0, "y": 1.57, "z": 0 },
      "scale": 1.5,
      "resource": {
        "blobId": "walrus_blob_id_here",
        "format": "glb"
      },
      "updatedAt": 1672531800000
    }
  ],
  "camera": {
    "position": { "x": 0, "y": 1, "z": 20 },
    "target": { "x": 0, "y": 0, "z": 0 },
    "fov": 75,
    "near": 0.1,
    "far": 1000
  },
  "environment": {
    "backgroundColor": 1710618,
    "ambientLightIntensity": 0.6,
    "directionalLightIntensity": 1.0,
    "directionalLightPosition": { "x": 5, "y": 10, "z": 5 },
    "enableShadows": true,
    "showGallery": true
  },
  "metadata": {
    "kioskId": "0xabc...def",
    "creator": "0x456...abc",
    "description": "3D 場景配置 - 包含 3 個對象",
    "tags": ["3d", "nft", "pavilion"]
  }
}
```

### 📈 空間節省效果

以您提供的示例為例：
- **原始大小**: ~800 字節
- **壓縮後**: ~200 字節  
- **節省**: 約 75%

這意味著 gas 成本也會降低約 75%！

## 集成方式

### 在 Pavilion 頁面中使用
```typescript
// 初始化管理器
const [sceneConfigManager, setSceneConfigManager] = useState<SceneConfigManager | null>(null);

useEffect(() => {
  if (kioskClient && suiClient && sceneManager) {
    const manager = new SceneConfigManager({
      kioskClient,
      suiClient,
      packageId: PAVILION_PACKAGE_ID,
      sceneManager,
    });
    setSceneConfigManager(manager);
  }
}, [kioskClient, suiClient, sceneManager]);

// 從 Kiosk 項目創建配置
const config = sceneConfigManager.createSceneConfigFromKioskItems(
  kioskItems,
  kioskId,
  currentAccount?.address
);

// 加載並應用保存的配置
const loadAndApplyConfig = async () => {
  const savedConfig = await sceneConfigManager.loadSceneConfig(kioskId);
  if (savedConfig) {
    sceneConfigManager.applySceneConfig(savedConfig, kioskItems);
  }
};
```

### 在錢包組件中保存
```typescript
// 捕獲當前場景狀態
const updatedConfig = sceneConfigManager.captureCurrentSceneState(
  currentSceneConfig,
  kioskItems
);

// 創建保存交易
const transaction = sceneConfigManager.createSaveTransaction(
  updatedConfig,
  kioskId,
  kioskOwnerCapId
);
```

## 優勢

1. **統一的數據結構** - 所有場景信息都在一個 JSON 中
2. **類型安全** - 完整的 TypeScript 類型定義
3. **鏈上儲存** - 去中心化的場景配置儲存
4. **自動重建** - 可完整重建 3D 場景的所有狀態
5. **版本控制** - 支援配置版本管理
6. **元數據支援** - 包含創建者、描述、標籤等信息
7. **💰 Gas 優化** - 壓縮儲存格式節省 70-80% 的 gas 成本
8. **向後相容** - 自動識別與轉換舊格式配置

## 注意事項

1. **壓縮儲存**：為節省 gas，在鏈上使用簡化格式，內部自動轉換
2. **向後相容**：支援讀取舊格式配置，但新儲存都用精簡格式
3. **精度問題**：浮點數會被序列化，可能有輕微精度損失
4. **異步加載**：模型可能需要時間加載，場景重建使用重試機制
5. **類型檢查**：從鏈上讀取的數據會自動驗證並轉換格式
