// Types for home page components

export interface SuiTransactionResult {
  digest?: string;
  objectChanges?: SuiObjectChange[];
  effects?: {
    status?: {
      status?: string;
      error?: string;
    };
  };
}

export interface SuiObjectChange {
  type: string;
  objectType?: string;
  objectId?: string;
}

export interface KioskData {
  objectId: string;
  kioskId: string;
  isPersonal?: boolean;
  name?: string | null;
}

export type CreateSubMode = 'new' | 'existing';
export type VisitSubMode = 'my' | 'external';
export type Mode = 'collector' | 'designer';

export interface UseKioskDataReturn {
  ownedKiosks: KioskData[] | null;
  pavilionKiosks: KioskData[] | null;
  fetchingKiosks: boolean;
  selectedKioskId: string | null;
  setSelectedKioskId: (id: string | null) => void;
  selectedVisitKioskId: string | null;
  setSelectedVisitKioskId: (id: string | null) => void;
}

export interface UsePavilionActionsReturn {
  creating: boolean;
  error: string | null;
  txDigest: string | null;
  createdKioskId: string | null;
  pavilionName: string;
  setPavilionName: (name: string) => void;
  setError: (error: string | null) => void;
  createPavilion: () => Promise<void>;
  initializeExistingKiosk: (selectedKioskId: string, selectedCap: string) => Promise<void>;
}

export interface UsePreloadNavigationReturn {
  navigateToKiosk: (targetKioskId: string) => Promise<void>;
  navigateToDemo: () => void;
}
