'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useKioskClient } from './KioskClientProvider';

type KioskState = {
  kioskId: string | null;
  kioskOwnerCapId: string | null;
  kioskItems: any[] | null;
  kioskData: any | null;
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
  const [kioskData, setKioskData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist only kioskId for rehydration (but not in demo mode)
  useEffect(() => {
    try {
      // Check if we're on demo page
      const isOnDemoPage = window.location.pathname === '/demo';
      
      // If we're on demo page, don't load from localStorage
      if (isOnDemoPage) {
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
      const isOnDemoPage = window.location.pathname === '/demo';
      
      if (isOnDemoPage) {
        // Demo mode - don't persist
        return;
      }
      
      if (kioskId) localStorage.setItem('pavilion:lastKioskId', kioskId);
    } catch {}
  }, [kioskId]);

  const refresh = useCallback(async () => {
    if (!kioskId) return;
    console.log('🔄 KioskStateProvider: Starting refresh for kiosk:', kioskId);
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
      console.log('✅ KioskStateProvider: Fetched kiosk data, items count:', data.items?.length ?? 0);
      console.log('💰 KioskStateProvider: Kiosk profits:', data.kiosk?.profits);
      setKioskItems(data.items ?? []);
      setKioskData(data);
    } catch (e) {
      console.error('❌ KioskStateProvider: Failed to refresh:', e);
      setError((e as Error).message || 'Failed to fetch kiosk contents');
      setKioskItems(null);
      setKioskData(null);
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
    kioskData,
    loading,
    error,
    setKioskId,
    setKioskFromIds,
    refresh,
  }), [kioskId, kioskOwnerCapId, kioskItems, kioskData, loading, error, setKioskFromIds, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKioskState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKioskState must be used within a KioskStateProvider');
  return ctx;
}


