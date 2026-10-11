import React from 'react';

/**
 * Shared PageHeader Component
 * Warm editorial direction: serif heading, DM Sans description, optional mono kicker.
 */
export default function PageHeader({
  kicker,
  title,
  description,
  className = '',
  children,
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {kicker && (
        <p className="font-mono text-xs uppercase tracking-wider text-pine-600 font-medium">
          {kicker}
        </p>
      )}
      {title && (
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-ink-900 tracking-tight leading-[1.15]">
          {title}
        </h1>
      )}
      {description && (
        <p className="text-base sm:text-lg text-ink-600 leading-relaxed max-w-2xl font-normal">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
