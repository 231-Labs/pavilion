import { useRouter } from 'next/navigation';
import { useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useLoading } from '../../components/providers/LoadingProvider';
import { PreloadService } from '../../lib/three/PreloadService';
import { fetchKioskContents } from '../../lib/blockchain/pavilion';
import type { UsePreloadNavigationReturn } from '../../types/home';

export function usePreloadNavigation(): UsePreloadNavigationReturn {
  const router = useRouter();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const { setLoading, setPreloading } = useLoading();
  
  const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;

  // Preload scene and models for smoother transition
  const preloadSceneForKiosk = async (targetKioskId: string): Promise<boolean> => {
    if (!kioskClient || !suiClient || !PAVILION_PACKAGE_ID) {
      return false;
    }

    try {
      setPreloading(true, 0, 'Initializing preload...');

      // Fetch kiosk items
      setPreloading(true, 10, 'Fetching kiosk contents...');
      const kioskData = await fetchKioskContents({ kioskClient, kioskId: targetKioskId });
      const kioskItems = kioskData?.items || [];

      // Create preload service
      const service = new PreloadService({
        kioskClient,
        suiClient,
        kioskId: targetKioskId,
        kioskItems,
        packageId: PAVILION_PACKAGE_ID,
        onProgress: (progress, stage, details) => {
          setPreloading(true, progress, details ? `${stage} (${details})` : stage);
        },
        onComplete: () => {
          // Data is handled internally by PreloadService
        },
        onError: () => {
          setPreloading(false);
        }
      });
      
      // Start preloading
      await service.startPreloading();
      setPreloading(false, 100, 'Preload complete!');
      
      return true;
    } catch {
      setPreloading(false);
      return false;
    }
  };

  const navigateToKiosk = async (targetKioskId: string) => {
    const preloadSuccess = await preloadSceneForKiosk(targetKioskId);
    
    if (preloadSuccess) {
      setTimeout(() => {
        router.push(`/manage?kioskId=${targetKioskId}`);
      }, 300);
    } else {
      setLoading(true);
      setTimeout(() => {
        router.push(`/manage?kioskId=${targetKioskId}`);
      }, 800);
    }
  };

  const navigateToDemo = () => {
    setLoading(true);
    setTimeout(() => {
      router.push('/demo');
    }, 800);
  };

  return {
    navigateToKiosk,
    navigateToDemo,
  };
}
