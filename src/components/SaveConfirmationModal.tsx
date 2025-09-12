'use client';

import React, { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';

interface SaveChange {
  objectId: string;
  objectName: string;
  changes: {
    displayed?: { from: boolean; to: boolean };
    position?: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } };
    rotation?: { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } };
    scale?: { from: number; to: number };
  };
}

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: SaveChange[];
  transaction: Transaction | null;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function SaveConfirmationModal({
  isOpen,
  onClose,
  changes,
  transaction,
  onSaveSuccess,
  onSaveError
}: SaveConfirmationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
          showEvents: false,
        },
      }),
  });

  const handleSave = async () => {
    if (!transaction) return;

    setIsSaving(true);
    try {
      const result = await signAndExecuteTransaction({ transaction });

      console.log('Save transaction successful:', result);
      onSaveSuccess?.();
      onClose();
    } catch (error) {
      console.error('Save transaction failed:', error);
      onSaveError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatVector = (vec: { x: number; y: number; z: number }) => {
    return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)})`;
  };

  const formatRotation = (rad: number) => {
    return `${(rad * 180 / Math.PI).toFixed(1)}°`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-slab glass-slab--thermal rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold tracking-wide uppercase silver-glow">
            Confirm Changes
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-white/70"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="text-sm text-white/70 tracking-widest uppercase">
              The following changes will be saved to the blockchain:
            </div>

            {/* Changes List */}
            <div className="space-y-3">
              {changes.map((change) => (
                <div
                  key={change.objectId}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white/90">
                      {change.objectName}
                    </h3>
                    <span className="text-xs text-white/50 font-mono">
                      {change.objectId.slice(-8)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {change.changes.displayed && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/70">Display:</span>
                        <span className="text-white/90">
                          {change.changes.displayed.from ? 'Show' : 'Hide'} → {change.changes.displayed.to ? 'Show' : 'Hide'}
                        </span>
                      </div>
                    )}

                    {change.changes.position && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/70">Position:</span>
                        <span className="text-white/90 font-mono text-xs">
                          {formatVector(change.changes.position.from)} → {formatVector(change.changes.position.to)}
                        </span>
                      </div>
                    )}

                    {change.changes.rotation && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/70">Rotation:</span>
                        <span className="text-white/90 font-mono text-xs">
                          ({formatRotation(change.changes.rotation.from.x)}, {formatRotation(change.changes.rotation.from.y)}, {formatRotation(change.changes.rotation.from.z)}) → ({formatRotation(change.changes.rotation.to.x)}, {formatRotation(change.changes.rotation.to.y)}, {formatRotation(change.changes.rotation.to.z)})
                        </span>
                      </div>
                    )}

                    {change.changes.scale && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/70">Scale:</span>
                        <span className="text-white/90 font-mono">
                          {change.changes.scale.from.toFixed(2)} → {change.changes.scale.to.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warning removed per product requirement */}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium tracking-wide uppercase bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white/80 hover:text-white disabled:text-white/50 rounded-lg border border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !transaction}
            className="px-6 py-2 text-sm font-medium tracking-wide uppercase bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white/90 hover:text-white disabled:text-white/50 rounded-lg border border-white/30 disabled:border-white/20 transition-colors flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Confirm & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
