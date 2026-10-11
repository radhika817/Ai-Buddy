import React from 'react';

/**
 * Shared Badge Component
 * Warm editorial direction: 1px border, 0 shadows, compact padding.
 *
 * Variants:
 * - neutral: subtle paper background, ink text, stone border
 * - accent: pale green tint, pine text, green border
 * - mono: monospace font for numbers / dates
 */
export default function Badge({
  variant = 'neutral',
  className = '',
  children,
  ...props
}) {
  const variantStyles = {
    neutral: 'bg-paper-200 text-ink-700 border-stone-200',
    accent: 'bg-emerald-50 text-pine-700 border-emerald-200/80',
    mono: 'font-mono text-xs bg-paper-100 text-ink-600 border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-none ${
        variantStyles[variant] || variantStyles.neutral
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
