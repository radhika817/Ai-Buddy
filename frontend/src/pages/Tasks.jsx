import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, RotateCw } from 'lucide-react';
import api from '../services/api';
import { AppShell, TopBar, Button, Badge, Chip, Footer } from '../components/ui';

const SPEAKER_TINTS = [
  'bg-lavender',
  'bg-chip-blue',
  'bg-chip-sage',
  'bg-chip-sand',
  'bg-chip-rose',
  'bg-chip-mist',
];

function getSpeakerTint(speakerName) {
  if (!speakerName) return 'bg-frame';
  let hash = 0;
  for (let i = 0; i < speakerName.length; i++) {
    hash = speakerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SPEAKER_TINTS.length;
  return SPEAKER_TINTS[index];
}

function formatDeadlineDate(dateStr) {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function Tasks() {
  const navigate = useNavigate();
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
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' | name | 'unassigned'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'deadline'

  // Master list of unique assignees
  const [availableAssignees, setAvailableAssignees] = useState({
    names: [],
    hasUnassigned: false,
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const isTaskOverdue = useCallback((task) => {
    if (task.status !== 'pending' || !task.deadline_date) return false;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      return task.deadline_date < todayStr;
    } catch {
      return false;
    }
  }, []);

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

  useEffect(() => {
    fetchStats();
    fetchAssignees();
  }, [fetchStats, fetchAssignees]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Optimistic toggle for task status with rollback
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';

    const prevTasks = [...tasks];
    const prevStats = { ...stats };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

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
      await api.patch(`/action-items/${taskId}`, { status: newStatus });
      fetchStats();
    } catch (err) {
      console.error('Failed to update task status:', err);
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

  const navLinks = [
    { label: 'Meetings', href: '/dashboard' },
    { label: 'Tasks', href: '/tasks', active: true },
    { label: 'Ask AI', href: '/chat' },
  ];

  const logoutButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="text-xs sm:text-sm font-semibold"
    >
      Log out
    </Button>
  );

  return (
    <AppShell>
      <TopBar navLinks={navLinks} action={logoutButton} />

      <div className="w-full px-6 lg:px-10 py-10 flex-1 flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl sm:text-5xl tracking-tight text-ink">
              <span className="font-display font-extrabold uppercase">ALL </span>
              <span className="font-display font-light italic">TASKS</span>
            </h1>
            <p className="font-sans text-sm sm:text-base text-muted">
              {stats.pending_count} pending, {stats.overdue_count} overdue across all recordings.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchTasks(true);
            }}
            className="self-start sm:self-auto text-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-status-failed-bg border border-status-failed-text/20 text-status-failed-text text-xs sm:text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="p-1 text-muted hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Lavender Stats Panel: 5 columns */}
        <section className="bg-lavender rounded-[24px] border border-hairline p-6 sm:p-8 shadow-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-ink/15">
            {/* Stat 1: Meetings */}
            <div className="flex flex-col pt-3 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <span className="font-mono text-3xl sm:text-[40px] font-bold text-ink leading-tight">
                {statsLoading ? '—' : stats.total_meetings}
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-1">
                Meetings
              </span>
            </div>

            {/* Stat 2: Total tasks */}
            <div className="flex flex-col pt-3 sm:pt-0 sm:px-4">
              <span className="font-mono text-3xl sm:text-[40px] font-bold text-ink leading-tight">
                {statsLoading ? '—' : stats.total_action_items}
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-1">
                Total tasks
              </span>
            </div>

            {/* Stat 3: Pending */}
            <div className="flex flex-col pt-3 sm:pt-0 sm:px-4">
              <span className="font-mono text-3xl sm:text-[40px] font-bold text-ink leading-tight">
                {statsLoading ? '—' : stats.pending_count}
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-1">
                Pending
              </span>
            </div>

            {/* Stat 4: Done */}
            <div className="flex flex-col pt-3 sm:pt-0 sm:px-4">
              <span className="font-mono text-3xl sm:text-[40px] font-bold text-ink leading-tight">
                {statsLoading ? '—' : stats.done_count}
              </span>
              <span className="font-sans text-xs sm:text-sm text-muted mt-1">
                Done
              </span>
            </div>

            {/* Stat 5: Overdue (danger text color) */}
            <div className="flex flex-col pt-3 sm:pt-0 sm:px-4 col-span-2 sm:col-span-1">
              <span className="font-mono text-3xl sm:text-[40px] font-bold text-status-failed-text leading-tight">
                {statsLoading ? '—' : stats.overdue_count}
              </span>
              <span className="font-sans text-xs sm:text-sm text-status-failed-text mt-1">
                Overdue
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sans text-xs font-semibold text-muted uppercase tracking-wider mr-1">
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
                  className={`px-4 py-1.5 rounded-pill font-sans text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-ink text-frame'
                      : 'bg-white border border-hairline text-muted hover:text-ink'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className="font-mono text-[11px] opacity-80">
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Assignee Select & Sort Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Assignee select */}
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-medium text-muted">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-10 px-3.5 bg-white border border-hairline text-ink font-sans text-xs sm:text-sm rounded-pill focus:outline-none focus:border-ink cursor-pointer"
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
            <div className="flex items-center bg-white border border-hairline rounded-pill p-0.5">
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-pill font-sans text-xs font-medium transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-ink text-frame'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Newest
              </button>
              <button
                type="button"
                onClick={() => setSortBy('deadline')}
                className={`px-3 py-1 rounded-pill font-sans text-xs font-medium transition-colors ${
                  sortBy === 'deadline'
                    ? 'bg-ink text-frame'
                    : 'text-muted hover:text-ink'
                }`}
              >
                By deadline
              </button>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-sans text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors px-2 py-1"
                title="Reset filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Rows Card */}
        <div>
          {loading ? (
            /* Flat Skeleton Loader */
            <div className="bg-white rounded-[16px] border border-hairline divide-y divide-hairline">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 px-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-5 h-5 rounded-[6px] bg-frame border border-hairline animate-pulse shrink-0" />
                    <div className="h-4 w-2/3 bg-frame rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 rounded-pill bg-frame animate-pulse" />
                    <div className="h-4 w-16 rounded bg-frame animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            /* Friendly Empty State */
            <div className="bg-white rounded-[16px] border border-hairline p-12 text-center flex flex-col items-center justify-center gap-3 shadow-none">
              <h2 className="font-display font-bold text-lg text-ink">
                {hasActiveFilters ? 'No tasks match current filters' : 'No action items found'}
              </h2>
              <p className="font-sans text-sm text-muted max-w-sm">
                {hasActiveFilters
                  ? 'Try selecting "All" or choosing another assignee.'
                  : 'Tasks are automatically extracted when meeting recordings are processed.'}
              </p>
              <div className="pt-2">
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button to="/upload" variant="primary" size="sm">
                    Upload a recording
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* White Card with Task Rows */
            <div className="bg-white rounded-[16px] border border-hairline overflow-hidden divide-y divide-hairline shadow-none">
              {tasks.map((task) => {
                const isDone = task.status === 'done';
                const overdue = isTaskOverdue(task);
                const deadlineFormatted = formatDeadlineDate(task.deadline_date);
                const speakerTint = task.assigned_to ? getSpeakerTint(task.assigned_to) : 'bg-frame';

                return (
                  <div
                    key={task.id}
                    className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-frame/50 transition-colors"
                  >
                    {/* Left: Checkbox & Task Title */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <input
                        id={`task-${task.id}`}
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggleTaskStatus(task.id, task.status)}
                        className="mt-0.5 sm:mt-0 w-5 h-5 rounded-[6px] border-[1.5px] border-hairline text-ink focus:ring-0 cursor-pointer shrink-0"
                      />
                      <label
                        htmlFor={`task-${task.id}`}
                        className={`font-sans text-sm sm:text-base leading-snug cursor-pointer select-none truncate ${
                          isDone ? 'line-through text-muted' : 'text-ink font-medium'
                        }`}
                      >
                        {task.task}
                      </label>
                    </div>

                    {/* Right: Assignee Chip, Deadline, Overdue Badge, Meeting Link */}
                    <div className="flex items-center gap-3 flex-wrap shrink-0 pl-8 sm:pl-0">
                      {/* Assignee Chip */}
                      <span
                        className={`inline-flex items-center px-3 py-0.5 rounded-pill ${speakerTint} border border-hairline font-sans text-xs sm:text-[13px] font-semibold text-ink shadow-none`}
                      >
                        {task.assigned_to || 'Unassigned'}
                      </span>

                      {/* Deadline */}
                      <span className="font-mono text-xs uppercase text-muted font-semibold tracking-wider">
                        {deadlineFormatted || task.deadline_text || 'No deadline'}
                      </span>

                      {/* Overdue Badge */}
                      {overdue && !isDone && (
                        <Badge variant="failed">Overdue</Badge>
                      )}

                      {/* Source Meeting Link */}
                      <Link
                        to={`/meetings/${task.meeting_id}`}
                        className="font-sans text-xs text-muted hover:text-ink truncate max-w-[160px] underline decoration-hairline underline-offset-4 transition-colors"
                        title={`Go to meeting: ${task.meeting_title}`}
                      >
                        {task.meeting_title} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </AppShell>
  );
}
