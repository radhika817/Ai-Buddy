import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, ArrowUpRight, Check, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { Button, Card, Badge } from '../components/ui';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const showDemoButton = Boolean(demoEmail && demoPassword);

  const handleDemoLogin = async () => {
    if (!demoEmail || !demoPassword) return;
    setDemoLoading(true);
    setDemoError('');

    try {
      const response = await api.post('/auth/login', {
        email: demoEmail.trim(),
        password: demoPassword,
      });

      localStorage.setItem('token', response.data.access_token);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      window.dispatchEvent(new Event('auth-change'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setDemoError('Could not log into the demo account. Please try signing in manually.');
    } finally {
      setDemoLoading(false);
    }
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-[#FBF9F5] text-ink-900 font-sans selection:bg-emerald-100 selection:text-pine-800"
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link
            to="/"
            className="text-xl font-serif font-bold text-ink-900 tracking-tight hover:text-pine-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded"
          >
            AI Buddy
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded"
            >
              Features
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {showDemoButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDemoLogin}
                loading={demoLoading}
                className="text-xs"
              >
                Try the demo
              </Button>
            )}
            <Button as={Link} to="/login" variant="ghost" size="sm">
              Log in
            </Button>
            <Button as={Link} to="/register" variant="primary" size="sm">
              Get started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-ink-600 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded-lg"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-stone-200 bg-[#FBF9F5] px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2">
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, 'how-it-works')}
                className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900 rounded-md"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, 'features')}
                className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900 rounded-md"
              >
                Features
              </a>
            </nav>
            <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
              {showDemoButton && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDemoLogin}
                  loading={demoLoading}
                  className="w-full justify-center"
                >
                  Try the demo
                </Button>
              )}
              <Button
                as={Link}
                to="/login"
                variant="secondary"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full justify-center"
              >
                Log in
              </Button>
              <Button
                as={Link}
                to="/register"
                variant="primary"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full justify-center"
              >
                Get started
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Demo Error Banner (if one-click demo fails) */}
      {demoError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-center justify-between">
            <span>{demoError}</span>
            <button
              type="button"
              onClick={() => setDemoError('')}
              className="text-xs underline ml-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── 1. HERO SECTION ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-start">
            {/* Left Column: Headline, Copy, CTAs */}
            <div className="lg:col-span-6 flex flex-col items-start pt-2">
              <h1 className="text-4xl sm:text-5xl font-serif font-normal text-ink-900 tracking-tight leading-[1.12]">
                Turn meeting recordings into notes you can act on.
              </h1>
              <p className="mt-5 text-lg text-ink-600 leading-relaxed max-w-xl font-normal">
                Upload a recording. Get a transcript, a summary, action items and
                decisions, then ask questions across all your meetings.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button as={Link} to="/register" variant="primary" size="lg">
                  Get started
                </Button>
                <Button as={Link} to="/login" variant="secondary" size="lg">
                  Log in
                </Button>
                {showDemoButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleDemoLogin}
                    loading={demoLoading}
                  >
                    Try the demo
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column: Static HTML/CSS Product Preview */}
            <div className="lg:col-span-6 w-full">
              <Card className="bg-white border-stone-200 p-5 sm:p-6 text-left">
                {/* Preview Header */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">Ready</Badge>
                    <span className="font-mono text-xs text-ink-500">
                      10 Oct 2026 · 28 min
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-500 uppercase tracking-wider">
                    SAMPLE
                  </span>
                </div>

                <div className="mt-3">
                  <h2 className="text-lg font-serif font-medium text-ink-900 leading-snug">
                    Sprint Planning & Architecture Review
                  </h2>
                </div>

                {/* Sample Transcript */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-2.5">
                    Transcript
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded bg-paper-100 border border-stone-200/60">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[11px] text-ink-500">
                          00:04:12
                        </span>
                        <span className="font-semibold text-ink-900">
                          Priya Sharma
                        </span>
                      </div>
                      <p className="text-ink-600 leading-relaxed">
                        "Let's finalize the pgvector chunking before Wednesday so the
                        Q&amp;A endpoint has fresh citations."
                      </p>
                    </div>

                    <div className="p-2 rounded bg-paper-100 border border-stone-200/60">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[11px] text-ink-500">
                          00:04:38
                        </span>
                        <span className="font-semibold text-ink-900">
                          Marcus Chen
                        </span>
                      </div>
                      <p className="text-ink-600 leading-relaxed">
                        "Agreed. I will finish the migration script and run the
                        test suite against Neon today."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sample Action Items */}
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-2">
                    Action Items
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2.5 p-2 rounded bg-paper-50 border border-stone-200/60">
                      <span className="w-4 h-4 rounded border border-stone-300 mt-0.5 flex-shrink-0 flex items-center justify-center text-stone-400">
                        {/* unchecked */}
                      </span>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="font-medium text-ink-800">
                          Finalize pgvector migration and run indexing tests
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-500 flex-shrink-0">
                          <span>Marcus</span>
                          <span>·</span>
                          <span>Due 15 Oct</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded bg-paper-50 border border-stone-200/60">
                      <span className="w-4 h-4 rounded border border-stone-300 mt-0.5 flex-shrink-0 flex items-center justify-center text-stone-400">
                        {/* unchecked */}
                      </span>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="font-medium text-ink-800">
                          Draft follow-up email for the platform team
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-500 flex-shrink-0">
                          <span>Priya</span>
                          <span>·</span>
                          <span>Due Friday</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Decision */}
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-1.5">
                    Logged Decision
                  </p>
                  <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-200/60 text-xs">
                    <p className="text-pine-800 leading-relaxed font-medium">
                      Decision: Keep processing modular so Whisper and FastEmbed
                      run locally, while cloud deployments stay completely free.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-wider text-pine-600 font-medium mb-2">
              Workflow
            </p>
            <h2 className="text-3xl font-serif font-normal text-ink-900 tracking-tight">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="border-t border-stone-200 pt-5">
              <span className="font-mono text-xs font-semibold text-pine-600 tracking-wider">
                01
              </span>
              <h3 className="text-xl font-serif font-medium text-ink-900 mt-2 mb-2">
                Upload
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Drop in any audio or video recording from your team meeting or interview.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border-t border-stone-200 pt-5">
              <span className="font-mono text-xs font-semibold text-pine-600 tracking-wider">
                02
              </span>
              <h3 className="text-xl font-serif font-medium text-ink-900 mt-2 mb-2">
                Review
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Get an accurate transcript, structured summary, action items with owners, and key decisions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border-t border-stone-200 pt-5">
              <span className="font-mono text-xs font-semibold text-pine-600 tracking-wider">
                03
              </span>
              <h3 className="text-xl font-serif font-medium text-ink-900 mt-2 mb-2">
                Ask
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Search across your meeting history or ask questions with citations pointing to the exact spoken moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ──────────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-wider text-pine-600 font-medium mb-2">
              Capabilities
            </p>
            <h2 className="text-3xl font-serif font-normal text-ink-900 tracking-tight">
              Features
            </h2>
          </div>

          {/* Plain two-column list (not cards with icons on every item) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Timestamped transcript you can edit and label by speaker
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Accurate speech-to-text with precise timestamps for every segment. Rename speakers and correct transcript text inline.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Summary and key points
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Structured executive overview and bulleted key takeaways extracted automatically from the transcript.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Action items with owners and deadlines
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Identified tasks assigned to participants, with spoken dates parsed into calendar deadlines for completion tracking.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Decisions log
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                A clean log of explicit agreements and architectural decisions made throughout the meeting.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Chat that answers from your meetings and cites the exact moment
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Cross-meeting Q&amp;A that searches transcript chunks by meaning and provides direct links back to timestamped quotes.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Task board across meetings
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                A consolidated view of every action item across all meetings, with status toggles, overdue indicators, and quick filters.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-4 md:col-span-2">
              <h3 className="text-base font-semibold text-ink-900 mb-1">
                Export notes as Markdown and draft a follow-up email
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed max-w-2xl">
                Download a clean Markdown recap with full transcript and checklists, or generate a drafted follow-up email in a friendly or formal tone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HONEST NOTE SECTION ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border border-stone-200 bg-[#FAF8F4] p-6 sm:p-8 rounded-xl text-left">
            <h2 className="text-xl font-serif font-medium text-ink-900 tracking-tight">
              An honest note about this demo
            </h2>
            <p className="mt-3 text-sm text-ink-700 leading-relaxed max-w-3xl">
              This is a personal portfolio project. Speech-to-text transcription runs
              locally on the developer's machine using Whisper, so live audio processing
              is turned off on the free cloud deployment. The live demo lets you explore
              all features using pre-processed sample meetings.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. FOOTER ────────────────────────────────────────────────────── */}
      <footer className="py-10 text-sm text-ink-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Built by Radhika · {new Date().getFullYear()}
          </p>
          <a
            href="https://github.com/radhika817/Ai-Buddy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-ink-600 hover:text-pine-600 underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 rounded"
          >
            <span>GitHub repository</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </motion.div>
  );
}
