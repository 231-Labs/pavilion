# Bucket Protocol 整合說明

## 🎯 功能概述

此分支實現了「一鍵將 Kiosk Profits 抵押到 Bucket 借出 USDB」的功能，讓 Pavilion 用戶可以輕鬆地將 NFT 銷售利潤轉換為可用的穩定幣（USDB）。

## 📦 已安裝套件

```bash
npm install bucket-protocol-sdk
```

版本：`1.0.3`

## 🏗️ 架構設計

### 1. useBucketClient Hook (`src/hooks/bucket/useBucketClient.ts`)

自訂 React Hook，封裝所有 Bucket Protocol 互動邏輯：

**核心功能**：
- ✅ 初始化 BucketClient（自動連接到測試網）
- ✅ 查詢用戶借貸位置（positions）
- ✅ 存入抵押品並借款（`depositAndBorrow`）
- ✅ 還款（`repayDebt`）
- ✅ 提取抵押品（`withdrawCollateral`）
- ✅ 獲取 USDB 代幣類型和 Vault 資訊

**返回值**：
```typescript
{
  bucketClient: BucketClient | null,
  isLoading: boolean,
  error: string | null,
  positions: BucketPosition[],
  depositAndBorrow: (collateral, borrow) => Promise<Result>,
  repayDebt: (amount) => Promise<Result>,
  withdrawCollateral: (amount) => Promise<Result>,
  fetchUserPositions: (address) => Promise<void>,
  getUsdbType: () => string | null,
  getVaultInfo: () => Promise<VaultInfo | null>
}
```

### 2. WalletTerminal 整合 (`src/components/panels/WalletTerminal.tsx`)

**新增功能**：

#### A. 「Deposit to Bucket → Borrow USDB」按鈕
- 位置：原先的「Save to PavSUI」按鈕位置
- 樣式：紫藍漸變背景，顯示 Bucket 品牌色
- 狀態：
  - 正常：顯示「Deposit to Bucket → Borrow USDB」
  - 處理中：顯示載入動畫
  - 成功：顯示「Success! USDB Borrowed」
  - 禁用條件：無 profits、正在處理中、Bucket 載入中

#### B. Bucket Lending Position 顯示區域
- 自動顯示用戶的 Bucket 借貸位置（如果有）
- 顯示內容：
  - Collateral（抵押品）：X.XXXX SUI
  - Debt（債務）：X.XX USDB
- 樣式：紫色邊框和背景，與 Bucket 按鈕一致

#### C. 交易流程（`handleDepositToBucket`）

**兩步驟流程**：

1. **Step 1: 提取 Kiosk Profits**
   ```typescript
   const { transaction: withdrawTx } = await buildWithdrawProfitsTx({
     kioskClient,
     kioskId,
     kioskOwnerCapId,
     ownerAddress: currentAccount.address,
   });
   await signAndExecuteTransaction({ transaction: withdrawTx });
   ```

2. **Step 2: 抵押並借款**
   ```typescript
   await depositAndBorrow(profitsInMist, borrowAmountUsdb);
   ```

**借款金額計算**：
```typescript
// 假設抵押率 200%（保守估計）
// 1 SUI = 1e9 MIST, 1 USDB = 1e6
const borrowAmountUsdb = Math.floor(profitsInMist / 2000);
```

**安全檢查**：
- ✅ 檢查是否連接錢包
- ✅ 檢查是否有 profits 可提取
- ✅ 最低借款限制：2 SUI（可借出 1 USDB）
- ✅ 錯誤處理和用戶提示

## 🧪 測試步驟

### 前置條件

1. 切換到測試網環境
2. 錢包中有足夠的測試網 SUI
3. 已創建 Pavilion 並有 NFT 銷售利潤

### 測試流程

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **進入 Manage 模式**：
   - 訪問 `http://localhost:3000/manage`
   - 連接錢包並選擇您的 Kiosk

3. **測試借款功能**：
   - 確認 Kiosk 有 profits（在 Wallet Terminal 中顯示）
   - 點擊「Deposit to Bucket → Borrow USDB」按鈕
   - 確認兩次交易（提取 + 借款）
   - 查看成功訊息和更新的餘額

4. **查看借貸位置**：
   - 在 Wallet Terminal 中自動顯示「Bucket Lending Position」區域
   - 確認抵押品和債務金額正確

5. **測試錯誤情境**：
   - 無 profits 時按鈕應該被禁用
   - profits 少於 2 SUI 時應顯示錯誤訊息

## 🔧 關鍵參數配置

### 網路設定
```typescript
// src/hooks/bucket/useBucketClient.ts:27
const client = new BucketClient({
  suiClient,
  network: 'testnet', // 改為 'mainnet' 用於生產環境
});
```

### 抵押率計算
```typescript
// src/components/panels/WalletTerminal.tsx:346
const borrowAmountUsdb = Math.floor(profitsInMist / 2000); // 200% 抵押率
```

**調整建議**：
- 更保守：`profitsInMist / 2500`（250% 抵押率）
- 更激進：`profitsInMist / 1667`（167% 抵押率，需確認 Bucket 最低要求）

### 最低借款限制
```typescript
// src/components/panels/WalletTerminal.tsx:348
if (borrowAmountUsdb < 1000000) { // 1 USDB
  setError('Profits too low to borrow USDB (minimum 2 SUI required)');
}
```

## 📊 交易示例

**情境**：用戶有 10 SUI 的 Kiosk profits

1. **提取交易**：
   - 從 Kiosk 提取 10 SUI 到錢包
   - Gas fee: ~0.001 SUI

2. **Bucket 交易**：
   - 抵押：10,000,000,000 MIST（10 SUI）
   - 借款：5,000,000 USDB（5 USDB）
   - Gas fee: ~0.002 SUI

3. **結果**：
   - 錢包餘額：+5 USDB（可用於購買 NFT）
   - Bucket 位置：
     - Collateral: 10 SUI
     - Debt: 5 USDB

## ⚠️ 已知限制和注意事項

1. **測試網限制**：
   - Bucket Protocol 可能在測試網上有不同的配置
   - 價格預言機可能不穩定

2. **交易延遲**：
   - 兩步驟交易之間有 2 秒延遲，確保第一筆交易確認
   - 可能需要根據網路狀況調整

3. **清算風險**：
   - 如果 SUI 價格下跌，抵押率可能低於最低要求
   - 建議用戶定期檢查借貸位置

4. **錯誤處理**：
   - Bucket SDK 的錯誤訊息可能不夠詳細
   - 已添加基本錯誤解析，但可能需要更多情境

## 🚀 後續優化建議

1. **動態抵押率**：
   - 從 Bucket Vault 查詢實時最低抵押率
   - 根據市場狀況自動調整借款金額

2. **一鍵還款**：
   - 添加「Repay All」按鈕
   - 自動計算需要還款的 USDB 數量

3. **健康因子顯示**：
   - 計算並顯示位置的健康因子
   - 當接近清算時發出警告

4. **批次操作**：
   - 將提取和借款合併為單一交易（使用 PTB）
   - 減少 gas 費用和用戶互動次數

5. **USDB 直接購買**：
   - 整合到 NFT 購買流程
   - 允許用戶直接使用借出的 USDB 購買 NFT

## 📝 提交訊息

```
feat: 整合 Bucket Protocol SDK - 一鍵將 Kiosk Profits 抵押借出 USDB

- 安裝 bucket-protocol-sdk
- 創建 useBucketClient hook 處理借貸邏輯
- 在 WalletTerminal 中替換 'Save to PavSUI' 按鈕為 'Deposit to Bucket' 功能
- 添加 Bucket lending position 顯示區域
- 實現兩步驟流程：提取 Kiosk profits -> 抵押到 Bucket 借出 USDB
- 支持自動計算借款金額（基於 200% 抵押率）
```

## 🔗 相關資源

- [Bucket Protocol SDK](https://github.com/Bucket-Protocol/bucket-protocol-sdk)
- [Bucket Protocol 文檔](https://docs.bucketprotocol.io/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)

## 👥 聯絡方式

如有問題或建議，請聯繫開發團隊。

---

**分支名稱**：`feature/bucket-integration`  
**最後更新**：2025-10-20  
**狀態**：✅ 開發完成，待測試

