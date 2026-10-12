import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Button Component
 *
 * Implements DESIGN.md button specifications:
 * - Full rounded pill geometry (rounded-pill / rounded-full)
 * - Zero drop shadows (shadow-none)
 * - Visible focus rings
 * - Primary pill: #1D1618 fill, #F6F5F3 text
 * - Outlined pill: 1px border (#1D1618 or hairline), #1D1618 text
 */
export default function Button({
  as,
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  children,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-semibold rounded-pill shadow-none select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2';

  const sizeStyles = {
    sm: 'h-10 px-5 text-sm gap-2',
    md: 'h-12 px-7 text-sm sm:text-base gap-2.5',
    lg: 'h-12 px-8 text-base gap-3',
  };

  const variantStyles = {
    // Primary pill: lifts 1px and dims slightly on hover, small press scale 0.98 on click
    primary:
      'bg-ink text-frame border border-transparent hover:-translate-y-[1px] hover:opacity-90 active:scale-[0.98]',
    // Outlined pill: border darkens on hover
    outline:
      'border border-hairline bg-transparent text-ink hover:border-ink hover:bg-ink/5 active:scale-[0.98] transition-colors',
    // Hairline outlined pill
    'outline-hairline':
      'border border-hairline bg-transparent text-ink hover:border-ink hover:bg-ink/5 active:scale-[0.98] transition-colors',
    // Secondary alias for backward compatibility
    secondary:
      'border border-hairline bg-transparent text-ink hover:border-ink hover:bg-ink/5 active:scale-[0.98] transition-colors',
    // Ghost: text with hover background
    ghost:
      'bg-transparent text-muted hover:text-ink hover:bg-ink/5 border border-transparent active:scale-[0.98] transition-colors',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
    variantStyles[variant] || variantStyles.primary
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses} {...props}>
        {children}
      </a>
    );
  }

  const Component = as || 'button';

  return (
    <Component
      className={combinedClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}
