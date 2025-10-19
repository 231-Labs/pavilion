import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { NFT_CONTRACTS, WALRUS_CONFIG } from '../../config/nft-contracts';

type DesignerMode = '2d' | '3d';

export function DesignerSection() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [designerMode, setDesignerMode] = useState<DesignerMode>('2d');
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 2D NFT 字段
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<string>('');
  
  // 3D NFT 額外字段
  const [glbFile, setGlbFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setImageFile(file);
      setError(null);
    }
  };

  const handleGlbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.glb')) {
        setError('Please upload a .glb file');
        return;
      }
      setGlbFile(file);
      setError(null);
    }
  };

  const uploadToWalrus = async (file: File): Promise<string> => {
    const response = await fetch(`${WALRUS_CONFIG.PUBLISHER_URL}/v1/store`, {
      method: 'PUT',
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    // Handle Walrus response format
    if (result.newlyCreated?.blobObject?.blobId) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified?.blobId) {
      return result.alreadyCertified.blobId;
    }
    
    throw new Error('Failed to get blob ID from Walrus response');
  };

  const handleMint = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      setError('NFT name is required');
      return;
    }
    if (!description.trim()) {
      setError('NFT description is required');
      return;
    }
    if (!imageFile) {
      setError('Please upload an image');
      return;
    }
    if (designerMode === '3d' && !glbFile) {
      setError('Please upload a 3D model (.glb)');
      return;
    }

    try {
      setMinting(true);
      setError(null);
      setUploading(true);

      // Upload image to Walrus
      setUploadProgress('Uploading image to Walrus...');
      const imageBlobId = await uploadToWalrus(imageFile);
      const imageUrl = `${WALRUS_CONFIG.AGGREGATOR_URL}/v1/blobs/${imageBlobId}`;

      let glbBlobId = '';
      if (designerMode === '3d' && glbFile) {
        setUploadProgress('Uploading 3D model to Walrus...');
        glbBlobId = await uploadToWalrus(glbFile);
      }

      setUploading(false);
      setUploadProgress('Preparing to mint NFT...');

      const tx = new Transaction();

      if (designerMode === '2d') {
        // Check if package ID is configured
        if (!NFT_CONTRACTS.DEMO_NFT_2D.packageId) {
          throw new Error('2D NFT contract Package ID not configured. Please deploy the contract and set NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID');
        }

        // Parse attributes
        const attributesArray = attributes
          .split(',')
          .map(a => a.trim())
          .filter(a => a.length > 0);
        
        // Call 2D NFT mint function
        tx.moveCall({
          target: `${NFT_CONTRACTS.DEMO_NFT_2D.packageId}::${NFT_CONTRACTS.DEMO_NFT_2D.module}::${NFT_CONTRACTS.DEMO_NFT_2D.mintFunction}`,
          arguments: [
            tx.pure.string(name),
            tx.pure.string(description),
            tx.pure.string(imageUrl),
            tx.pure.vector('string', attributesArray),
            tx.pure.address(currentAccount.address),
          ],
        });
      } else {
        // Check if package ID is configured
        if (!NFT_CONTRACTS.DEMO_NFT_3D.packageId) {
          throw new Error('3D NFT contract Package ID not configured. Please deploy the contract and set NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID');
        }
        
        // Call 3D NFT mint function
        tx.moveCall({
          target: `${NFT_CONTRACTS.DEMO_NFT_3D.packageId}::${NFT_CONTRACTS.DEMO_NFT_3D.module}::${NFT_CONTRACTS.DEMO_NFT_3D.mintFunction}`,
          arguments: [
            tx.pure.string(name),
            tx.pure.string(description),
            tx.pure.string(imageUrl),
            tx.pure.string(glbBlobId),
            tx.pure.address(currentAccount.address),
          ],
        });
      }

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log('Mint success:', result);
            setSuccess(`NFT minted successfully! Digest: ${result.digest}`);
            setUploadProgress('');
            
            // Reset form
            setName('');
            setDescription('');
            setImageFile(null);
            setGlbFile(null);
            setAttributes('');
            
            setTimeout(() => setSuccess(null), 5000);
          },
          onError: (error) => {
            console.error('Mint error:', error);
            setError(`Mint failed: ${error.message}`);
            setUploadProgress('');
          },
        }
      );
    } catch (err: any) {
      console.error('Upload or mint error:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
      setUploading(false);
      setUploadProgress('');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div 
      className="w-full slab-segment flex-1 flex flex-col"
      style={{
        padding: 'clamp(12px, 2.5vw, 20px)',
        minHeight: 'clamp(200px, 25vh, 300px)'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Title and Mode Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-base md:text-lg font-semibold tracking-wide">Mint NFT</div>
            <div className="mt-2 flex items-center space-x-1 text-[10px] tracking-wide uppercase">
              <button
                onClick={() => setDesignerMode('2d')}
                aria-pressed={designerMode === '2d'}
                className={`px-2 py-[2px] rounded-full border transition-colors ${
                  designerMode === '2d' 
                    ? 'bg-white/15 border-white/30 text-white/90' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                }`}
              >
                2D NFT
              </button>
              <button
                onClick={() => setDesignerMode('3d')}
                aria-pressed={designerMode === '3d'}
                className={`px-2 py-[2px] rounded-full border transition-colors ${
                  designerMode === '3d' 
                    ? 'bg-white/15 border-white/30 text-white/90' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                }`}
              >
                3D NFT
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-3 flex items-center justify-center">
            <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent text-[13px] md:text-sm font-extrabold tracking-[0.3em] animate-pulse">{success}</span>
            <a
              href={`https://suiscan.xyz/testnet/tx/${success.split('Digest: ')[1]}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View on SuiScan"
              className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white/90 transition-colors info-pop-in"
            >
              <span className="text-[10px] leading-none font-semibold normal-case relative">i</span>
            </a>
          </div>
        )}

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Name:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter NFT name"
              className="w-full bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter NFT description"
              rows={2}
              className="w-full bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45 resize-none"
            />
          </div>

          {/* Attributes (2D only) */}
          {designerMode === '2d' && (
            <div className="space-y-2">
              <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Attributes:</label>
              <input
                value={attributes}
                onChange={(e) => setAttributes(e.target.value)}
                placeholder="Comma separated (e.g., Rare, Blue, Limited)"
                className="w-full bg-transparent px-0 py-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base placeholder:text-[11px] placeholder:text-white/45"
              />
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">Image:</label>
            <label className="flex-1 cursor-pointer block">
              <div className="w-full px-0 py-1.5 border-0 border-b border-white/60 hover:border-white transition-colors text-white/70 text-sm flex items-center justify-between">
                <span className="text-[13px]">{imageFile ? imageFile.name : 'Choose image file'}</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            {imageFile && (
              <div className="text-[11px] text-white/50 tracking-wide pl-0">
                Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* GLB Upload (3D only) */}
          {designerMode === '3d' && (
            <div className="space-y-2">
              <label className="block text-[15px] md:text-[16px] font-semibold uppercase tracking-widest text-white/85">3D Model (.glb):</label>
              <label className="flex-1 cursor-pointer block">
                <div className="w-full px-0 py-1.5 border-0 border-b border-white/60 hover:border-white transition-colors text-white/70 text-sm flex items-center justify-between">
                  <span className="text-[13px]">{glbFile ? glbFile.name : 'Choose .glb file'}</span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <input
                  type="file"
                  accept=".glb"
                  onChange={handleGlbChange}
                  className="hidden"
                />
              </label>
              {glbFile && (
                <div className="text-[11px] text-white/50 tracking-wide pl-0">
                  Selected: {glbFile.name} ({(glbFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="text-white/70 text-xs tracking-widest uppercase flex items-center gap-2">
              <span className="loading-spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-red-400 text-[11px] tracking-wide flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors"
              aria-label="Close error"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Mint Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-white/70 text-xs tracking-widest uppercase">
            {minting || uploading ? 'Processing...' : (designerMode === '2d' ? 'Mint 2D NFT on Sui' : 'Mint 3D NFT on Sui')}
          </div>
          <button
            onClick={handleMint}
            disabled={minting || uploading || !currentAccount}
            className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all disabled:opacity-60 bg-white/10 border-white/20"
          >
            {minting || uploading ? (
              <div className="loading-spinner" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

