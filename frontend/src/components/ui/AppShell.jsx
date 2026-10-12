import React from 'react';

/**
 * AppShell Component
 *
 * Implements the DESIGN.md architectural framed canvas:
 * - Outer canvas background: #CFDCE5 (canvas)
 * - Centered artboard frame: max-w-[1440px] #F6F5F3 (frame), 1px solid #DEDAD6 (hairline)
 * - Corner radius: 28px on desktop (rounded-frame), 0px on mobile
 * - Flat planar depth: zero drop shadows (shadow-none)
 */
export default function AppShell({
  children,
  className = '',
  outerClassName = '',
}) {
  return (
    <div
      className={`min-h-screen bg-canvas p-0 sm:p-6 lg:p-10 flex justify-center items-start text-ink antialiased selection:bg-ink selection:text-frame ${outerClassName}`}
    >
      <main
        className={`w-full max-w-[1440px] bg-frame border border-hairline rounded-none md:rounded-frame overflow-hidden flex flex-col min-h-screen relative shadow-none ${className}`}
      >
        {children}
      </main>
    </div>
  );
}
