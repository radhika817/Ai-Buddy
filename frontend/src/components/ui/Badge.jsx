import React from 'react';

/**
 * Badge Component
 *
 * Implements the single canonical status palette from DESIGN.md:
 * - Ready: #E6F3EB background / #2C5E40 text
 * - Analyzing: #E8F0F8 background / #2E5580 text
 * - Failed: #FBEAE8 background / #9A2D22 text
 * - Warning: #FAF4E8 background / #BE8A2E text
 *
 * Shape: Full rounded pill, zero shadows
 * Typography: JetBrains Mono ONLY, uppercase, letter-spacing +0.08em
 */
export default function Badge({
  variant = 'ready',
  dot = false,
  className = '',
  children,
  ...props
}) {
  const normalizedVariant = variant.toLowerCase();

  const variantStyles = {
    ready: 'bg-status-ready-bg text-status-ready-text border-status-ready-text/20',
    success: 'bg-status-ready-bg text-status-ready-text border-status-ready-text/20',
    accent: 'bg-status-ready-bg text-status-ready-text border-status-ready-text/20', // backward compatibility
    analyzing: 'bg-status-analyzing-bg text-status-analyzing-text border-status-analyzing-text/20',
    processing: 'bg-status-analyzing-bg text-status-analyzing-text border-status-analyzing-text/20',
    failed: 'bg-status-failed-bg text-status-failed-text border-status-failed-text/20',
    error: 'bg-status-failed-bg text-status-failed-text border-status-failed-text/20',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-text/20',
    pending: 'bg-status-warning-bg text-status-warning-text border-status-warning-text/20',
    neutral: 'bg-frame text-muted border-hairline',
  };

  const style = variantStyles[normalizedVariant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-pill font-mono text-[11px] font-semibold uppercase tracking-wider border shadow-none select-none ${style} ${className}`}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
