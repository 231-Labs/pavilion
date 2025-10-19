// NFT Contract Package IDs on Sui Testnet
// Update these after deploying the Move contracts

export const NFT_CONTRACTS = {
  DEMO_NFT_2D: {
    // Replace with actual package ID after deployment
    // Example: '0x9e8f0d70e1b6e3a7bd0ed1cc5ec55ea087e7abc1a4eb8ba54e2f3178bb4afe3b'
    packageId: process.env.NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID || '',
    module: 'demo_nft_2d',
    mintFunction: 'mint',
  },
  DEMO_NFT_3D: {
    // Replace with actual package ID after deployment
    // Example: '0x2f9f5ac8d7c3e8ece0d2a8ba38dddf6bf3e4c8d25f32acbf5e55a9a67ac94e5a'
    packageId: process.env.NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID || '',
    module: 'demo_nft_3d',
    mintFunction: 'mint',
  },
} as const;

// Walrus configuration
export const WALRUS_CONFIG = {
  PUBLISHER_URL: 'https://publisher.walrus-testnet.walrus.space',
  AGGREGATOR_URL: 'https://aggregator.walrus-testnet.walrus.space',
} as const;

