# Demo NFT 2D 模組

這是一個使用最新 Sui Display 標準的基本 2D NFT 模組，提供完整的 mint 和解構功能。

## 功能特色

### 核心功能
- ✅ **鑄造 NFT**: 支援單個和批量鑄造
- ✅ **解構 NFT**: 完全銷毀 NFT
- ✅ **Sui Display 標準**: 完全相容最新的顯示標準
- ✅ **版稅系統**: 內建版稅規則和支付機制
- ✅ **屬性管理**: 動態添加和管理 NFT 屬性
- ✅ **權限控制**: 只有創作者可以修改特定屬性

### NFT 結構
```move
public struct DemoNFT2D has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    creator: address,
    attributes: vector<String>,
}
```

## 使用方法

### 1. 部署模組
```bash
sui client publish --gas-budget 100000000
```

### 2. 鑄造 NFT
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function mint \
  --args \
    "My NFT" \
    "A beautiful 2D NFT" \
    "https://example.com/image.png" \
    '["Color: Blue", "Rarity: Rare"]' \
    <RECIPIENT_ADDRESS> \
  --gas-budget 10000000
```

### 3. 批量鑄造 NFT
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function batch_mint \
  --args \
    '["NFT 1", "NFT 2"]' \
    '["First NFT", "Second NFT"]' \
    '["https://example.com/1.png", "https://example.com/2.png"]' \
    '[["Type: A"], ["Type: B"]]' \
    <RECIPIENT_ADDRESS> \
  --gas-budget 20000000
```

### 4. 銷毀 NFT
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function burn \
  --args <NFT_OBJECT_ID> \
  --gas-budget 10000000
```

### 5. 更新描述（僅創作者）
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function update_description \
  --args <NFT_OBJECT_ID> "New description" \
  --gas-budget 10000000
```

### 6. 添加屬性（僅創作者）
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function add_attribute \
  --args <NFT_OBJECT_ID> "New attribute" \
  --gas-budget 10000000
```

## Display 標準

本模組完全符合 Sui Display 標準，支援以下欄位：
- `name`: NFT 名稱
- `description`: NFT 描述
- `image_url`: 圖片 URL
- `creator`: 創作者地址
- `attributes`: 屬性列表
- `project_url`: 專案 URL

## 版稅系統

模組內建版稅系統，支援：
- 設定版稅率（以基點計算，100 = 1%）
- 自動版稅收取
- 版稅支付驗證

### 設定版稅規則
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module demo_nft_2d \
  --function add_royalty_rule \
  --args \
    <TRANSFER_POLICY_ID> \
    <POLICY_CAP_ID> \
    <CREATOR_ADDRESS> \
    500 \
  --gas-budget 10000000
```

## 查詢函數

提供完整的查詢 API：
- `get_nft_id()`: 獲取 NFT ID
- `get_name()`: 獲取名稱
- `get_description()`: 獲取描述
- `get_image_url()`: 獲取圖片 URL
- `get_creator()`: 獲取創作者地址
- `get_attributes()`: 獲取屬性列表
- `get_attributes_count()`: 獲取屬性數量

## 測試

執行測試：
```bash
sui move test
```

測試涵蓋：
- ✅ 模組初始化
- ✅ 單個 NFT 鑄造
- ✅ 批量 NFT 鑄造
- ✅ NFT 銷毀
- ✅ 描述更新
- ✅ 屬性添加
- ✅ 權限驗證

## 安全特性

- **權限控制**: 只有創作者可以修改 NFT 屬性
- **輸入驗證**: 批量操作時驗證陣列長度一致性
- **錯誤處理**: 適當的錯誤代碼和斷言
- **資源管理**: 正確的物件生命週期管理

## 開發注意事項

1. 使用 `entry` 函數而非 `public entry` 以提高組合性
2. 遵循 Sui Move 編程慣例
3. 適當使用 `#[allow(lint(share_owned))]` 註解
4. 完整的測試覆蓋率

## 授權

此模組為開源專案，可自由使用和修改。
