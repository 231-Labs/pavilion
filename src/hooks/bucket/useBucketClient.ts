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
      setError('Failed to initialize Bucket Client');
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
      setError('Failed to fetch lending positions');
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
   * Deposit collateral and borrow USDB in one transaction
   * @param collateralAmount - Collateral amount in MIST
   * @param borrowAmount - Borrow amount in USDB (6 decimals)
   */
  const depositAndBorrow = async (
    collateralAmount: number,
    borrowAmount: number
  ) => {
    if (!bucketClient) {
      throw new Error('Bucket client not initialized');
    }

    if (!currentAccount) {
      throw new Error('Please connect your wallet first');
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

      console.log('🚀 Preparing Bucket transaction...');
      console.log('Collateral amount:', collateralAmount / 1e9, 'SUI');
      console.log('Borrow amount:', borrowAmount / 1e6, 'USDB');

      // 執行交易
      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log('✅ Bucket transaction successful:', result.digest);

      // Refresh user positions
      if (currentAccount.address) {
        await fetchUserPositions(currentAccount.address);
      }

      return result;
    } catch (err: any) {
      console.error('❌ Bucket transaction failed:', err);
      const errorMessage = parseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Repay debt
   * @param repayAmount - Repay amount in USDB (6 decimals)
   */
  const repayDebt = async (repayAmount: number) => {
    if (!bucketClient) {
      throw new Error('Bucket client not initialized');
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

      console.log('✅ Repayment successful:', result.digest);

      // Refresh user positions
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
   * Withdraw collateral
   * @param withdrawAmount - Withdraw amount in MIST
   */
  const withdrawCollateral = async (withdrawAmount: number) => {
    if (!bucketClient) {
      throw new Error('Bucket client not initialized');
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

      console.log('✅ Withdrawal successful:', result.digest);

      // Refresh user positions
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
   * Get USDB token type
   */
  const getUsdbType = () => {
    if (!bucketClient) return null;
    return bucketClient.getUsdbCoinType();
  };

  /**
   * Get Vault information
   */
  const getVaultInfo = async () => {
    if (!bucketClient) return null;

    try {
      const allVaults = await bucketClient.getAllVaultObjects();
      // Return SUI vault information
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
 * Parse error messages
 */
function parseError(error: any): string {
  if (error.message) {
    if (error.message.includes('Insufficient balance')) {
      return 'Insufficient balance';
    }
    if (error.message.includes('User rejected')) {
      return 'Transaction rejected by user';
    }
    if (error.message.includes('Insufficient collateral')) {
      return 'Insufficient collateral';
    }
    if (error.message.includes('Position not found')) {
      return 'Lending position not found';
    }
    return error.message;
  }
  return 'Unknown error';
}

