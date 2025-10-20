'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Context for managing target kiosk for purchases in visitor mode
interface VisitorPurchaseTargetContextType {
  targetKioskId: string | null;
  targetKioskCapId: string | null;
  setTargetKiosk: (kioskId: string | null, capId: string | null) => void;
}

const VisitorPurchaseTargetContext = createContext<VisitorPurchaseTargetContextType | null>(null);

export function useVisitorPurchaseTarget() {
  const context = useContext(VisitorPurchaseTargetContext);
  if (!context) {
    throw new Error('useVisitorPurchaseTarget must be used within VisitorPurchaseTargetProvider');
  }
  return context;
}

interface VisitorPurchaseTargetProviderProps {
  children: ReactNode;
}

export function VisitorPurchaseTargetProvider({ children }: VisitorPurchaseTargetProviderProps) {
  const [targetKioskId, setTargetKioskId] = useState<string | null>(null);
  const [targetKioskCapId, setTargetKioskCapId] = useState<string | null>(null);

  const setTargetKiosk = (kioskId: string | null, capId: string | null) => {
    setTargetKioskId(kioskId);
    setTargetKioskCapId(capId);
  };

  const value: VisitorPurchaseTargetContextType = {
    targetKioskId,
    targetKioskCapId,
    setTargetKiosk,
  };

  return (
    <VisitorPurchaseTargetContext.Provider value={value}>
      {children}
    </VisitorPurchaseTargetContext.Provider>
  );
}

