'use client';

import React, { useState } from 'react';
import { HomeBackground } from '../components/home/HomeBackground';
import { HomeHeader } from '../components/home/HomeHeader';
import { BrandSection } from '../components/home/BrandSection';
import { ModeToggle } from '../components/home/ModeToggle';
import { CreatePavilionSection } from '../components/home/CreatePavilionSection';
import { VisitPavilionSection } from '../components/home/VisitPavilionSection';
import { DesignerSection } from '../components/home/DesignerSection';
import { ErrorDisplay } from '../components/home/ErrorDisplay';
import type { Mode, CreateSubMode, VisitSubMode } from '../types/home';

export default function Home() {
  const [mode, setMode] = useState<Mode>('collector');
  const [createSubMode, setCreateSubMode] = useState<CreateSubMode>('new');
  const [visitSubMode, setVisitSubMode] = useState<VisitSubMode>('my');
  const [error, setError] = useState<string | null>(null);

  const onSlabClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, svg, select, textarea, [role="button"]')) return;
    if (error) setError(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden film-noise flex flex-col">
      {/* Background */}
      <HomeBackground />

      {/* Header */}
      <HomeHeader />

      {/* Main Content - Glass Ribbon Layout */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex-1 grid place-items-center">
        <div className="architect-grid"></div>

        <section 
          className="relative mx-auto glass-ribbon rounded-xl border border-white/10 overflow-hidden -translate-y-4 md:-translate-y-6"
          style={{
            width: 'clamp(320px, 85vw, 1400px)',
            minHeight: 'clamp(500px, 60vh, 800px)'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Left: Brand & Narrative */}
            <BrandSection />

            {/* Right: Actions - Single Frosted Glass Area */}
            <div
              className="glass-slab glass-slab--thermal rounded-xl overflow-hidden self-center w-full flex flex-col"
              style={{
                padding: 'clamp(16px, 3vw, 32px)',
                minHeight: 'clamp(600px, 65vh, 850px)'
              }}
              onClick={onSlabClick}
              onMouseMove={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                const rect = target.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * 100;
                const my = ((e.clientY - rect.top) / rect.height) * 100;
                target.style.setProperty('--mx', `${mx}`);
                target.style.setProperty('--my', `${my}`);
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.setProperty('--mx', `50`);
                target.style.setProperty('--my', `50`);
              }}
            >
                {/* Mode Toggle (Collector / Designer) */}
              <ModeToggle mode={mode} setMode={setMode} />

              {/* Content Container with Fixed Height */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {mode === 'collector' ? (
                  <>
                    {/* Create Pavilion */}
                    <CreatePavilionSection 
                      createSubMode={createSubMode}
                      setCreateSubMode={setCreateSubMode}
                    />

                    {/* Error Display */}
                    <ErrorDisplay error={error} />

                    {/* Divider */}
                    <div className="flex justify-center items-center py-2">
                      <div className="slab-divider w-full" />
                    </div>

                    {/* Visit Pavilion */}
                    <VisitPavilionSection 
                      visitSubMode={visitSubMode}
                      setVisitSubMode={setVisitSubMode}
                      onError={setError}
                    />
                  </>
                ) : (
                  <>
                    {/* Designer Mode */}
                    <DesignerSection />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Architectural Frame */}
      <div className="architect-frame" />
    </div>
  );
}