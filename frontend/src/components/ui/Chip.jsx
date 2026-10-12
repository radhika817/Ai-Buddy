import React from 'react';

/**
 * Chip Component (Assignee / Speaker Chip)
 *
 * Implements DESIGN.md assignee & speaker chips:
 * - Shape: Full pill (rounded-pill / rounded-full), zero shadows
 * - Border: 1px solid #DEDAD6 (border-hairline)
 * - Backgrounds: Flat #DDD9F0 (bg-lavender) or #D9E3ED (bg-chip-blue)
 * - Typography: DM Sans ONLY (font-sans text-xs sm:text-[13px] font-semibold text-ink)
 *   (Strict rule: speaker/assignee names must NOT use monospace)
 */
export default function Chip({
  name,
  variant = 'lavender',
  className = '',
  children,
  ...props
}) {
  const variantStyles = {
    lavender: 'bg-lavender text-ink border-hairline',
    blue: 'bg-chip-blue text-ink border-hairline',
    frame: 'bg-frame text-ink border-hairline',
  };

  const style = variantStyles[variant] || variantStyles.lavender;
  const label = children || name;

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-pill font-sans text-xs sm:text-[13px] font-semibold border shadow-none select-none ${style} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
}
