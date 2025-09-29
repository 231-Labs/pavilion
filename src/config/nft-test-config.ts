/**
 * Test configuration for 2D NFT support
 * Use this to test the new 2D NFT functionality
 */

import { NFTFieldConfig } from '../types/nft-field-config';

// Test configuration for demo NFTs that might have 2D images
export const TEST_2D_NFT_CONFIG: NFTFieldConfig = {
  collectionId: 'test_2d_collection',
  collectionName: 'Test 2D Collection',
  modelFields: {
    blobIdFields: ['glb_file', 'model_blob_id'],
    urlFields: ['glb_url', 'model_url'],
  },
  imageFields: {
    blobIdFields: ['image_blob_id', 'img_blob', 'picture_blob'],
    urlFields: ['image_url', 'image', 'img', 'picture', 'photo_url'],
  },
  resourcePriority: ['2d-image', '3d-model'], // Prioritize 2D images for testing
};

// Configuration that tries to detect 2D images in existing demo NFTs
export const DEMO_NFT_2D_CONFIG: NFTFieldConfig = {
  collectionId: 'demo_nft',
  collectionName: 'Demo NFT (2D Enhanced)',
  modelFields: {
    blobIdFields: ['glb_file', 'walrus_blob_id', 'blob_id'],
    urlFields: ['glb_url', 'model_url'],
  },
  imageFields: {
    blobIdFields: ['image_blob', 'img_blob', 'picture_blob', 'photo_blob'],
    urlFields: ['image_url', 'image', 'img', 'picture', 'photo', 'thumbnail'],
  },
  resourcePriority: ['3d-model', '2d-image'], // Keep 3D priority for existing NFTs
};

// Helper function to apply test configurations
export function applyTestConfigurations(nftProcessor: any) {
  // Add test configurations
  nftProcessor.updateCollectionConfig('test_2d_collection', TEST_2D_NFT_CONFIG);
  nftProcessor.updateCollectionConfig('demo_nft', DEMO_NFT_2D_CONFIG);
  
  console.log('🧪 Applied test configurations for 2D NFT support');
}

// Mock 2D NFT data for testing (if no real 2D NFTs are available)
// Note: These will be auto-loaded in demo mode but displayed: false by default
export const MOCK_2D_NFTS = [
  {
    objectId: 'mock_2d_nft_1',
    data: {
      display: {
        data: {
          name: 'Classical Landscape',
          image_url: 'https://picsum.photos/seed/classical/600/800', // Classical landscape style
          description: 'A serene classical landscape painting depicting the beauty of nature',
        }
      },
      content: {
        fields: {
          name: 'Classical Landscape',
          image_blob: 'classical_landscape_blob_123', // Mock Walrus blob ID
          artist: 'Anonymous Master',
          year: '18th Century',
        }
      },
      type: 'test_2d_collection::nft::TestNFT'
    }
  },
  {
    objectId: 'mock_2d_nft_2',
    data: {
      display: {
        data: {
          name: 'Modern Abstract',
          picture: 'https://picsum.photos/seed/abstract/800/600',
          description: 'A vibrant modern abstract artwork full of color and movement',
        }
      },
      content: {
        fields: {
          name: 'Modern Abstract',
          img_blob: 'abstract_art_blob_456',
          artist: 'Contemporary Artist',
          style: 'Abstract Expressionism',
        }
      },
      type: 'test_2d_collection::nft::TestNFT'
    }
  },
  {
    objectId: 'mock_2d_nft_3',
    data: {
      display: {
        data: {
          name: 'Portrait Study',
          image_url: 'https://picsum.photos/seed/portrait/500/700',
          description: 'An exquisite classical portrait with fine attention to detail',
        }
      },
      content: {
        fields: {
          name: 'Portrait Study',
          image_blob: 'portrait_blob_789',
          artist: 'Classical Master',
          period: 'Renaissance Era',
        }
      },
      type: 'test_2d_collection::nft::TestNFT'
    }
  }
];

// Function to inject mock data for testing
export function injectMockNFTs(existingKioskItems: any[]) {
  return [...existingKioskItems, ...MOCK_2D_NFTS];
}
