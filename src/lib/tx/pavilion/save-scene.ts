import { Transaction } from '@mysten/sui/transactions';
import { SceneConfig } from '../../types/scene';
import { SceneConfigManager } from '../three/SceneConfigManager';

/**
 * Parameters for save scene transaction
 */
export interface SaveSceneParams {
  sceneConfig: SceneConfig;
  kioskId: string;
  kioskOwnerCapId: string;
  sceneConfigManager: SceneConfigManager;
}

/**
 * Result of save scene transaction
 */
export interface SaveSceneResult {
  transaction: Transaction;
  config: SceneConfig;
  stats: {
    totalObjects: number;
    displayedObjects: number;
  };
}

/**
 * Build a transaction to save scene configuration to blockchain
 * 
 * @param params - Save scene parameters
 * @returns Transaction with scene save operation
 */
export function buildSaveSceneTx(params: SaveSceneParams): SaveSceneResult {
  const { sceneConfig, kioskId, kioskOwnerCapId, sceneConfigManager } = params;

  // Create transaction using scene manager
  const transaction = sceneConfigManager.createSaveTransaction(
    sceneConfig,
    kioskId,
    kioskOwnerCapId
  );

  // Get scene statistics
  const stats = sceneConfigManager.getSceneStats(sceneConfig);

  return {
    transaction,
    config: sceneConfig,
    stats: {
      totalObjects: stats.totalObjects,
      displayedObjects: stats.displayedObjects,
    },
  };
}

/**
 * Parse error messages from save scene transactions
 * @param error - Error object from transaction execution
 * @returns Formatted error message
 */
export function parseSaveSceneError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '無法保存場景配置';
  }

  const errorMessage = error.message;

  if (errorMessage.includes('User rejected')) {
    return '交易已被拒絕';
  } else if (errorMessage.includes('Not owner')) {
    return '您沒有權限修改此展館';
  } else if (errorMessage.includes('Dry run failed')) {
    return '交易驗證失敗，請重試';
  } else if (errorMessage.includes('Insufficient gas')) {
    return 'Gas 不足，請確保錢包有足夠的 SUI';
  }

  return errorMessage;
}

