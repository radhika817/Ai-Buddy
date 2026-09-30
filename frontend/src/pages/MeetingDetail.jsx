import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Bookmark,
  Bot,
  Loader2,
  FileAudio
} from 'lucide-react';
import api from '../services/api';

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/meetings/${id}`);
        setMeeting(res.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load meeting details. The meeting may not exist or has been deleted.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMeeting();
    }
  }, [id]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'transcribing':
      case 'analyzing':
      case 'uploaded':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {status || 'Processing'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
        <p className="text-sm">Loading meeting details...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Meeting Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">{error || 'Could not find the requested meeting.'}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button & status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>

        <div className="flex items-center gap-2.5">
          {renderStatusBadge(meeting.status)}
        </div>
      </div>

      {/* Meeting Header */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 font-mono">
            Meeting #{meeting.id}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {formatDate(meeting.created_at)}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {meeting.title}
        </h1>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-mono">
          <FileAudio className="w-4 h-4 text-accent-400" />
          <span className="truncate">{meeting.file_path}</span>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Transcript (2 cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Executive Summary</h2>
            </div>
            
            {/* Placeholder state until STT & LLM processing is added */}
            <div className="p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
              <p className="text-sm font-medium text-slate-300">Processing not started</p>
              <p className="text-xs text-slate-500 mt-1">
                Automated transcription and AI summary extraction will be added in the next step.
              </p>
            </div>
          </motion.div>

          {/* Transcript Viewer Card */}
          <div className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent-400" />
                Transcript
              </h2>
            </div>

            {/* Placeholder state until STT is added */}
            <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">Processing not started</p>
              <p className="text-xs text-slate-500 mt-1">
                Speech-to-text transcript segments with timestamps will appear here once audio is transcribed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Action Items, Decisions, and AI Chat Assistant */}
        <div className="space-y-8">
          {/* Action Items Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-accent-400" />
                Action Items
              </h2>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
              <p className="text-xs font-medium text-slate-400">Processing not started</p>
            </div>
          </motion.div>

          {/* Decisions Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800/80 mb-4">
              <Bookmark className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Decisions Logged</h2>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
              <p className="text-xs font-medium text-slate-400">Processing not started</p>
            </div>
          </motion.div>

          {/* Meeting Memory / Q&A Prompt Teaser */}
          <div className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-accent-500/20 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-2 text-accent-400">
              <Bot className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Ask AI Buddy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask natural language questions about this meeting once processing is completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
