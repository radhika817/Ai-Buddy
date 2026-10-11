import React from 'react';

/**
 * Shared Button Component
 * Design system: warm editorial, 1px border, 0 shadows, visible focus ring.
 *
 * Variants:
 * - primary: Forest green accent (#166534), white text
 * - secondary: Crisp paper/white, 1px stone border, dark ink text
 * - outline: Transparent background, 1px stone border, dark ink text
 * - ghost: Plain text, subtle hover background
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  children,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg shadow-none select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-pine-600 hover:bg-pine-700 active:bg-pine-800 text-white border border-pine-600 disabled:hover:bg-pine-600',
    secondary:
      'bg-white hover:bg-paper-200 active:bg-paper-300 text-ink-900 border border-stone-200 disabled:hover:bg-white',
    outline:
      'bg-transparent hover:bg-paper-200 active:bg-paper-300 text-ink-800 border border-stone-300',
    ghost:
      'bg-transparent hover:bg-paper-200 active:bg-paper-300 text-ink-700 border border-transparent',
  };

  return (
    <Component
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}
