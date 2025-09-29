import { useEffect, useState } from 'react';
import { useKioskState } from '../../components/KioskStateProvider';
import { KioskItemConverter } from '../../lib/three/KioskItemConverter';
import type { UseWalrusItemsReturn, WalrusItem } from '../../types/pavilion';

interface UseWalrusItemsProps {
  sceneManager: any;
  loadKioskItems: (items: any[]) => void;
  clearKioskItems: () => void;
}

export function useWalrusItems({ 
  sceneManager, 
  loadKioskItems, 
  clearKioskItems 
}: UseWalrusItemsProps): UseWalrusItemsReturn {
  const [walrusItems, setWalrusItems] = useState<WalrusItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const kioskState = useKioskState();

  // Process kiosk content when kiosk state changes
  useEffect(() => {
    const kioskItems = kioskState.kioskItems;

    if (kioskItems && kioskItems.length > 0) {
      // No need to log here since this is just processing
    } else if (kioskState.kioskId && !kioskState.loading) {
      // No items found, but we might still want to show empty state
    }
  }, [kioskState.kioskItems, kioskState.loading, kioskState.kioskId]);

  // Analyze kiosk items and extract blob IDs when kiosk state changes
  useEffect(() => {
    const analyzeKioskItems = async () => {
      const kioskItems = kioskState.kioskItems;

      if (kioskItems && kioskItems.length > 0) {
        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
          // Analyze kiosk items to find blob IDs
          if (!sceneManager) {
            console.warn('SceneManager not available for kiosk item analysis');
            return;
          }

          const converter = new KioskItemConverter(sceneManager);
          const analyses = converter.analyzeKioskItems(kioskItems);

          // Find Walrus blob IDs
          const foundWalrusItems = analyses.filter(item => item.type === 'walrus' && item.blobId);

          if (foundWalrusItems.length > 0) {
            const walrusItemsData: WalrusItem[] = foundWalrusItems.map(item => ({
              id: item.kioskItem.objectId,
              name: item.name,
              blobId: item.blobId!,
              displayData: item.kioskItem.data?.display?.data || {},
              contentFields: item.kioskItem.data?.content?.fields || {},
              fullItem: item.kioskItem
            }));

            setWalrusItems(walrusItemsData);
          } else {
            setWalrusItems([]);
          }

          // Load non-Walrus items directly
          const nonWalrusItems = kioskItems.filter(item => {
            const analysis = analyses.find(a => a.kioskItem.objectId === item.objectId);
            return analysis && analysis.type !== 'walrus';
          });

          if (nonWalrusItems.length > 0) {
            loadKioskItems(nonWalrusItems);
          }
        } catch (error) {
          console.error('Error analyzing kiosk items:', error);
          setAnalysisError('Failed to analyze kiosk items');
          setWalrusItems([]);
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        // Clear 3D scene if no kiosk items
        clearKioskItems();
        setWalrusItems([]);
        setIsAnalyzing(false);
      }
    };

    analyzeKioskItems();
  }, [kioskState.kioskItems, loadKioskItems, clearKioskItems, sceneManager]);

  return {
    walrusItems,
    isAnalyzing,
    analysisError,
  };
}
