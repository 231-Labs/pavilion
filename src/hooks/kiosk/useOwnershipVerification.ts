import { useState, useCallback } from 'react';
import { useSignPersonalMessage, useCurrentAccount } from '@mysten/dapp-kit';

interface VerificationResult {
  verified: boolean;
  signature?: string;
  error?: string;
}

/**
 * Hook for verifying kiosk ownership through wallet signature
 * 
 * This hook generates a challenge message and asks the user to sign it
 * to prove they own the wallet address that owns the kiosk.
 */
export function useOwnershipVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const currentAccount = useCurrentAccount();

  /**
   * Generate a challenge message for the user to sign
   */
  const generateChallengeMessage = useCallback((kioskId: string): string => {
    const timestamp = Date.now();
    const message = `Pavilion Ownership Verification\n\nKiosk ID: ${kioskId}\nTimestamp: ${timestamp}\n\nPlease sign this message to prove you own this kiosk.`;
    return message;
  }, []);

  /**
   * Convert string to Uint8Array for signing
   */
  const stringToBytes = (str: string): Uint8Array => {
    return new TextEncoder().encode(str);
  };

  /**
   * Verify ownership by requesting wallet signature
   * 
   * @param kioskId - The kiosk ID to verify ownership for
   * @param expectedOwnerAddress - Optional expected owner address to validate against
   * @returns Promise<VerificationResult>
   */
  const verifyOwnership = useCallback(async (
    kioskId: string,
    expectedOwnerAddress?: string
  ): Promise<VerificationResult> => {
    if (!currentAccount) {
      const error = 'Please connect your wallet first';
      setVerificationResult({ verified: false, error });
      return { verified: false, error };
    }

    // If expectedOwnerAddress is provided, check if current account matches
    if (expectedOwnerAddress && currentAccount.address !== expectedOwnerAddress) {
      const error = 'Connected wallet does not match kiosk owner';
      setVerificationResult({ verified: false, error });
      return { verified: false, error };
    }

    setIsVerifying(true);
    setVerificationResult(null);

    const message = generateChallengeMessage(kioskId);
    
    return signPersonalMessage({
      message: stringToBytes(message),
    })
      .then((result) => {
        const verificationSuccess: VerificationResult = {
          verified: true,
          signature: result.signature,
        };
        setVerificationResult(verificationSuccess);
        setIsVerifying(false);
        return verificationSuccess;
      })
      .catch((error) => {
        let errorMessage = 'Signature verification failed';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        const verificationFailure: VerificationResult = {
          verified: false,
          error: errorMessage,
        };

        setVerificationResult(verificationFailure);
        setIsVerifying(false);
        return verificationFailure;
      });
  }, [currentAccount, generateChallengeMessage, signPersonalMessage]);

  /**
   * Clear verification state
   */
  const clearVerification = useCallback(() => {
    setVerificationResult(null);
    setIsVerifying(false);
  }, []);

  return {
    verifyOwnership,
    isVerifying,
    verificationResult,
    clearVerification,
  };
}

