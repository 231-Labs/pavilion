import type { KioskClient } from '@mysten/kiosk';
import type { TransferPolicyRule } from '@mysten/kiosk';

/**
 * Register a RoyaltyRule resolver for a specific NFT type
 * This allows the Kiosk SDK to automatically handle royalty payments during purchases
 */
export function registerRoyaltyResolver(kioskClient: KioskClient, itemType: string): void {
  // Extract package ID and module name from itemType
  // itemType format: packageId::moduleName::TypeName
  const parts = itemType.split('::');
  if (parts.length !== 3) {
    console.error('Invalid itemType format:', itemType);
    return;
  }
  
  const [packageId, moduleName] = parts;
  const ruleType = `${packageId}::${moduleName}::RoyaltyRule`;
  
  // Check if resolver already exists
  const existingResolver = kioskClient.rules.find((r: TransferPolicyRule) => r.rule === ruleType);
  if (existingResolver) {
    console.log('ℹ️ RoyaltyRule resolver already registered for:', ruleType);
    return;
  }
  
  // Define the RoyaltyRule resolver
  const royaltyRuleResolver: TransferPolicyRule = {
    rule: ruleType,
    packageId: packageId,
    resolveRuleFunction: (params: any) => {
      const { transaction, itemType, transferRequest, policyId, price } = params;
      
      console.log('🔧 Resolving RoyaltyRule:', { itemType, price, policyId });
      
      // Extract package and module info from itemType
      const [pkg, mod] = itemType.split('::');
      
      // Convert policyId string to object reference
      const policyObj = transaction.object(policyId);

      // Call calculate_royalty to get the exact royalty amount from chain config
      const [royaltyAmount] = transaction.moveCall({
        target: `${pkg}::${mod}::calculate_royalty`,
        arguments: [
          policyObj,                   // &TransferPolicy
          transaction.pure.u64(price), // price: u64
        ],
      });

      console.log('💰 Calculating royalty from chain config for', `${pkg}::${mod}`);

      // Split coin for royalty payment
      const royaltyCoin = transaction.splitCoins(transaction.gas, [royaltyAmount]);

      // Call pay_royalty_and_add_receipt function
      transaction.moveCall({
        target: `${pkg}::${mod}::pay_royalty_and_add_receipt`,
        arguments: [
          policyObj,        // &TransferPolicy
          transferRequest,  // &mut TransferRequest
          royaltyCoin,      // Coin<SUI> for royalty payment
        ],
      });
      
      console.log('✅ RoyaltyRule resolved for', `${pkg}::${mod}`);
    },
  };

  // Add the resolver to kioskClient
  try {
    kioskClient.addRuleResolver(royaltyRuleResolver);
    console.log('✅ RoyaltyRule resolver registered:', ruleType);
  } catch (error) {
    console.error('Failed to register RoyaltyRule resolver:', error);
  }
}

/**
 * Convert MIST to SUI
 */
export function mistToSui(mistAmount: string | number): number {
  const MIST_TO_SUI = 1000000000;
  const mist = typeof mistAmount === 'string' ? parseFloat(mistAmount) : mistAmount;
  return mist / MIST_TO_SUI;
}

/**
 * Convert SUI to MIST
 */
export function suiToMist(suiAmount: string | number): string {
  const MIST_TO_SUI = 1000000000;
  const sui = typeof suiAmount === 'string' ? parseFloat(suiAmount) : suiAmount;
  return Math.floor(sui * MIST_TO_SUI).toString();
}

