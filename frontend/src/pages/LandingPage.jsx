import React from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell, TopBar, Button, Badge, Chip, Footer } from '../components/ui';

export default function LandingPage() {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    {
      label: 'How it works',
      href: '#how-it-works',
      onClick: (e) => scrollToSection(e, 'how-it-works'),
    },
    {
      label: 'Features',
      href: '#features',
      onClick: (e) => scrollToSection(e, 'features'),
    },
  ];

  return (
    <AppShell>
      {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
      <TopBar
        brandHref="/"
        navLinks={navLinks}
        action={
          <Button to="/login" variant="outline" size="sm">
            Log in
          </Button>
        }
      />

      {/* ── HERO CONTAINER ──────────────────────────────────────────────── */}
      <div className="w-full pt-12 sm:pt-16 pb-12 px-6 lg:px-10 flex flex-col">
        {/* Contrast Dynamic Headline: Bold Grotesque + Light Whisper Italic (Word-by-word reveal) */}
        <h1 className="text-ink tracking-tighter uppercase leading-[0.95] text-[40px] sm:text-[68px] lg:text-[88px] font-extrabold max-w-6xl mb-8 sm:mb-12 font-display flex flex-wrap gap-x-3 sm:gap-x-5">
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.0 }}
          >
            TURN
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.08 }}
          >
            MEETINGS
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.16 }}
          >
            INTO
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.26 }}
            className="font-light italic tracking-tight lowercase sm:normal-case font-display"
          >
            action
          </motion.span>
        </h1>

        {/* Hero Lavender Accent Panel (Strict flat #DDD9F0, fades in after headline) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.35 }}
          className="relative bg-lavender border border-hairline rounded-panel lg:rounded-frame overflow-hidden p-0 shadow-none"
        >
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            {/* Left Column (~42% on desktop) */}
            <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
              <div>
                <p className="font-sans text-base sm:text-lg text-ink leading-relaxed max-w-md">
                  Upload a recording. Get a transcript, a summary, action items and decisions, then ask questions across all your meetings.
                </p>

                {/* Primary & Outlined Pill Buttons */}
                <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Button to="/register" variant="primary" size="lg">
                    Get started
                  </Button>
                  <Button to="/login" variant="outline" size="lg">
                    Log in
                  </Button>
                </div>
              </div>

              {/* Exact Honest AI & Privacy Footnote */}
              <div className="mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-ink/10 flex items-start gap-2.5">
                <span
                  className="w-2 h-2 rounded-full bg-status-ready-text mt-1.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed">
                  Transcription runs on your own computer. Summaries and chat use Google Gemini.
                </p>
              </div>
            </div>

            {/* Right Column: Browser-Window Product Preview Card (Strictly NO SHADOW, fades in after hero panel) */}
            <div className="lg:col-span-7 relative p-4 sm:p-8 lg:p-10 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: 0.45 }}
                className="w-full max-w-xl bg-surface border border-hairline rounded-card overflow-hidden shadow-none"
              >
                {/* Preview Window Chrome Header */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-frame/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-hairline" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-hairline" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-hairline" aria-hidden="true" />
                    <span className="ml-2 font-display text-xs sm:text-sm font-bold tracking-tight text-ink">
                      Sprint review
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">8 Oct 2026</span>
                    <Badge variant="ready" dot>
                      Ready
                    </Badge>
                  </div>
                </div>

                {/* Functional Preview Tabs */}
                <div className="px-4 sm:px-5 border-b border-hairline flex items-center gap-4 sm:gap-6 text-xs font-sans font-medium text-muted overflow-x-auto">
                  <span className="py-2.5 cursor-default hover:text-ink transition-colors">
                    Summary
                  </span>
                  <span className="py-2.5 text-ink font-semibold border-b-2 border-ink -mb-px flex items-center gap-1 cursor-default">
                    Transcript
                  </span>
                  <span className="py-2.5 cursor-default hover:text-ink transition-colors">
                    Action items
                  </span>
                  <span className="py-2.5 cursor-default hover:text-ink transition-colors">
                    Decisions
                  </span>
                </div>

                {/* Card Body Content Stack */}
                <div className="p-4 sm:p-6 space-y-5 bg-surface">
                  {/* 1. Transcript Excerpt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-sans text-[13px] font-semibold text-ink">
                        Transcript
                      </span>
                      <span className="font-mono text-[11px] text-muted">
                        02:31 – 02:44
                      </span>
                    </div>
                    <div className="bg-frame border border-hairline rounded-xl p-3.5 space-y-2 text-[13px] font-sans leading-relaxed">
                      <p className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-muted shrink-0 font-medium">
                          02:31
                        </span>
                        <span>
                          <strong className="font-semibold text-ink">Radhika:</strong> We need the login page done by Friday.
                        </span>
                      </p>
                      <p className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-muted shrink-0 font-medium">
                          02:42
                        </span>
                        <span>
                          <strong className="font-semibold text-ink">Atharva:</strong> I'll take that.
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 2. Action Items (DM Sans for section label) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-sans text-[11px] font-semibold uppercase text-muted tracking-wider">
                        Action Items (2)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {/* Item 1 */}
                      <div className="p-2.5 sm:p-3 rounded-xl border border-hairline bg-surface flex items-center justify-between gap-2 hover:border-ink transition-colors duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-5 h-5 rounded-[6px] border-[1.5px] border-hairline flex items-center justify-center shrink-0 bg-transparent"
                            aria-hidden="true"
                          />
                          <span className="font-sans text-xs sm:text-sm font-medium text-ink truncate">
                            Finish login page
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Chip variant="lavender">Radhika</Chip>
                          <span className="h-6 px-2 rounded-md bg-frame border border-hairline text-muted font-mono text-xs flex items-center">
                            Fri
                          </span>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="p-2.5 sm:p-3 rounded-xl border border-hairline bg-surface flex items-center justify-between gap-2 hover:border-ink transition-colors duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-5 h-5 rounded-[6px] border-[1.5px] border-hairline flex items-center justify-center shrink-0 bg-transparent"
                            aria-hidden="true"
                          />
                          <span className="font-sans text-xs sm:text-sm font-medium text-ink truncate">
                            Set up Neon database
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Chip variant="blue">Atharva</Chip>
                          <span className="h-6 px-2 rounded-md bg-frame border border-hairline text-muted font-mono text-xs flex items-center">
                            Wed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Decision Box */}
                  <div>
                    <div className="p-3.5 rounded-xl border border-hairline bg-frame flex items-start gap-3">
                      <span className="h-5 px-2 rounded-pill bg-ink text-frame font-sans text-[10px] uppercase font-bold tracking-wider shrink-0 mt-0.5 flex items-center">
                        Decision
                      </span>
                      <p className="font-sans text-xs sm:text-[13px] font-medium text-ink leading-snug">
                        Use PostgreSQL instead of MongoDB.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── HOW IT WORKS SECTION (Fades up on scroll with once: true) ──────── */}
      <motion.section
        id="how-it-works"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="py-16 px-6 lg:px-10 border-t border-hairline"
      >
        <div className="mb-10">
          <p className="font-sans text-xs uppercase tracking-wider text-muted font-semibold mb-2">
            Workflow
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start shadow-none">
            <span className="font-mono text-xs font-bold text-muted tracking-wider">
              01
            </span>
            <h3 className="font-display text-xl font-bold text-ink mt-2 mb-2">
              Upload
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Drop in any audio or video recording from your team discussions, sprint reviews, or interviews.
            </p>
          </div>

          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start shadow-none">
            <span className="font-mono text-xs font-bold text-muted tracking-wider">
              02
            </span>
            <h3 className="font-display text-xl font-bold text-ink mt-2 mb-2">
              Review
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Receive an accurate timestamped transcript, an executive summary, clear action items with owners, and logged decisions.
            </p>
          </div>

          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start shadow-none">
            <span className="font-mono text-xs font-bold text-muted tracking-wider">
              03
            </span>
            <h3 className="font-display text-xl font-bold text-ink mt-2 mb-2">
              Ask
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Ask questions across your entire meeting history with citations back to the exact timestamped discussion.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── FEATURES BENTO GRID (Fades up on scroll with once: true) ───────── */}
      <motion.section
        id="features"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="py-16 px-6 lg:px-10 border-t border-hairline"
      >
        <div className="mb-10">
          <p className="font-sans text-xs uppercase tracking-wider text-muted font-semibold mb-2">
            Capabilities
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Features
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start hover:border-ink transition-colors duration-150 shadow-none">
            <h3 className="font-display text-xl font-bold text-ink mb-3">
              Transcript you can edit
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Every recording becomes a timestamped transcript. Fix mistakes, label who is speaking and search for any word.
            </p>
          </div>

          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start hover:border-ink transition-colors duration-150 shadow-none">
            <h3 className="font-display text-xl font-bold text-ink mb-3">
              Tasks and decisions, found for you
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Action items come with an owner and a deadline, and decisions are logged, so nothing from the meeting is lost.
            </p>
          </div>

          <div className="bg-frame border border-hairline rounded-card p-6 sm:p-8 flex flex-col justify-start hover:border-ink transition-colors duration-150 shadow-none">
            <h3 className="font-display text-xl font-bold text-ink mb-3">
              Ask across all your meetings
            </h3>
            <p className="font-sans text-sm text-muted leading-relaxed">
              Ask a question and get an answer that cites the meeting and the exact moment it came from.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Footer />
    </AppShell>
  );
}
