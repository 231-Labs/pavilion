'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import { ReactNode } from 'react';
import { elegantTheme } from '../styles/dappKitTheme';
import { KioskClientProvider } from './KioskClientProvider';
import { KioskStateProvider } from './KioskStateProvider';
import { LoadingProvider } from './LoadingProvider';

// Create QueryClient
const queryClient = new QueryClient();

// Network configuration
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const defaultNetwork: 'testnet' | 'mainnet' = 'testnet';
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
        <WalletProvider theme={elegantTheme} autoConnect={true}>
          <KioskClientProvider networkName={defaultNetwork}>
            <KioskStateProvider>
              <LoadingProvider>
                {children}
              </LoadingProvider>
            </KioskStateProvider>
          </KioskClientProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
