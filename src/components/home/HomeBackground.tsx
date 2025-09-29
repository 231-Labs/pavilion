import React from 'react';

export function HomeBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0A0A0A] to-[#0F0F12]"></div>
      
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.04),transparent_40%)]"></div>
      </div>
      
      <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,255,255,0.06),transparent_50%)] mix-blend-overlay"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-white/10"></div>
      
      {/* Terminal grid */}
      <div className="terminal-grid"></div>
    </div>
  );
}
