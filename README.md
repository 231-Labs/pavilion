# Pavilion - NFT Gallery Platform

A decentralized NFT gallery platform built on Sui blockchain with Walrus storage integration.

## Features

- **Collector Mode**: Create and visit NFT pavilions (galleries) using Sui Kiosk
- **Designer Mode**: Mint 2D and 3D NFTs with Walrus storage
  - 2D NFT: Images with attributes
  - 3D NFT: 3D models (.glb) with preview images
- **Walrus Integration**: Decentralized storage for NFT assets
- **Sui Kiosk**: Standard NFT marketplace infrastructure

## Getting Started

### Prerequisites

Before running the development server, ensure you have the required configuration files:

1. **NFT Collection Configuration** (Required)
   
   The platform requires a configuration file to properly display NFT collections. This file is already included in the repository at:
   ```
   public/config/nft-collections.json
   ```
   
   This file defines:
   - Supported NFT collections and their field mappings
   - Field names for 3D models and 2D images
   - Resource priority (3D model vs 2D image)
   - Default fallback configuration for unknown collections

   If you need to add custom NFT collections, edit this file to include your collection's:
   - `collectionId`: The collection identifier (module name or package ID)
   - `collectionName`: Human-readable name
   - `modelFields`: Field names for 3D model blob IDs and URLs
   - `imageFields`: Field names for 2D image blob IDs and URLs
   - `resourcePriority`: Which resource type to prefer

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Designer Mode Setup

To use Designer Mode for minting NFTs:

1. **Deploy Move Contracts** (see `DESIGNER_MODE_SETUP.md` for details)
   ```bash
   cd move/demo_nft_2d
   sui client publish --gas-budget 100000000
   
   cd ../demo_nft_3d
   sui client publish --gas-budget 100000000
   ```

2. **Configure Environment Variables**
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID=your_2d_package_id
   NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID=your_3d_package_id
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

For detailed setup instructions, see [DESIGNER_MODE_SETUP.md](./DESIGNER_MODE_SETUP.md)

## Project Structure

```
├── move/                    # Move smart contracts
│   ├── demo_nft_2d/        # 2D NFT contract
│   ├── demo_nft_3d/        # 3D NFT contract
│   └── pavilion/           # Pavilion platform contract
├── src/
│   ├── app/                # Next.js app pages
│   ├── components/         # React components
│   │   ├── home/          # Home page components (Designer Mode)
│   │   ├── panels/        # Control panels
│   │   └── pavilion/      # Pavilion components
│   ├── config/            # Configuration files
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   │   ├── blockchain/    # Sui blockchain integration
│   │   ├── three/         # Three.js 3D rendering
│   │   └── walrus/        # Walrus storage client
│   └── types/             # TypeScript type definitions
└── public/                # Static assets
    ├── config/            # Configuration files
    │   └── nft-collections.json  # NFT collection field mappings
    ├── fonts/             # Font files
    └── models/            # 3D model assets
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
