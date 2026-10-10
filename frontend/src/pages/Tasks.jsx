import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  Filter,
  User,
  ExternalLink,
  Check,
  RotateCw,
  Search,
  ArrowUpDown,
  Sparkles,
  Inbox,
  AlertCircle,
  X,
} from 'lucide-react';
import api from '../services/api';

// Animated CountUp component for stats
function CountUp({ target = 0, duration = 650 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startVal = current;
    const diff = target - startVal;

    if (diff === 0) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(startVal + diff * eased));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const req = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(req);
  }, [target, duration]);

  return <span>{current}</span>;
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total_meetings: 0,
    total_action_items: 0,
    pending_count: 0,
    done_count: 0,
    overdue_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters and sorting state
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'done'
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' | specific name | 'unassigned'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'deadline'

  // Master list of unique assignees collected from all tasks
  const [availableAssignees, setAvailableAssignees] = useState({
    names: [],
    hasUnassigned: false,
  });

  // Check if a task is overdue (pending and deadline_date before today)
  const isTaskOverdue = useCallback((task) => {
    if (task.status !== 'pending' || !task.deadline_date) return false;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      return task.deadline_date < todayStr;
    } catch {
      return false;
    }
  }, []);

  // Format deadline date for display
  const formatDeadlineDate = useCallback((dateStr) => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  // Fetch stats from backend
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/tasks/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load task stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch all assignees from full dataset so dropdown options remain consistent
  const fetchAssignees = useCallback(async () => {
    try {
      const res = await api.get('/tasks', {
        params: { status: 'all', sort: 'newest' },
      });
      const namesSet = new Set();
      let hasUnassigned = false;

      (res.data || []).forEach((t) => {
        if (t.assigned_to && t.assigned_to.trim()) {
          namesSet.add(t.assigned_to.trim());
        } else {
          hasUnassigned = true;
        }
      });

      setAvailableAssignees({
        names: Array.from(namesSet).sort((a, b) => a.localeCompare(b)),
        hasUnassigned,
      });
    } catch (err) {
      console.error('Failed to populate assignees list:', err);
    }
  }, []);

  // Fetch filtered tasks from backend
  const fetchTasks = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setErrorMessage('');

        const params = {
          status: statusFilter,
          sort: sortBy,
        };
        if (assigneeFilter) {
          params.assignee = assigneeFilter;
        }

        const res = await api.get('/tasks', { params });
        setTasks(res.data || []);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        setErrorMessage('Failed to load tasks from server. Please try refreshing.');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [statusFilter, assigneeFilter, sortBy]
  );

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchAssignees();
  }, [fetchStats, fetchAssignees]);

  // Fetch tasks on filter change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Optimistic toggle for task status
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';

    // Keep snapshot for rollback
    const prevTasks = [...tasks];
    const prevStats = { ...stats };

    // 1. Optimistic update in tasks state
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // 2. Optimistic update in stats
    setStats((prev) => {
      const isNowDone = newStatus === 'done';
      const changedTask = prevTasks.find((t) => t.id === taskId);
      const wasOverdue = changedTask ? isTaskOverdue(changedTask) : false;

      return {
        ...prev,
        pending_count: Math.max(0, prev.pending_count + (isNowDone ? -1 : 1)),
        done_count: Math.max(0, prev.done_count + (isNowDone ? 1 : -1)),
        overdue_count: wasOverdue
          ? Math.max(0, prev.overdue_count + (isNowDone ? -1 : 1))
          : prev.overdue_count,
      };
    });

    try {
      // 3. API request
      await api.patch(`/action-items/${taskId}`, { status: newStatus });
      // Re-sync stats in background to keep full accuracy
      fetchStats();
    } catch (err) {
      console.error('Failed to update task status:', err);
      // 4. Rollback
      setTasks(prevTasks);
      setStats(prevStats);
      setErrorMessage('Could not update task status. Reverting change.');
      setTimeout(() => setErrorMessage(''), 4500);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setAssigneeFilter('');
    setSortBy('newest');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || assigneeFilter !== '' || sortBy !== 'newest';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <CheckSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Action Items & Tasks
            </h1>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm sm:text-base">
            Track and manage all commitments, deliverables, and deadlines across your team meetings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchTasks(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
            title="Refresh data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error alert toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Stat Cards Row */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Meetings */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Meetings
            </span>
            <div className="p-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {statsLoading ? (
                <span className="inline-block w-8 h-7 bg-slate-800 animate-pulse rounded" />
              ) : (
                <CountUp target={stats.total_meetings} />
              )}
            </span>
            <span className="text-xs text-slate-400 font-medium">Recorded</span>
          </div>
        </motion.div>

        {/* Card 2: Total Tasks */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {statsLoading ? (
                <span className="inline-block w-8 h-7 bg-slate-800 animate-pulse rounded" />
              ) : (
                <CountUp target={stats.total_action_items} />
              )}
            </span>
            <span className="text-xs text-sky-400 font-medium">Action items</span>
          </div>
        </motion.div>

        {/* Card 3: Pending */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Pending
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {statsLoading ? (
                <span className="inline-block w-8 h-7 bg-slate-800 animate-pulse rounded" />
              ) : (
                <CountUp target={stats.pending_count} />
              )}
            </span>
            <span className="text-xs text-amber-400 font-medium">In progress</span>
          </div>
        </motion.div>

        {/* Card 4: Done */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Done
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {statsLoading ? (
                <span className="inline-block w-8 h-7 bg-slate-800 animate-pulse rounded" />
              ) : (
                <CountUp target={stats.done_count} />
              )}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Completed</span>
          </div>
        </motion.div>

        {/* Card 5: Overdue (Highlighted in Warning / Alert Color) */}
        <motion.div
          whileHover={{ y: -2 }}
          className={`p-5 backdrop-blur-md rounded-2xl relative overflow-hidden flex flex-col justify-between border transition-colors col-span-2 sm:col-span-1 ${
            stats.overdue_count > 0
              ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-500/10'
              : 'bg-slate-900/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                stats.overdue_count > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              Overdue
            </span>
            <div
              className={`p-2 rounded-xl border ${
                stats.overdue_count > 0
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                stats.overdue_count > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {statsLoading ? (
                <span className="inline-block w-8 h-7 bg-slate-800 animate-pulse rounded" />
              ) : (
                <CountUp target={stats.overdue_count} />
              )}
            </span>
            <span
              className={`text-xs font-medium ${
                stats.overdue_count > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              Past deadline
            </span>
          </div>
        </motion.div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="mt-8 p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Filter Chips (All / Pending / Done) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-accent-400" />
            Status:
          </span>
          {[
            { id: 'all', label: 'All', count: stats.total_action_items },
            { id: 'pending', label: 'Pending', count: stats.pending_count },
            { id: 'done', label: 'Done', count: stats.done_count },
          ].map((chip) => {
            const active = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 shadow-sm shadow-accent-500/10'
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active
                      ? 'bg-accent-500/30 text-accent-200 font-bold'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Assignee Dropdown & Sort Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Assignee Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Assignee:
            </span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-500/50 cursor-pointer"
            >
              <option value="">All Assignees</option>
              {availableAssignees.hasUnassigned && (
                <option value="unassigned">Unassigned</option>
              )}
              {availableAssignees.names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Toggle (Newest / By deadline) */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSortBy('newest')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSortBy('deadline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                sortBy === 'deadline'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By deadline
            </button>
          </div>

          {/* Clear filters button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List Section */}
      <div className="mt-6">
        {loading ? (
          /* Loading Skeleton */
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="p-4 sm:p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl flex items-start gap-3.5 animate-pulse"
              >
                <div className="w-5 h-5 rounded-md bg-slate-800 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-5 bg-slate-800/80 rounded-lg w-24" />
                    <div className="h-5 bg-slate-800/80 rounded-lg w-28" />
                    <div className="h-5 bg-slate-800/80 rounded-lg w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          /* Friendly Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center bg-slate-900/30 border border-slate-800/60 rounded-2xl flex flex-col items-center justify-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <Inbox className="w-7 h-7 text-slate-400 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {hasActiveFilters ? 'No tasks match current filters' : 'No action items found'}
            </h3>
            <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'Try switching to "All" or choosing another assignee to view items.'
                : 'Action items are automatically extracted when meeting recordings are processed.'}
            </p>

            <div className="mt-5 flex items-center gap-3">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-500 hover:bg-accent-400 text-slate-950 transition-all cursor-pointer shadow-md shadow-accent-500/20"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  to="/upload"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-500 hover:bg-accent-400 text-slate-950 transition-all shadow-md shadow-accent-500/20"
                >
                  Upload a Meeting
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          /* Task items list */
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {tasks.map((task) => {
                const isDone = task.status === 'done';
                const overdue = isTaskOverdue(task);
                const deadlineFormatted = formatDeadlineDate(task.deadline_date);

                return (
                  <motion.li
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start gap-3.5 sm:gap-4 ${
                      isDone
                        ? 'bg-slate-950/30 border-slate-800/40 opacity-75'
                        : overdue
                        ? 'bg-slate-950/60 border-rose-500/30 hover:border-rose-500/50'
                        : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {/* Top / Left: Checkbox + Task Text */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Interactive Accessible Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                            : 'border-slate-600 bg-slate-900 hover:border-accent-400 text-transparent'
                        }`}
                        title={isDone ? 'Mark as pending' : 'Mark as completed'}
                        aria-label={isDone ? 'Mark as pending' : 'Mark as completed'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Task Title */}
                        <p
                          className={`text-sm sm:text-base leading-snug transition-colors break-words ${
                            isDone
                              ? 'line-through text-slate-400'
                              : 'text-slate-100 font-medium'
                          }`}
                        >
                          {task.task}
                        </p>

                        {/* Metadata row: Assignee, Deadline, Overdue Badge, Meeting Link */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
                          {/* Assignee Chip */}
                          {task.assigned_to && task.assigned_to.trim() ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 font-medium">
                              <User className="w-3.5 h-3.5 text-accent-400" />
                              <span>{task.assigned_to.trim()}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 italic">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>Unassigned</span>
                            </span>
                          )}

                          {/* Deadline Chip */}
                          {deadlineFormatted ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                                overdue
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                              title={
                                task.deadline_text
                                  ? `Spoken: "${task.deadline_text}"`
                                  : 'Parsed date'
                              }
                            >
                              <Clock
                                className={`w-3.5 h-3.5 ${
                                  overdue ? 'text-rose-400' : 'text-amber-400'
                                }`}
                              />
                              <span>{deadlineFormatted}</span>
                            </span>
                          ) : task.deadline_text && task.deadline_text.trim() ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>{task.deadline_text.trim()}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 italic">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>No deadline</span>
                            </span>
                          )}

                          {/* Overdue Badge */}
                          {overdue && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Overdue</span>
                            </span>
                          )}

                          {/* Source Meeting Link */}
                          <Link
                            to={`/meetings/${task.meeting_id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all font-medium max-w-[220px] truncate"
                            title={`Go to meeting: ${task.meeting_title}`}
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{task.meeting_title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Right / Status pill */}
                    <div className="shrink-0 self-start sm:self-center">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : overdue
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isDone ? 'Done' : overdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
