'use client';

import { SuiClientProvider, WalletProvider, ThemeVars } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import { ReactNode } from 'react';

// Create QueryClient
const queryClient = new QueryClient();

// Network configuration
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

// Custom theme matching our elegant silver-gray design
const elegantTheme: ThemeVars = {
  blurs: {
    modalOverlay: 'blur(20px)',
  },
  backgroundColors: {
    primaryButton: 'rgba(220, 230, 240, 0.08)',
    primaryButtonHover: 'rgba(200, 215, 230, 0.10)',
    outlineButtonHover: 'rgba(240, 245, 250, 0.08)',
    modalOverlay: 'rgba(0, 0, 0, 0.6)',
    modalPrimary: 'rgba(20, 20, 20, 0.95)',
    modalSecondary: 'rgba(240, 245, 250, 0.06)',
    iconButton: 'transparent',
    iconButtonHover: 'rgba(220, 230, 240, 0.08)',
    dropdownMenu: 'rgba(20, 20, 20, 0.95)',
    dropdownMenuSeparator: 'rgba(220, 230, 240, 0.12)',
    walletItemSelected: 'rgba(200, 215, 230, 0.10)',
    walletItemHover: 'rgba(240, 245, 250, 0.08)',
  },
  borderColors: {
    outlineButton: 'rgba(220, 230, 240, 0.15)',
  },
  colors: {
    primaryButton: 'rgba(240, 245, 250, 0.95)',
    outlineButton: 'rgba(220, 230, 240, 0.85)',
    iconButton: 'rgba(240, 245, 250, 0.95)',
    body: 'rgba(220, 230, 240, 0.85)',
    bodyMuted: 'rgba(180, 200, 220, 0.65)',
    bodyDanger: 'rgba(255, 120, 120, 0.8)',
  },
  radii: {
    small: '4px',
    medium: '6px',
    large: '8px',
    xlarge: '12px',
  },
  shadows: {
    primaryButton: '0 4px 12px rgba(180, 200, 220, 0.2)',
    walletItemSelected: '0 2px 8px rgba(200, 215, 230, 0.15)',
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    bold: '600',
  },
  fontSizes: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '18px',
  },
  typography: {
    fontFamily: '"Courier New", monospace',
    fontStyle: 'normal',
    lineHeight: '1.4',
    letterSpacing: '0.5px',
  },
};

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider theme={elegantTheme}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
