import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * TopBar Component
 *
 * Implements the DESIGN.md top navigation bar:
 * - Height: 80px (h-20), sticky at top
 * - Background: #F6F5F3 (bg-frame), 1px solid #DEDAD6 bottom border (border-b border-hairline)
 * - Brand wordmark: geometric icon mark + "AI Buddy" in Inter Extrabold
 * - Center nav: active nav pills (#1D1618 fill) and inactive muted links
 * - Trailing action: outlined pill button
 */
export default function TopBar({
  brandHref = '/',
  navLinks = [],
  action,
  className = '',
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={`w-full sticky top-0 z-40 bg-frame border-b border-hairline shadow-none ${className}`}>
      <div className="w-full px-6 lg:px-10 h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          to={brandHref}
          className="flex items-center gap-3 active:scale-[0.98] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-lg"
          aria-label="AI Buddy home"
        >
          <div className="w-7 h-7 rounded bg-ink flex items-center justify-center text-frame shrink-0">
            <svg
              fill="none"
              height="14"
              viewBox="0 0 14 14"
              width="14"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect fill="#F6F5F3" height="4" width="4" x="2" y="2" />
              <circle cx="9.5" cy="4" fill="#F6F5F3" r="2" />
              <rect fill="#F6F5F3" height="4" rx="1" width="10" x="2" y="8" />
            </svg>
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            AI Buddy
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        {navLinks && navLinks.length > 0 && (
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-2">
            {navLinks.map((link, idx) => {
              const isActive = Boolean(link.active);
              const isExternalOrAnchor = link.href?.startsWith('#') || link.href?.startsWith('http');

              const linkClasses = isActive
                ? 'px-4 py-1.5 rounded-pill bg-ink text-frame font-sans text-sm font-medium transition-transform active:scale-95 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink'
                : 'px-4 py-1.5 rounded-pill text-muted hover:text-ink font-sans text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';

              if (isExternalOrAnchor) {
                return (
                  <a
                    key={link.label || idx}
                    href={link.href}
                    onClick={link.onClick}
                    className={linkClasses}
                  >
                    {link.label}
                  </a>
                );
              }

              return (
                <Link
                  key={link.label || idx}
                  to={link.href}
                  onClick={link.onClick}
                  className={linkClasses}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Trailing Desktop Action */}
        <div className="hidden md:flex items-center gap-3">
          {action}
        </div>

        {/* Mobile Hamburger Button */}
        {(navLinks.length > 0 || action) && (
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-ink hover:text-black rounded-lg border border-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-hairline bg-frame px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link, idx) => {
            const isExternalOrAnchor = link.href?.startsWith('#') || link.href?.startsWith('http');
            const handler = (e) => {
              if (link.onClick) link.onClick(e);
              setMobileMenuOpen(false);
            };

            if (isExternalOrAnchor) {
              return (
                <a
                  key={link.label || idx}
                  href={link.href}
                  onClick={handler}
                  className="py-2 text-sm font-medium text-ink hover:text-black"
                >
                  {link.label}
                </a>
              );
            }

            return (
              <Link
                key={link.label || idx}
                to={link.href}
                onClick={handler}
                className="py-2 text-sm font-medium text-ink hover:text-black"
              >
                {link.label}
              </Link>
            );
          })}
          {action && (
            <div className="pt-2 border-t border-hairline flex flex-col">
              {action}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
