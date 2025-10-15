import { KioskClient } from '@mysten/kiosk';

/**
 * Check if a kiosk has Pavilion extension installed
 */
export async function isPavilionKiosk(
  kioskClient: KioskClient,
  kioskId: string
): Promise<boolean> {
  const pavilionExtensionType = process.env.NEXT_PUBLIC_PAVILION_EXTENSION_TYPE as string | undefined;
  const pavilionPackageId = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;

  const finalPavilionExtensionType = pavilionExtensionType ||
    `${pavilionPackageId || '0x0'}::pavilion::PavilionExtension`;

  try {
    const extension = await kioskClient.getKioskExtension({
      kioskId,
      type: finalPavilionExtensionType
    });
    
    return !!(extension && extension.isEnabled !== false);
  } catch (error) {
    console.error('Error checking if kiosk is pavilion:', error);
    return false;
  }
}

