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
        setError('請上傳圖片文件');
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
        setError('請上傳 .glb 文件');
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
      throw new Error(`Walrus 上傳失敗: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    // Walrus 返回格式處理
    if (result.newlyCreated?.blobObject?.blobId) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified?.blobId) {
      return result.alreadyCertified.blobId;
    }
    
    throw new Error('無法從 Walrus 響應中獲取 blob ID');
  };

  const handleMint = async () => {
    if (!currentAccount) {
      setError('請先連接錢包');
      return;
    }

    // 驗證必填字段
    if (!name.trim()) {
      setError('請填寫 NFT 名稱');
      return;
    }
    if (!description.trim()) {
      setError('請填寫 NFT 描述');
      return;
    }
    if (!imageFile) {
      setError('請上傳圖片');
      return;
    }
    if (designerMode === '3d' && !glbFile) {
      setError('請上傳 3D 模型文件 (.glb)');
      return;
    }

    try {
      setMinting(true);
      setError(null);
      setUploading(true);

      // 上傳圖片到 Walrus
      setUploadProgress('上傳圖片到 Walrus...');
      const imageBlobId = await uploadToWalrus(imageFile);
      const imageUrl = `${WALRUS_CONFIG.AGGREGATOR_URL}/v1/blobs/${imageBlobId}`;

      let glbBlobId = '';
      if (designerMode === '3d' && glbFile) {
        setUploadProgress('上傳 3D 模型到 Walrus...');
        glbBlobId = await uploadToWalrus(glbFile);
      }

      setUploading(false);
      setUploadProgress('準備鑄造 NFT...');

      const tx = new Transaction();

      if (designerMode === '2d') {
        // 檢查 package ID 是否已配置
        if (!NFT_CONTRACTS.DEMO_NFT_2D.packageId) {
          throw new Error('2D NFT 合約 Package ID 尚未配置，請先部署合約並設置環境變數 NEXT_PUBLIC_DEMO_NFT_2D_PACKAGE_ID');
        }

        // 解析 attributes
        const attributesArray = attributes
          .split(',')
          .map(a => a.trim())
          .filter(a => a.length > 0);
        
        // 調用 2D NFT mint 函數
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
        // 檢查 package ID 是否已配置
        if (!NFT_CONTRACTS.DEMO_NFT_3D.packageId) {
          throw new Error('3D NFT 合約 Package ID 尚未配置，請先部署合約並設置環境變數 NEXT_PUBLIC_DEMO_NFT_3D_PACKAGE_ID');
        }
        
        // 調用 3D NFT mint 函數
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
            setSuccess(`NFT 鑄造成功! Digest: ${result.digest}`);
            setUploadProgress('');
            
            // 重置表單
            setName('');
            setDescription('');
            setImageFile(null);
            setGlbFile(null);
            setAttributes('');
            
            setTimeout(() => setSuccess(null), 5000);
          },
          onError: (error) => {
            console.error('Mint error:', error);
            setError(`鑄造失敗: ${error.message}`);
            setUploadProgress('');
          },
        }
      );
    } catch (err: any) {
      console.error('Upload or mint error:', err);
      setError(`錯誤: ${err.message || '未知錯誤'}`);
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
        {/* 標題和模式切換 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base md:text-lg font-semibold tracking-wide">Designer Mode</div>
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
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-[11px] tracking-wide">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400/60 hover:text-green-400 transition-colors"
                aria-label="關閉成功消息"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85">
              NFT Name:
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入 NFT 名稱"
              className="w-full bg-transparent px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:border-white/40 text-white text-sm placeholder:text-white/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85">
              Description:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入 NFT 描述"
              rows={3}
              className="w-full bg-transparent px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:border-white/40 text-white text-sm placeholder:text-white/40 resize-none"
            />
          </div>

          {/* Attributes (2D only) */}
          {designerMode === '2d' && (
            <div className="space-y-2">
              <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85">
                Attributes:
              </label>
              <input
                value={attributes}
                onChange={(e) => setAttributes(e.target.value)}
                placeholder="用逗號分隔，例如：Rare, Blue, Limited"
                className="w-full bg-transparent px-3 py-2 border border-white/20 rounded-lg focus:outline-none focus:border-white/40 text-white text-sm placeholder:text-white/40"
              />
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85">
              Image:
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="w-full px-3 py-2 border border-white/20 rounded-lg hover:border-white/40 transition-colors text-white/60 text-sm flex items-center justify-between">
                  <span>{imageFile ? imageFile.name : '選擇圖片文件'}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            </div>
            {imageFile && (
              <div className="text-[11px] text-white/50 tracking-wide">
                已選擇: {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* GLB Upload (3D only) */}
          {designerMode === '3d' && (
            <div className="space-y-2">
              <label className="block text-[14px] font-semibold uppercase tracking-widest text-white/85">
                3D Model (.glb):
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="w-full px-3 py-2 border border-white/20 rounded-lg hover:border-white/40 transition-colors text-white/60 text-sm flex items-center justify-between">
                    <span>{glbFile ? glbFile.name : '選擇 .glb 文件'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              </div>
              {glbFile && (
                <div className="text-[11px] text-white/50 tracking-wide">
                  已選擇: {glbFile.name} ({(glbFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="text-[12px] text-white/70 tracking-wide flex items-center gap-2">
              <div className="loading-spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <span className="text-red-400 text-[11px] tracking-wide flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400/60 hover:text-red-400 transition-colors"
                aria-label="關閉錯誤"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mint Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleMint}
            disabled={minting || uploading || !currentAccount}
            className="px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-semibold uppercase tracking-widest hover:bg-white/15 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {minting || uploading ? (
              <>
                <div className="loading-spinner" />
                <span>處理中...</span>
              </>
            ) : (
              <span>鑄造 NFT</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

