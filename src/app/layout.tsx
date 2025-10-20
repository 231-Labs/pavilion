import type { Metadata } from "next";
import "./globals.css";
import '@mysten/dapp-kit/dist/index.css';
import { Providers } from '../components/providers/Providers';

export const metadata: Metadata = {
  title: "Pavilion",
  description: "Turn your kiosk into a curated gallery.",
  icons: {
    icon: '/3_icon_walrus_white_RGB.png',
  },
  other: {
    'cache-control': 'no-cache, no-store, must-revalidate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
