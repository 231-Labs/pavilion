import { useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useKioskClient } from '../../components/providers/KioskClientProvider';
import { readPavilionName } from '../../lib/blockchain/pavilion';
import type { KioskData, UseKioskDataReturn } from '../../types/home';

export function useKioskData(): UseKioskDataReturn {
  const [ownedKiosks, setOwnedKiosks] = useState<KioskData[] | null>(null);
  const [pavilionKiosks, setPavilionKiosks] = useState<KioskData[] | null>(null);
  const [fetchingKiosks, setFetchingKiosks] = useState(false);
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
  const [selectedVisitKioskId, setSelectedVisitKioskId] = useState<string | null>(null);

  const currentAccount = useCurrentAccount();
  const kioskClient = useKioskClient();
  const suiClient = useSuiClient();
  
  const PAVILION_PACKAGE_ID = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;

  // Fetch owned kiosks when wallet connects
  useEffect(() => {
    let aborted = false;
    
    const run = async () => {
      if (!currentAccount) {
        setOwnedKiosks(null);
        setPavilionKiosks(null);
        setSelectedKioskId(null);
        setSelectedVisitKioskId(null);
        return;
      }
      
      try {
        setFetchingKiosks(true);
        const res = await kioskClient.getOwnedKiosks({ address: currentAccount.address });
        if (aborted) return;

        // Separate kiosks with and without PavilionExtension
        const pavilionExtensionType = process.env.NEXT_PUBLIC_PAVILION_EXTENSION_TYPE as string | undefined;
        const pavilionPackageId = process.env.NEXT_PUBLIC_PAVILION_PACKAGE_ID as string | undefined;

        const finalPavilionExtensionType = pavilionExtensionType ||
          `${pavilionPackageId || '0x0'}::pavilion::PavilionExtension`;

        const initialList = (res.kioskOwnerCaps ?? []).map((c: any) => ({
          objectId: c.objectId,
          kioskId: c.kioskId,
          isPersonal: c.isPersonal
        }));

        const filteredList = [];
        const pavilionList = [];
        
        for (const kiosk of initialList) {
          if (aborted) return;
          try {
            const extension = await kioskClient.getKioskExtension({
              kioskId: kiosk.kioskId,
              type: finalPavilionExtensionType
            });
            if (extension && extension.isEnabled !== false) {
              pavilionList.push(kiosk);
            } else {
              filteredList.push(kiosk);
            }
          } catch {
            filteredList.push(kiosk);
          }
        }

        setOwnedKiosks(filteredList);
        
        // Load pavilion names
        if (PAVILION_PACKAGE_ID && pavilionList.length > 0) {
          try {
            const withNames = await Promise.all(
              pavilionList.map(async (k) => {
                try {
                  const name = await readPavilionName({
                    suiClient,
                    packageId: PAVILION_PACKAGE_ID,
                    kioskId: k.kioskId,
                  });
                  return { ...k, name: name ?? null };
                } catch {
                  return { ...k, name: null };
                }
              })
            );
            if (!aborted) setPavilionKiosks(withNames);
          } catch {
            setPavilionKiosks(pavilionList);
          }
        } else {
          setPavilionKiosks(pavilionList);
        }
      } catch {
        if (aborted) return;
      } finally {
        if (!aborted) {
          setFetchingKiosks(false);
        }
      }
    };
    
    void run();
    return () => { aborted = true; };
  }, [currentAccount, kioskClient, suiClient, PAVILION_PACKAGE_ID]);

  return {
    ownedKiosks,
    pavilionKiosks,
    fetchingKiosks,
    selectedKioskId,
    setSelectedKioskId,
    selectedVisitKioskId,
    setSelectedVisitKioskId,
  };
}
