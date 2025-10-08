import { useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { useKioskState } from '../../components/providers/KioskStateProvider';
import { SceneConfigManager } from '../../lib/scene/SceneConfigManager';
import { SceneConfig } from '../../types/scene';
import type { UseSceneConfigurationReturn } from '../../types/pavilion';

interface UseSceneConfigurationProps {
  sceneManager: any;
}

export function useSceneConfiguration({ sceneManager }: UseSceneConfigurationProps): UseSceneConfigurationReturn {
  const [currentSceneConfig, setCurrentSceneConfig] = useState<SceneConfig | null>(null);
  const [sceneConfigManager, setSceneConfigManager] = useState<SceneConfigManager | null>(null);
  
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const kioskState = useKioskState();

  // Initialize scene config manager when dependencies are available
  useEffect(() => {
    if (kioskClient && suiClient && sceneManager) {
      const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID;
      if (PAVILION_PACKAGE_ID) {
        const manager = new SceneConfigManager({
          kioskClient,
          suiClient,
          packageId: PAVILION_PACKAGE_ID,
          sceneManager,
        });
        setSceneConfigManager(manager);
      }
    }
  }, [kioskClient, suiClient, sceneManager]);

  // Update current scene config when kiosk items change
  useEffect(() => {
    if (!sceneConfigManager || !kioskState.kioskItems || kioskState.kioskItems.length === 0) {
      setCurrentSceneConfig(null);
      return;
    }

    const items = kioskState.kioskItems;
    const config = sceneConfigManager.createSceneConfigFromKioskItems(
      items,
      kioskState.kioskId || undefined,
      currentAccount?.address
    );

    setCurrentSceneConfig(config);
  }, [sceneConfigManager, kioskState.kioskItems, kioskState.kioskId, currentAccount]);

  const isConfigReady = !!(sceneConfigManager && currentSceneConfig);

  return {
    currentSceneConfig,
    sceneConfigManager,
    isConfigReady,
  };
}
