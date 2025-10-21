import { Transaction } from '@mysten/sui/transactions';
import { SceneConfig } from '../../../types/scene';
import { SceneConfigManager } from '../../three/SceneConfigManager';

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
    return 'Unable to save scene configuration';
  }

  const errorMessage = error.message;

  if (errorMessage.includes('User rejected')) {
    return 'Transaction was rejected';
  } else if (errorMessage.includes('Not owner')) {
    return 'You do not have permission to modify this pavilion';
  } else if (errorMessage.includes('Dry run failed')) {
    return 'Transaction validation failed. Please try again.';
  } else if (errorMessage.includes('Insufficient gas')) {
    return 'Insufficient gas. Please ensure your wallet has enough SUI.';
  }

  return errorMessage;
}

