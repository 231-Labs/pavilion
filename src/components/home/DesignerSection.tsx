import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { NFT_CONTRACTS } from '../../config/nft-contracts';
import { useKioskClient } from '../providers/KioskClientProvider';
import { useKioskData } from '../../hooks/kiosk/useKioskData';
import { KioskSelector } from './KioskSelector';
import { uploadToWalrus } from '../../lib/walrus';
import { 
  buildMint2DNFTTx, 
  buildMint3DNFTTx, 
  parseMintedNFTId,
  buildPlaceNFTInKioskTx, 
  buildNFTType 
} from '../../lib/tx/pavilion/index';

type DesignerMode = '2d' | '3d';

export function DesignerSection() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const { 
    pavilionKiosks, 
    fetchingKiosks
  } = useKioskData();
  
  const [designerMode, setDesignerMode] = useState<DesignerMode>('2d');
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mintedNftId, setMintedNftId] = useState<string | null>(null);
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
  const [placingInKiosk, setPlacingInKiosk] = useState(false);
  const [placeSuccess, setPlaceSuccess] = useState<string | null>(null);
  
  // 2D NFT
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // 3D NFT GLB File
  const [glbFile, setGlbFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const placeInKiosk = async () => {
    if (!mintedNftId || !selectedKioskId || !currentAccount) {
      setError('Missing NFT ID or Kiosk selection');
      return;
    }

    // Find selected kiosk cap
    const selectedKiosk = pavilionKiosks?.find(k => k.kioskId === selectedKioskId);
    if (!selectedKiosk?.objectId) {
      setError('Could not find kiosk owner cap');
      return;
    }

    try {
      setPlacingInKiosk(true);
      setError(null);

      // Build NFT type string
      const nftContract = designerMode === '2d' 
        ? NFT_CONTRACTS.DEMO_NFT_2D 
        : NFT_CONTRACTS.DEMO_NFT_3D;
      const nftTypeName = designerMode === '2d' ? 'DemoNFT2D' : 'DemoNFT3D';
      const nftType = buildNFTType(
        nftContract.packageId,
        nftContract.module,
        nftTypeName
      );

      // Build placement transaction
      const tx = buildPlaceNFTInKioskTx({
        kioskId: selectedKioskId,
        kioskOwnerCapId: selectedKiosk.objectId,
        nftId: mintedNftId,
        nftType,
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result: any) => {
            setPlaceSuccess(result.digest);
            
            // Reset after delay
            setTimeout(() => {
              setMintedNftId(null);
              setSelectedKioskId(null);
              setSuccess(null);
              setPlaceSuccess(null);
              setName('');
              setDescription('');
              setImageFile(null);
              setGlbFile(null);
            }, 8000);
          },
          onError: (error) => {
            setError(`Failed to place in kiosk: ${error.message}`);
          },
        }
      );
    } catch (err: any) {
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setPlacingInKiosk(false);
    }
  };

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
      const imageResult = await uploadToWalrus(imageFile, {
        onProgress: (msg) => setUploadProgress(msg),
      });
      const imageUrl = imageResult.url;

      let glbBlobId = '';
      if (designerMode === '3d' && glbFile) {
        const glbResult = await uploadToWalrus(glbFile, {
          onProgress: (msg) => setUploadProgress(msg),
        });
        glbBlobId = glbResult.blobId;
      }

      setUploading(false);
      setUploadProgress('Preparing to mint NFT...');

      // Build minting transaction
      const tx =
        designerMode === '2d'
          ? buildMint2DNFTTx({
              packageId: NFT_CONTRACTS.DEMO_NFT_2D.packageId,
              module: NFT_CONTRACTS.DEMO_NFT_2D.module,
              mintFunction: NFT_CONTRACTS.DEMO_NFT_2D.mintFunction,
              name,
              description,
              imageUrl,
              attributes: [],
              recipient: currentAccount.address,
            })
          : buildMint3DNFTTx({
              packageId: NFT_CONTRACTS.DEMO_NFT_3D.packageId,
              module: NFT_CONTRACTS.DEMO_NFT_3D.module,
              mintFunction: NFT_CONTRACTS.DEMO_NFT_3D.mintFunction,
              name,
              description,
              imageUrl,
              glbBlobId,
              recipient: currentAccount.address,
            });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result: any) => {
            setSuccess(result.digest);
            setUploadProgress('');

            // Parse minted NFT ID from transaction
            try {
              const nftId = await parseMintedNFTId({
                suiClient,
                digest: result.digest,
              });

              if (nftId) {
                setMintedNftId(nftId);
              }
            } catch (e) {
              // Silently fail - user can still see the transaction link
              console.error('Failed to parse minted NFT ID:', e);
            }
          },
          onError: (error) => {
            setError(`Mint failed: ${error.message}`);
            setUploadProgress('');
          },
        }
      );
    } catch (err: any) {
      setError(`Error: ${err.message || 'Unknown error'}`);
      setUploading(false);
      setUploadProgress('');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div 
      className="w-full slab-segment flex flex-col h-full overflow-y-auto scrollbar-hide"
      style={{
        padding: 'clamp(12px, 2.5vw, 20px)'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Title and Mode Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-base md:text-lg font-semibold tracking-wide">Publish Object</div>
            <div className="mt-2 mb-3 flex items-center space-x-1 text-[10px] tracking-wide uppercase">
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
            <div className="text-white/70 text-xs mt-1 tracking-widest uppercase flex items-center">
              <span>
                {designerMode === '2d' 
                  ? 'Create 2D NFT with image asset' 
                  : 'Create 3D NFT with image and model assets'}
              </span>
            </div>
          </div>
        </div>


        {/* Conditional Content: Form or Place in Pavilion */}
        {mintedNftId ? (
          // Place in Pavilion Section (replaces form after successful mint)
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full space-y-8">
              {/* Success Title with Border Lines */}
              <div className="relative">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-white/20"></div>
                  <div className="text-white/90 text-[13px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap px-2">
                    Object Published Successfully
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-white/20"></div>
                </div>
              </div>
              
              {/* Content Area with Border */}
              <div className="border border-white/15 rounded-lg bg-white/[0.02] backdrop-blur-sm p-6 space-y-6">
                {/* Instruction Text */}
                <div className="text-white/60 text-xs tracking-wide text-center">
                  {placeSuccess ? 'NFT placed in pavilion successfully' : 'Select a pavilion to place your NFT'}
                </div>
                
                {/* Selector - Centered */}
                <div className="flex justify-center">
                  <KioskSelector
                    kiosks={pavilionKiosks}
                    loading={fetchingKiosks}
                    selectedKioskId={selectedKioskId}
                    onSelectKiosk={setSelectedKioskId}
                    emptyMessage="No pavilions found"
                    showNames={true}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-6 pt-2">
                  <button
                    onClick={placeInKiosk}
                    disabled={!selectedKioskId || placingInKiosk || !!placeSuccess}
                    className="group relative inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all disabled:opacity-40 bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"
                  >
                    {placingInKiosk ? (
                      <div className="loading-spinner" />
                    ) : placeSuccess ? (
                      <svg 
                        className="w-4 h-4 text-green-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg 
                        className="w-4 h-4 text-white/80 transition-transform duration-200 group-hover:scale-110" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                      </svg>
                    )}
                  </button>
                  
                  {!placeSuccess && (
                    <button
                      onClick={() => {
                        setMintedNftId(null);
                        setSelectedKioskId(null);
                        setSuccess(null);
                        setPlaceSuccess(null);
                      }}
                      className="text-[11px] text-white/60 hover:text-white/90 uppercase tracking-widest transition-colors underline underline-offset-2 decoration-white/30 hover:decoration-white/60"
                    >
                      Skip & Create New
                    </button>
                  )}
                </div>
              </div>
              
              {/* Transaction Links with Border Lines */}
              <div className="space-y-3">
                {success && (
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-white/10"></div>
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${success}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-white/70 hover:text-white uppercase tracking-widest transition-colors whitespace-nowrap"
                      >
                        View Mint TX on Explorer →
                      </a>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-white/10"></div>
                    </div>
                  </div>
                )}
                
                {placeSuccess && (
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-white/10"></div>
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${placeSuccess}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-white/70 hover:text-white uppercase tracking-widest transition-colors whitespace-nowrap"
                      >
                        View Place TX on Explorer →
                      </a>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-white/10"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Form Fields
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 mt-2">
          {/* Name */}
          <div className="flex items-end gap-4 max-w-2xl">
            <label className="text-[14px] font-semibold uppercase tracking-widest text-white/85 whitespace-nowrap pb-1.5">Name:</label>
            <div className="flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent px-0 pt-0 pb-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex items-end gap-4 max-w-2xl">
            <label className="text-[14px] font-semibold uppercase tracking-widest text-white/85 whitespace-nowrap pb-1.5">Description:</label>
            <div className="flex-1">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-transparent px-0 pt-0 pb-1.5 border-0 border-b border-white/60 focus:outline-none focus:border-white text-white text-base resize-none leading-tight align-bottom"
                style={{ verticalAlign: 'bottom' }}
              />
            </div>
          </div>

          {/* File Uploads - Side by side in 3D mode */}
          <div className={designerMode === '3d' ? 'grid grid-cols-2 gap-4 items-start mt-8' : 'space-y-5 mt-8'}>
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85 h-[24px]">Image:</label>
              <label className="cursor-pointer block">
                <div className="relative group">
                  <div className="px-4 py-3 border border-white/15 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 transition-all duration-200 min-h-[88px] flex items-center">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                        <svg className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-white/80 font-medium truncate">
                          {imageFile ? imageFile.name : 'image'}
                        </div>
                        {imageFile && (
                          <div className="text-[11px] text-white/50 mt-0.5">
                            {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                        {!imageFile && (
                          <div className="text-[11px] text-white/40 mt-0.5">
                            PNG, JPG, GIF
                          </div>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-white/40 flex-shrink-0 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* GLB Upload (3D only) */}
            {designerMode === '3d' && (
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85 h-[24px]">3D Model:</label>
                <label className="cursor-pointer block">
                  <div className="relative group">
                    <div className="px-4 py-3 border border-white/15 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 transition-all duration-200 min-h-[88px] flex items-center">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                          <svg className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white/80 font-medium truncate">
                            {glbFile ? glbFile.name : 'model'}
                          </div>
                          {glbFile && (
                            <div className="text-[11px] text-white/50 mt-0.5">
                              {(glbFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}
                          {!glbFile && (
                            <div className="text-[11px] text-white/40 mt-0.5">
                              .glb
                            </div>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-white/40 flex-shrink-0 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".glb"
                    onChange={handleGlbChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="text-white/70 text-xs tracking-widest uppercase flex items-center gap-2">
              <span className="loading-spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}
          </div>
        )}

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

        {/* Publish Button (only show when not minted) */}
        {!mintedNftId && (
          <div className="mt-8 flex items-center justify-end">
            <button
              onClick={handleMint}
              disabled={minting || uploading || !currentAccount}
              className="group relative inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all disabled:opacity-60 bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"
            >
              {minting || uploading ? (
                <div className="loading-spinner" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-white/80 transition-transform duration-200 group-hover:scale-110"
                >
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 18V20H4V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

