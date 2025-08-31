## 🏗️ 專案架構總結

### 📁 **文件結構概覽**

```
dev_poc/
├── 📄 package.json             # 專案依賴和腳本
├── 📄 tsconfig.json            # TypeScript 配置  
├── 📄 next.config.ts           # Next.js 配置
├── 📁 src/
│   ├── 📁 app/                 # Next.js App Router
│   │   ├── 📄 layout.tsx       # 根佈局 + DappKit 設置
│   │   └── 📄 page.tsx         # 主頁面 (3D場景 + 錢包UI)
│   ├── 📁 components/          # React 組件
│   │   ├── 📄 Providers.tsx    # DappKit 提供者包裝
│   │   └── 📄 SculptureControlPanel.tsx  # 雕塑控制面板
│   ├── 📁 hooks/               # 自定義 React Hooks  
│   │   └── 📄 useThreeScene.ts # Three.js 場景管理整合
│   ├── 📁 lib/                 # 核心業務邏輯
│   │   └── 📁 three/
│   │       └── 📄 SceneManager.ts  # Three.js 核心管理類
│   └── 📁 types/               # TypeScript 型別定義
│       └── 📄 sculpture.ts     # 雕塑系統型別
```

### 🎯 **各文件用途詳解**

#### **1. 應用程序入口層**
- **`app/layout.tsx`**: 設置 DappKit Providers、全局樣式
- **`app/page.tsx`**: 主頁面，整合 3D 場景和錢包功能

#### **2. 組件層** 
- **`components/Providers.tsx`**: 解決 Next.js 15 服務器組件 Context 問題
- **`components/SculptureControlPanel.tsx`**: 雕塑位置/旋轉/縮放控制 UI

#### **3. Hook 整合層**
- **`hooks/useThreeScene.ts`**: 將 Three.js 與 React 生命週期整合

#### **4. 核心業務邏輯層**
- **`lib/three/SceneManager.ts`**: Three.js 場景管理核心類，包含所有 3D 邏輯

#### **5. 型別定義層**
- **`types/sculpture.ts`**: 雕塑系統的完整型別體系

### 🔧 **技術棧**

**前端框架**: Next.js 15 + React 19 + TypeScript  
**3D 圖形**: Three.js  
**區塊鏈**: Sui DappKit + Sui SDK  
**樣式**: Tailwind CSS  
**狀態管理**: React Query

### 🎨 **核心功能**

1. **3D 虛擬展廳**: 地板、牆壁、燈光系統
2. **動態雕塑管理**: 5種雕塑類型，實時位置/旋轉/縮放調整  
3. **Sui 錢包整合**: 多錢包支援、交易功能
4. **響應式控制面板**: 直觀的雕塑操作界面

### 📈 **架構優勢**

✅ **模組化設計**: 清晰的關注點分離  
✅ **可重用性**: Hook 和組件可在其他項目重用  
✅ **型別安全**: 完整 TypeScript 覆蓋  
✅ **性能優化**: 記憶體管理和資源清理  
✅ **可擴展性**: 易於添加新雕塑類型和功能