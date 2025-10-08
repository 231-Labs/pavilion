'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useKioskClient } from './KioskClientProvider';

type KioskState = {
  kioskId: string | null;
  kioskOwnerCapId: string | null;
  kioskItems: any[] | null;
  loading: boolean;
  error: string | null;
  setKioskId: (id: string | null) => void;
  setKioskFromIds: (ids: { kioskId?: string; kioskOwnerCapId?: string }) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<KioskState | null>(null);

export function KioskStateProvider({ children }: { children: React.ReactNode }) {
  const kioskClient = useKioskClient();
  const [kioskId, setKioskId] = useState<string | null>(null);
  const [kioskOwnerCapId, setKioskOwnerCapId] = useState<string | null>(null);
  const [kioskItems, setKioskItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist only kioskId for rehydration (but not in demo mode)
  useEffect(() => {
    try {
      // Check if we're on pavilion page without kioskId parameter (demo mode)
      const isOnPavilionPage = window.location.pathname === '/pavilion';
      const urlParams = new URLSearchParams(window.location.search);
      const urlKioskId = urlParams.get('kioskId');
      
      // If we're on pavilion page without kioskId parameter, it's demo mode - don't load from localStorage
      if (isOnPavilionPage && !urlKioskId) {
        console.log('🎭 Demo mode detected: not loading kiosk from localStorage');
        return;
      }
      
      // Otherwise, load from localStorage as usual
      const saved = localStorage.getItem('pavilion:lastKioskId');
      if (saved) setKioskId(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      // Don't save to localStorage in demo mode
      const isOnPavilionPage = window.location.pathname === '/pavilion';
      const urlParams = new URLSearchParams(window.location.search);
      const urlKioskId = urlParams.get('kioskId');
      
      if (isOnPavilionPage && !urlKioskId) {
        // Demo mode - don't persist
        return;
      }
      
      if (kioskId) localStorage.setItem('pavilion:lastKioskId', kioskId);
    } catch {}
  }, [kioskId]);

  const refresh = useCallback(async () => {
    if (!kioskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await kioskClient.getKiosk({
        id: kioskId,
        options: {
          withKioskFields: true,
          withListingPrices: true,
          withObjects: true,
          objectOptions: { showDisplay: true, showContent: true },
        },
      });
      setKioskItems(data.items ?? []);
    } catch (e) {
      setError((e as Error).message || 'Failed to fetch kiosk contents');
      setKioskItems(null);
    } finally {
      setLoading(false);
    }
  }, [kioskClient, kioskId]);

  // Auto refresh on kioskId change
  useEffect(() => {
    if (kioskId) void refresh();
  }, [kioskId, refresh]);

  const setKioskFromIds = useCallback((ids: { kioskId?: string; kioskOwnerCapId?: string }) => {
    if (ids.kioskId) setKioskId(ids.kioskId);
    if (ids.kioskOwnerCapId) setKioskOwnerCapId(ids.kioskOwnerCapId);
  }, []);

  const value = useMemo<KioskState>(() => ({
    kioskId,
    kioskOwnerCapId,
    kioskItems,
    loading,
    error,
    setKioskId,
    setKioskFromIds,
    refresh,
  }), [kioskId, kioskOwnerCapId, kioskItems, loading, error, setKioskFromIds, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKioskState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKioskState must be used within a KioskStateProvider');
  return ctx;
}


