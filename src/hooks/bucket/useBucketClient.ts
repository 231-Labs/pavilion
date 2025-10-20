import { useState, useEffect } from 'react';
import { BucketClient } from 'bucket-protocol-sdk';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export interface BucketPosition {
  collateralType: string;
  collateralAmount: bigint;
  debtAmount: bigint;
  debtor: string;
  rewards?: Record<string, bigint>;
}

export function useBucketClient() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [bucketClient, setBucketClient] = useState<BucketClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<BucketPosition[]>([]);

  // 初始化 Bucket Client
  useEffect(() => {
    try {
      const client = new BucketClient({
        suiClient,
        network: 'testnet', // 使用測試網
      });
      setBucketClient(client);
    } catch (err) {
      console.error('Failed to initialize Bucket Client:', err);
      setError('無法初始化 Bucket 客戶端');
    }
  }, [suiClient]);

  // 查詢用戶借貸位置
  const fetchUserPositions = async (address?: string) => {
    if (!bucketClient || !address) return;

    try {
      setIsLoading(true);
      const userPositions = await bucketClient.getUserPositions({ address });
      setPositions(userPositions || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user positions:', err);
      setError('無法查詢借貸位置');
    } finally {
      setIsLoading(false);
    }
  };

  // 自動查詢當前用戶的位置
  useEffect(() => {
    if (currentAccount?.address) {
      fetchUserPositions(currentAccount.address);
    }
  }, [currentAccount?.address, bucketClient]);

  /**
   * 一鍵抵押並借款
   * @param collateralAmount - 抵押金額（MIST）
   * @param borrowAmount - 借款金額（USDB，6 decimals）
   */
  const depositAndBorrow = async (
    collateralAmount: number,
    borrowAmount: number
  ) => {
    if (!bucketClient) {
      throw new Error('Bucket 客戶端未初始化');
    }

    if (!currentAccount) {
      throw new Error('請先連接錢包');
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = new Transaction();

      // 構建管理位置交易
      await bucketClient.buildManagePositionTransaction(tx, {
        coinType: '0x2::sui::SUI',
        depositCoinOrAmount: collateralAmount,
        borrowAmount: borrowAmount,
      });

      console.log('🚀 準備執行 Bucket 交易...');
      console.log('抵押金額:', collateralAmount / 1e9, 'SUI');
      console.log('借款金額:', borrowAmount / 1e6, 'USDB');

      // 執行交易
      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ Bucket 交易成功:', result.digest);

      // 刷新用戶位置
      if (currentAccount.address) {
        await fetchUserPositions(currentAccount.address);
      }

      return result;
    } catch (err: any) {
      console.error('❌ Bucket 交易失敗:', err);
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 還款
   * @param repayAmount - 還款金額（USDB，6 decimals）
   */
  const repayDebt = async (repayAmount: number) => {
    if (!bucketClient) {
      throw new Error('Bucket 客戶端未初始化');
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = new Transaction();

      await bucketClient.buildManagePositionTransaction(tx, {
        coinType: '0x2::sui::SUI',
        repayCoinOrAmount: repayAmount,
      });

      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ 還款成功:', result.digest);

      // 刷新用戶位置
      if (currentAccount?.address) {
        await fetchUserPositions(currentAccount.address);
      }

      return result;
    } catch (err: any) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 提取抵押品
   * @param withdrawAmount - 提取金額（MIST）
   */
  const withdrawCollateral = async (withdrawAmount: number) => {
    if (!bucketClient) {
      throw new Error('Bucket 客戶端未初始化');
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = new Transaction();

      await bucketClient.buildManagePositionTransaction(tx, {
        coinType: '0x2::sui::SUI',
        withdrawAmount: withdrawAmount,
      });

      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ 提取成功:', result.digest);

      // 刷新用戶位置
      if (currentAccount?.address) {
        await fetchUserPositions(currentAccount.address);
      }

      return result;
    } catch (err: any) {
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 獲取 USDB 代幣類型
   */
  const getUsdbType = () => {
    if (!bucketClient) return null;
    return bucketClient.getUsdbCoinType();
  };

  /**
   * 獲取 Vault 資訊
   */
  const getVaultInfo = async () => {
    if (!bucketClient) return null;

    try {
      const allVaults = await bucketClient.getAllVaultObjects();
      // 返回 SUI vault 的資訊
      return allVaults['0x2::sui::SUI'] || null;
    } catch (err) {
      console.error('Failed to fetch vault info:', err);
      return null;
    }
  };

  return {
    bucketClient,
    isLoading,
    error,
    positions,
    depositAndBorrow,
    repayDebt,
    withdrawCollateral,
    fetchUserPositions,
    getUsdbType,
    getVaultInfo,
  };
}

/**
 * 解析錯誤訊息
 */
function parseError(error: any): string {
  if (error.message) {
    if (error.message.includes('Insufficient balance')) {
      return '餘額不足';
    }
    if (error.message.includes('User rejected')) {
      return '用戶取消交易';
    }
    if (error.message.includes('Insufficient collateral')) {
      return '抵押品不足';
    }
    if (error.message.includes('Position not found')) {
      return '未找到借貸位置';
    }
    return error.message;
  }
  return '未知錯誤';
}

