'use client';

import React from 'react';
import { useThreeScene } from '../../hooks/useThreeScene';
import { SculptureControlPanel } from '../../components/SculptureControlPanel';
import { WalletTerminal } from '../../components/WalletTerminal';

export default function PavilionPage() {
  // Use Three.js scene management hook
  const {
    canvasRef,
    sceneManager,
    sculptures,
    updateSculpturePosition,
    updateSculptureRotation,
    updateSculptureScale
  } = useThreeScene({
    backgroundColor: 0x1a1a1a,
    // backgroundColor: 0xFFFFFF,
    cameraPosition: [0, 1, 20],
    createGallery: true,
    addSculptures: true,
  });

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20 pointer-events-none z-0"></div>

      {/* Main 3D Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />

      {/* Liquid Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-5"></div>

      {/* Left Control Panel - Sui Wallet */}
      <WalletTerminal />

      {/* Right Control Panels */}
      <div className="absolute top-6 right-6 z-20">
        {/* Sculpture Control Panel with Integrated GLB Loader */}
        <SculptureControlPanel
          sculptures={sculptures}
          sceneManager={sceneManager}
          onUpdatePosition={updateSculpturePosition}
          onUpdateRotation={updateSculptureRotation}
          onUpdateScale={updateSculptureScale}
        />
      </div>

      <div className="absolute bottom-4 right-4 w-24 h-24 opacity-15 pointer-events-none">
        <div className="w-full h-full border border-white/15"></div>
        <div className="absolute top-1 left-1 w-full h-full border border-white/5"></div>
      </div>
    </div>
  );
}


