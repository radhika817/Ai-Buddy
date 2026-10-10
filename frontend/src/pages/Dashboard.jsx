import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  ArrowUpRight,
  Search,
  Filter,
  Loader2,
  AlertCircle,

  FileVideo,
  Sparkles,
  Bot,
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/meetings');
      setMeetings(res.data);
    } catch (err) {
      setError('Could not load meetings from the server. Please check backend connection.');
    } finally {
      setLoading(false);

    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDelete = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/meetings/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete meeting.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'transcribing':
      case 'analyzing':
      case 'uploaded':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {status || 'Processing'}
          </span>
        );
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const readyCount = meetings.filter((m) => m.status === 'ready').length;
  const inProgressCount = meetings.filter((m) =>
    ['uploaded', 'transcribing', 'analyzing'].includes(m.status)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              Connected to Neon DB
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Meeting Intelligence
          </h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Search, review, and query structured insights extracted from your team recordings.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-accent-500/20"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.2]" />
            <span>Upload Recording</span>
          </Link>
        </motion.div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Meetings
            </span>
            <div className="p-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{meetings.length}</span>
            <span className="text-xs text-accent-400 font-medium">Recorded</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ready for Review
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{readyCount}</span>
            <span className="text-xs text-emerald-400 font-medium">Fully processed</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Processing Pipeline
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{inProgressCount}</span>
            <span className="text-xs text-amber-400 font-medium">In progress</span>
          </div>
        </motion.div>
      </div>

      {/* Ask Across All Meetings Shortcut Card */}
      <motion.div
        whileHover={{ y: -2 }}
        className="mt-6 p-4 sm:p-5 bg-gradient-to-r from-accent-950/40 via-slate-900/80 to-slate-900/60 border border-accent-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-accent-500/5"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Ask across all meetings
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
                Cross-Meeting AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Query decisions, open action items, and topic changes across your team's entire meeting history.
            </p>
          </div>
        </div>

        <Link
          to="/chat"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-accent-500/20 shrink-0 cursor-pointer"
        >
          <span>Ask AI Buddy</span>
          <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
        </Link>
      </motion.div>

      {/* Section Header with Search */}
      <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Your Meetings</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any meeting card to view details</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchMeetings}
            title="Refresh meetings"
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
          <p className="text-sm">Loading your meetings...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-4 text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchMeetings}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && meetings.length === 0 && (
        <div className="mt-6 p-12 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent-500/10 text-accent-400 rounded-2xl flex items-center justify-center text-2xl border border-accent-500/20">
            <FileVideo className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-lg font-bold text-white">No meetings uploaded yet</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Upload your first meeting recording to generate transcripts, summaries, and action items.
          </p>
          <div className="mt-6">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-md shadow-accent-500/20"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Meeting</span>
            </Link>
          </div>
        </div>
      )}

      {/* Grid of Real Meeting Cards */}
      {!loading && !error && filteredMeetings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredMeetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col bg-slate-900/60 hover:bg-slate-900/90 backdrop-blur-md border border-slate-800/80 hover:border-accent-500/40 rounded-2xl p-6 transition-all shadow-xl hover:shadow-2xl hover:shadow-accent-500/5"
              >
                <Link to={`/meetings/${meeting.id}`} className="flex flex-col flex-1">
                  {/* Card Header: Date & Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(meeting.created_at)}
                    </span>

                    {renderStatusBadge(meeting.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-accent-300 transition-colors line-clamp-2">
                    {meeting.title}
                  </h3>

                  {/* File Path / Meta */}
                  <p className="text-xs text-slate-500 mt-2 truncate font-mono">
                    {meeting.file_path}
                  </p>

                  {/* Highlights Footer with Delete Button */}
                  <div className="mt-6 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] font-medium">
                      ID: #{meeting.id}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, meeting.id, meeting.title)}
                        disabled={deletingId === meeting.id}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors z-10"
                        title="Delete meeting"
                      >
                        {deletingId === meeting.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>

                      <span className="text-slate-500 group-hover:text-accent-400 transition-colors flex items-center gap-0.5 font-medium ml-1">
                        View
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
