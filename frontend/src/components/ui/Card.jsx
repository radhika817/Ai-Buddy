import React from 'react';

/**
 * Shared Card Component
 * Warm editorial direction: paper/white background, 1px stone border, 0 shadows.
 */
export default function Card({
  as: Component = 'div',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={`bg-white border border-stone-200/80 rounded-xl p-6 shadow-none text-ink-900 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
