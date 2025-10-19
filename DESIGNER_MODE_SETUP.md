# Designer Mode Setup Guide

## Overview

Designer Mode allows users to mint 2D and 3D NFTs directly from the Pavilion interface. NFT images and 3D models are stored on Walrus, and metadata is recorded on Sui blockchain.

## Prerequisites

1. **Deploy Move Contracts**
   - Deploy `demo_nft_2d` contract
   - Deploy `demo_nft_3d` contract
   
2. **Get Package IDs**
   - After deployment, note the Package IDs for both contracts
   
## Setup Instructions

### Step 1: Deploy Move Contracts

#### Deploy 2D NFT Contract

```bash
cd move/demo_nft_2d
sui client publish --gas-budget 100000000
```

Note the `packageId` from the output.

#### Deploy 3D NFT Contract

```bash
cd move/demo_nft_3d
sui client publish --gas-budget 100000000
```

Note the `packageId` from the output.

### Step 2: Configure Environment Variables

Create a `.env.local` file in the project root (if it doesn't exist):

```bash
# NFT Contract Package IDs
NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID=0xYOUR_2D_PACKAGE_ID_HERE
NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID=0xYOUR_3D_PACKAGE_ID_HERE
```

Replace `0xYOUR_2D_PACKAGE_ID_HERE` and `0xYOUR_3D_PACKAGE_ID_HERE` with the actual Package IDs from Step 1.

### Step 3: Restart Development Server

```bash
npm run dev
```

## Usage

1. **Connect Wallet**: Click "Connect Wallet" button in the interface
2. **Switch to Designer Mode**: Click the "Designer" toggle button
3. **Choose NFT Type**: Select "2D NFT" or "3D NFT"
4. **Fill in NFT Details**:
   - Name
   - Description
   - Image (all formats supported)
   - Attributes (for 2D, comma-separated)
   - 3D Model (for 3D, .glb format only)
5. **Mint**: Click "鑄造 NFT" button

## NFT Data Flow

### 2D NFT

1. User uploads image → Walrus storage
2. Get blob ID from Walrus
3. Create full URL: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}`
4. Call `demo_nft_2d::mint` with:
   - name
   - description
   - image_url (full Walrus URL)
   - attributes (array of strings)
   - recipient (user's address)

### 3D NFT

1. User uploads image → Walrus storage (get image blob ID)
2. User uploads .glb file → Walrus storage (get glb blob ID)
3. Call `demo_nft_3d::mint` with:
   - name
   - description
   - image (full Walrus URL for preview image)
   - glb_file (blob ID only, not full URL)
   - recipient (user's address)

## Troubleshooting

### Error: "Package ID 尚未配置"

- Make sure you've deployed the contracts
- Check that environment variables are set correctly in `.env.local`
- Restart the development server after adding environment variables

### Error: "Walrus 上傳失敗"

- Check your internet connection
- Verify Walrus testnet is operational
- Ensure file size is within limits

### Error: "請上傳 .glb 文件"

- Only `.glb` format is supported for 3D models
- Convert other 3D formats (`.obj`, `.fbx`, etc.) to `.glb` using tools like Blender

## File Structure

```
src/
├── components/home/
│   └── DesignerSection.tsx    # Main Designer Mode UI
├── config/
│   └── nft-contracts.ts        # Contract configuration
move/
├── demo_nft_2d/                # 2D NFT Move contract
└── demo_nft_3d/                # 3D NFT Move contract
```

## Contract Functions

### demo_nft_2d::mint

```move
entry fun mint(
    name: String,
    description: String,
    image_url: String,
    attributes: vector<String>,
    recipient: address,
    ctx: &mut TxContext
)
```

### demo_nft_3d::mint

```move
entry fun mint(
    name: String,
    description: String,
    image: String,
    glb_file: String,
    recipient: address,
    ctx: &mut TxContext
)
```

## Notes

- Images are stored on Walrus with full URL reference
- 3D models (glb) are stored on Walrus with blob ID only
- All NFTs are transferred to the minting user's address
- Walrus testnet is used for storage (update URLs for mainnet)

