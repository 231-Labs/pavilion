'use client';

import React, { useEffect } from 'react';

interface OwnershipVerificationModalProps {
  isOpen: boolean;
  isVerifying: boolean;
  verificationError?: string;
  onVerify: () => void;
  onCancel: () => void;
  kioskId: string;
}

/**
 * Compact modal for verifying kiosk ownership through wallet signature
 */
export function OwnershipVerificationModal({
  isOpen,
  isVerifying,
  verificationError,
  onVerify,
  onCancel,
  kioskId,
}: OwnershipVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" />

      {/* Compact Modal */}
      <div className="relative glass-slab glass-slab--thermal rounded-xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-white/90"
              >
                <path
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold tracking-wide uppercase silver-glow">
              Verify Ownership
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status Message */}
          {isVerifying && (
            <div className="flex items-center space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-400">
                  Waiting for signature...
                </div>
                <div className="text-xs text-blue-400/70 mt-0.5">
                  Please confirm in your wallet
                </div>
              </div>
            </div>
          )}

          {verificationError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0"
                >
                  <path
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-400">
                    Verification Failed
                  </div>
                  <div className="text-xs text-red-400/70 mt-0.5">
                    {verificationError}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isVerifying && !verificationError && (
            <div className="text-sm text-white/70 leading-relaxed">
              Please sign a message to verify you own this pavilion.
            </div>
          )}

          {/* Compact Kiosk ID */}
          <div className="text-xs text-white/40 font-mono break-all">
            {kioskId}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={isVerifying}
            className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white/60 hover:text-white/80 disabled:text-white/40 rounded border border-white/10 transition-colors"
          >
            Cancel
          </button>
          
          {verificationError && (
            <button
              onClick={onVerify}
              disabled={isVerifying}
              className="px-4 py-1.5 text-xs font-medium tracking-wide uppercase bg-white/15 hover:bg-white/25 disabled:bg-white/10 text-white/90 hover:text-white disabled:text-white/50 rounded border border-white/20 disabled:border-white/10 transition-colors flex items-center space-x-1.5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3"
              >
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Retry</span>
            </button>
          )}
          {!verificationError && !isVerifying && (
            <button
              onClick={onVerify}
              disabled={isVerifying}
              className="px-4 py-1.5 text-xs font-medium tracking-wide uppercase bg-white/15 hover:bg-white/25 disabled:bg-white/10 text-white/90 hover:text-white disabled:text-white/50 rounded border border-white/20 disabled:border-white/10 transition-colors flex items-center space-x-1.5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3"
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Verify</span>
            </button>
          )}
          {isVerifying && (
            <button
              disabled
              className="px-4 py-1.5 text-xs font-medium tracking-wide uppercase bg-white/10 text-white/50 rounded border border-white/10 transition-colors flex items-center space-x-1.5"
            >
              <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

