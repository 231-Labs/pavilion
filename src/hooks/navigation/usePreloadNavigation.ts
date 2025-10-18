import { useRouter } from 'next/navigation';
import { useLoading } from '../../components/providers/LoadingProvider';
import type { UsePreloadNavigationReturn } from '../../types/home';

/**
 * Simplified navigation hook without preloading
 * Loading will happen in the scene page with proper verification
 */
export function usePreloadNavigation(): UsePreloadNavigationReturn {
  const router = useRouter();
  const { setLoading } = useLoading();

  const navigateToKiosk = async (targetKioskId: string) => {
    setLoading(true);
    setTimeout(() => {
      router.push(`/manage?kioskId=${targetKioskId}`);
    }, 500);
  };

  const navigateToDemo = () => {
    setLoading(true);
    setTimeout(() => {
      router.push('/demo');
    }, 500);
  };

  return {
    navigateToKiosk,
    navigateToDemo,
  };
}
