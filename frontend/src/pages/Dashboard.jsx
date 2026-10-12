import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { AppShell, TopBar, Button, Badge, Footer } from '../components/ui';
import { AnimatedNumber } from '../lib/motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch meetings and task stats in parallel
      const [meetingsRes, statsRes] = await Promise.allSettled([
        api.get('/meetings'),
        api.get('/tasks/stats'),
      ]);

      if (meetingsRes.status === 'fulfilled') {
        setMeetings(meetingsRes.value.data || []);
      } else {
        throw new Error('Could not load meetings from the server.');
      }

      if (statsRes.status === 'fulfilled') {
        setTaskStats(statsRes.value.data || null);
      } else {
        setTaskStats(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Could not load meetings from the server. Please check backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const handleDelete = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/meetings/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));

      // Refresh task stats quietly
      try {
        const statsRes = await api.get('/tasks/stats');
        setTaskStats(statsRes.data);
      } catch {
        // ignore
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete meeting.');
    } finally {
      setDeletingId(null);
    }
  };

  // Format date as "8 Oct 2026"
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format seconds as mm:ss or h:mm:ss
  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
      return '—';
    }
    const totalSecs = Math.round(seconds);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    if (h > 0) {
      return `${h}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const renderStatusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'ready':
        return <Badge variant="ready">Ready</Badge>;
      case 'failed':
        return <Badge variant="failed">Failed</Badge>;
      case 'uploaded':
      case 'transcribing':
      case 'analyzing':
      default:
        return <Badge variant="analyzing">Analyzing</Badge>;
    }
  };

  // Filter meetings by search query and status filter
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFilter === 'all') return true;
    const s = m.status?.toLowerCase();
    if (selectedFilter === 'ready') return s === 'ready';
    if (selectedFilter === 'processing')
      return ['uploaded', 'transcribing', 'analyzing'].includes(s);
    if (selectedFilter === 'failed') return s === 'failed';
    return true;
  });

  // Real statistics derived from GET /tasks/stats or meetings list
  const totalMeetings = taskStats?.total_meetings ?? meetings.length;
  const openTasks = taskStats?.pending_count ?? 0;
  const doneTasks = taskStats?.done_count ?? 0;

  // Real subtitle
  const subtitleText = `${totalMeetings} ${
    totalMeetings === 1 ? 'recording' : 'recordings'
  }, ${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}.`;

  const navLinks = [
    { label: 'Meetings', href: '/dashboard', active: true },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Ask AI', href: '/chat' },
  ];

  return (
    <AppShell>
      {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
      <TopBar
        brandHref="/dashboard"
        navLinks={navLinks}
        action={
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        }
      />

      {/* ── INNER DASHBOARD CONTENT ────────────────────────────────────── */}
      <div className="px-6 md:px-10 py-10 flex flex-col flex-1">
        {/* 1. PAGE HEADER */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
          <div>
            <div className="flex items-baseline flex-wrap gap-x-3.5">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] lg:leading-[60px] font-extrabold tracking-tight text-ink uppercase">
                YOUR
              </h1>
              <span className="font-display text-4xl sm:text-5xl lg:text-[56px] lg:leading-[60px] font-light italic tracking-tight text-ink uppercase">
                MEETINGS
              </span>
            </div>
            <p className="font-sans text-sm sm:text-base text-muted mt-2">
              {subtitleText}
            </p>
          </div>
          <div>
            <Button to="/upload" variant="primary" size="md">
              Upload a recording
            </Button>
          </div>
        </section>

        {/* 2. STATS ROW (Flat Lavender Panel) */}
        <section
          aria-label="Key Performance Statistics"
          className="w-full bg-lavender border border-hairline rounded-panel p-6 sm:p-8 mb-8 shadow-none"
        >
          <div className="grid grid-cols-3">
            {/* Stat 1: Meetings */}
            <div className="flex flex-col border-r border-ink/15 pr-4 sm:pr-8">
              <span className="font-mono text-3xl sm:text-4xl lg:text-[44px] lg:leading-none font-semibold text-ink tabular-nums">
                <AnimatedNumber value={totalMeetings} duration={0.6} />
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-2 font-medium">
                Meetings
              </span>
            </div>

            {/* Stat 2: Open Tasks */}
            <div className="flex flex-col px-4 sm:px-8 border-r border-ink/15">
              <span className="font-mono text-3xl sm:text-4xl lg:text-[44px] lg:leading-none font-semibold text-ink tabular-nums">
                <AnimatedNumber value={openTasks} duration={0.6} />
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-2 font-medium">
                Open tasks
              </span>
            </div>

            {/* Stat 3: Done */}
            <div className="flex flex-col pl-4 sm:pl-8">
              <span className="font-mono text-3xl sm:text-4xl lg:text-[44px] lg:leading-none font-semibold text-ink tabular-nums">
                <AnimatedNumber value={doneTasks} duration={0.6} />
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-2 font-medium">
                Done
              </span>
            </div>
          </div>
        </section>

        {/* 3. CONTROLS ROW */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Search Pill */}
          <div className="relative w-full sm:w-80 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings or transcripts"
              className="w-full rounded-pill bg-surface border border-hairline px-5 py-2.5 font-sans text-sm text-ink placeholder-muted/60 focus:outline-none focus:border-ink transition-colors shadow-none"
            />
          </div>

          {/* Filter Pill Cluster */}
          <div
            aria-label="Filter status"
            className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0"
            role="group"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'ready', label: 'Ready' },
              { id: 'processing', label: 'Processing' },
              { id: 'failed', label: 'Failed' },
            ].map((filter) => {
              const isActive = selectedFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-1.5 rounded-pill font-sans text-sm font-medium shrink-0 active:scale-95 transition-all shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                    isActive
                      ? 'bg-ink text-frame'
                      : 'bg-surface border border-hairline text-muted hover:text-ink hover:border-ink'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. MEETINGS TABLE / STATES */}

        {/* Flat Skeleton Loader (Flat solid tint, opacity only pulse, no gradients/shimmers) */}
        {loading && (
          <div className="bg-surface rounded-table border border-hairline overflow-hidden p-6 space-y-4 shadow-none">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-hairline/40 last:border-0"
              >
                <div className="h-4 w-44 bg-hairline/60 rounded animate-flat-pulse" />
                <div className="h-4 w-24 bg-hairline/60 rounded animate-flat-pulse" />
                <div className="h-4 w-16 bg-hairline/60 rounded animate-flat-pulse" />
                <div className="h-6 w-20 bg-hairline/60 rounded-pill animate-flat-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry Button */}
        {error && !loading && (
          <div className="p-6 bg-status-failed-bg border border-status-failed-text/20 rounded-table flex flex-col sm:flex-row items-center justify-between gap-4 text-status-failed-text shadow-none">
            <span className="font-sans text-sm">{error}</span>
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State (No meetings in account) */}
        {!loading && !error && meetings.length === 0 && (
          <div className="bg-surface rounded-table border border-hairline p-12 text-center shadow-none">
            <h3 className="font-display text-xl font-bold text-ink">
              No meetings yet
            </h3>
            <p className="font-sans text-sm text-muted mt-1 mb-6 max-w-sm mx-auto">
              Upload your first meeting recording to generate transcripts, summaries, and action items.
            </p>
            <Button to="/upload" variant="primary" size="md">
              Upload a recording
            </Button>
          </div>
        )}

        {/* No Results State (Search/Filter returned 0) */}
        {!loading && !error && meetings.length > 0 && filteredMeetings.length === 0 && (
          <div className="bg-surface rounded-table border border-hairline p-10 text-center shadow-none">
            <h3 className="font-display text-lg font-bold text-ink">
              No matching meetings
            </h3>
            <p className="font-sans text-sm text-muted mt-1 mb-4">
              {searchQuery
                ? `No meetings match "${searchQuery}".`
                : 'No meetings match the selected filter.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Table Card (Desktop Table + Mobile Stacked List) */}
        {!loading && !error && filteredMeetings.length > 0 && (
          <div className="bg-surface rounded-table border border-hairline overflow-hidden shadow-none">
            {/* Desktop Table View (sm:table) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-frame border-b border-hairline">
                    <th
                      scope="col"
                      className="font-mono text-[11px] uppercase tracking-wider text-muted px-6 py-4 font-semibold"
                    >
                      TITLE
                    </th>
                    <th
                      scope="col"
                      className="font-mono text-[11px] uppercase tracking-wider text-muted px-6 py-4 font-semibold"
                    >
                      DATE
                    </th>
                    <th
                      scope="col"
                      className="font-mono text-[11px] uppercase tracking-wider text-muted px-6 py-4 font-semibold"
                    >
                      DURATION
                    </th>
                    <th
                      scope="col"
                      className="font-mono text-[11px] uppercase tracking-wider text-muted px-6 py-4 font-semibold"
                    >
                      STATUS
                    </th>
                    <th
                      scope="col"
                      className="font-mono text-[11px] uppercase tracking-wider text-muted px-6 py-4 text-right w-24"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  <AnimatePresence initial={false}>
                    {filteredMeetings.map((meeting, index) => {
                      const isAnimated = index < 10;
                      return (
                        <motion.tr
                          key={meeting.id}
                          layout
                          initial={isAnimated ? { opacity: 0, y: 4 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            height: 0,
                            transition: { duration: 0.2, ease: 'easeOut' },
                          }}
                          transition={{
                            duration: 0.2,
                            delay: isAnimated ? index * 0.03 : 0,
                            ease: 'easeOut',
                          }}
                          onClick={() => navigate(`/meetings/${meeting.id}`)}
                          className="bg-surface hover:bg-frame/60 transition-colors cursor-pointer group"
                        >
                          {/* Title */}
                          <td className="px-6 py-5 font-sans text-sm font-medium text-ink whitespace-nowrap">
                            <span className="group-hover:underline">
                              {meeting.title}
                            </span>
                          </td>

                          {/* Date (JetBrains Mono) */}
                          <td className="px-6 py-5 font-mono text-xs text-muted whitespace-nowrap">
                            {formatDate(meeting.created_at)}
                          </td>

                          {/* Duration (JetBrains Mono) */}
                          <td className="px-6 py-5 font-mono text-xs text-muted whitespace-nowrap">
                            {formatDuration(meeting.duration_seconds)}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="inline-flex items-center">
                              {renderStatusBadge(meeting.status)}
                              {meeting.status?.toLowerCase() === 'failed' && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDelete(e, meeting.id, meeting.title)
                                  }
                                  disabled={deletingId === meeting.id}
                                  className="font-sans text-xs text-status-failed-text underline ml-2 hover:opacity-80 cursor-pointer font-medium"
                                  title="Delete failed meeting"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Trailing Quiet Delete Action + Arrow (shifts 2px on hover) */}
                          <td className="px-6 py-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDelete(e, meeting.id, meeting.title)
                                }
                                disabled={deletingId === meeting.id}
                                className="text-muted hover:text-status-failed-text p-1 text-xs font-sans transition-colors cursor-pointer font-medium"
                                title="Delete meeting"
                                aria-label={`Delete meeting ${meeting.title}`}
                              >
                                {deletingId === meeting.id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  <span className="hover:underline">Delete</span>
                                )}
                              </button>
                              <span className="text-muted group-hover:text-ink group-hover:translate-x-[2px] inline-block transition-transform duration-150">
                                →
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Rows View (sm:hidden, no horizontal scroll) */}
            <div className="sm:hidden divide-y divide-hairline">
              <AnimatePresence initial={false}>
                {filteredMeetings.map((meeting, index) => {
                  const isAnimated = index < 10;
                  return (
                    <motion.div
                      key={meeting.id}
                      layout
                      initial={isAnimated ? { opacity: 0, y: 4 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        transition: { duration: 0.2, ease: 'easeOut' },
                      }}
                      transition={{
                        duration: 0.2,
                        delay: isAnimated ? index * 0.03 : 0,
                        ease: 'easeOut',
                      }}
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                      className="p-4 hover:bg-frame/60 transition-colors cursor-pointer flex flex-col gap-2.5"
                    >
                      {/* Top Stack: Title + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-sans text-sm font-medium text-ink truncate">
                          {meeting.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderStatusBadge(meeting.status)}
                          {meeting.status?.toLowerCase() === 'failed' && (
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDelete(e, meeting.id, meeting.title)
                              }
                              disabled={deletingId === meeting.id}
                              className="font-sans text-xs text-status-failed-text underline font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Stack: Date + Duration + Delete + Arrow */}
                      <div className="flex items-center justify-between text-xs text-muted font-mono pt-1">
                        <div className="flex items-center gap-2">
                          <span>{formatDate(meeting.created_at)}</span>
                          <span>•</span>
                          <span>{formatDuration(meeting.duration_seconds)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDelete(e, meeting.id, meeting.title)
                            }
                            disabled={deletingId === meeting.id}
                            className="font-sans text-xs text-muted hover:text-status-failed-text underline font-medium"
                          >
                            Delete
                          </button>
                          <span className="group-hover:translate-x-[2px] transition-transform duration-150 inline-block">
                            →
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 5. BELOW THE TABLE: Plain Text Link */}
        <div className="mt-6">
          <Link
            to="/chat"
            className="font-sans text-sm font-medium text-ink hover:underline inline-flex items-center gap-1.5 transition-all"
          >
            <span>Ask across all meetings</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Footer />
    </AppShell>
  );
}
