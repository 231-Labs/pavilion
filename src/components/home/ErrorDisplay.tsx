import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="px-5 py-3 text-[12px] text-red-300">
      {error}
    </div>
  );
}
