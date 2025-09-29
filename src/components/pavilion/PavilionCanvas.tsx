import React from 'react';

interface PavilionCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function PavilionCanvas({ canvasRef }: PavilionCanvasProps) {
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full z-0" 
    />
  );
}
