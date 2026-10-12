import React from 'react';

/**
 * Footer Component
 *
 * Implements DESIGN.md footer:
 * - Content: "Built by Radhika" and GitHub link
 * - Border: 1px solid #DEDAD6 top border (border-t border-hairline)
 * - Typography: DM Sans text-sm text-muted
 * - Zero shadows, clean planar presentation
 */
export default function Footer({ className = '' }) {
  return (
    <footer
      className={`w-full border-t border-hairline px-6 lg:px-10 py-6 bg-frame mt-auto shadow-none ${className}`}
    >
      <div className="w-full flex items-center justify-between text-xs sm:text-sm font-sans text-muted">
        <span>Built by Radhika</span>
        <a
          href="https://github.com/radhika817/Ai-Buddy"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors duration-150 underline decoration-hairline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
