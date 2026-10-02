import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  FileAudio,
  Trash2,
  Search,
  Volume2
} from 'lucide-react';
import api from '../services/api';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fetchedTranscriptRef = useRef(false);

  const fetchMeeting = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const res = await api.get(`/meetings/${id}`);
      setMeeting(res.data);

      if (res.data.status === 'ready' && !fetchedTranscriptRef.current) {
        fetchedTranscriptRef.current = true;
        fetchTranscript();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to load meeting details. The meeting may not exist or has been deleted.'
      );
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchTranscript = async () => {
    try {
      setSegmentsLoading(true);
      const res = await api.get(`/meetings/${id}/transcript`);
      setSegments(res.data);
    } catch (err) {
      console.error('Failed to load transcript segments:', err);
    } finally {
      setSegmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchedTranscriptRef.current = false;
    if (id) {
      fetchMeeting(true);
    }
  }, [id]);

  // Polling every 5 seconds while status is in-progress
  useEffect(() => {
    let intervalId = null;

    if (meeting && ['uploaded', 'transcribing', 'analyzing'].includes(meeting.status?.toLowerCase())) {
      intervalId = setInterval(() => {
        fetchMeeting(false);
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [meeting?.status, id]);

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete "${meeting.title}"?`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      await api.delete(`/meetings/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete meeting.');
      setDeleting(false);
    }
  };

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

  const formatSeconds = (totalSeconds) => {
    if (typeof totalSeconds !== 'number') return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-ping" />
            Transcribing (Whisper)...
          </span>
        );
      case 'analyzing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Analyzing...
          </span>
        );
      case 'uploaded':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Uploaded
          </span>
        );
    }
  };

  const isProcessing = ['uploaded', 'transcribing', 'analyzing'].includes(meeting?.status?.toLowerCase());
  const isFailed = meeting?.status?.toLowerCase() === 'failed';
  const isReady = meeting?.status?.toLowerCase() === 'ready';

  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Top back bar and status */}
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
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition-colors text-xs flex items-center gap-1.5"
            title="Delete meeting"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Delete</span>
          </button>
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

      {/* PROCESSING PROGRESS INDICATOR (Visible when uploaded / transcribing / analyzing) */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-slate-900/80 border border-accent-500/30 rounded-2xl shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {meeting.status === 'transcribing'
                    ? 'Transcribing Audio with Whisper...'
                    : meeting.status === 'analyzing'
                    ? 'Analyzing Dialogue Segments...'
                    : 'Processing Audio Upload...'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Running local speech-to-text pipeline in background. Polling every 5 seconds...
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20 capitalize self-start sm:self-auto">
              Status: {meeting.status}
            </span>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800">
            <div
              className={`p-3 rounded-xl border text-center ${
                meeting.status === 'uploaded'
                  ? 'border-accent-500/50 bg-accent-500/10 text-accent-300'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              <p className="text-xs font-bold">1. Uploaded</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Audio Saved</p>
            </div>
            <div
              className={`p-3 rounded-xl border text-center ${
                meeting.status === 'transcribing'
                  ? 'border-accent-500/50 bg-accent-500/10 text-accent-300'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              <p className="text-xs font-bold">2. Transcribing</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Faster-Whisper</p>
            </div>
            <div
              className={`p-3 rounded-xl border text-center ${
                meeting.status === 'analyzing'
                  ? 'border-accent-500/50 bg-accent-500/10 text-accent-300'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400'
              }`}
            >
              <p className="text-xs font-bold">3. Finalizing</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Marking Ready</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAILED STATE CARD */}
      {isFailed && (
        <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-xl text-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">Transcription Failed</h3>
                <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  {meeting.error_message || 'An error occurred during audio processing or model transcription.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-lg shadow-rose-500/20"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Meeting</span>
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Transcript (2 cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary Card (Placeholder for Phase 2) */}
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

            <div className="p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
              <p className="text-sm font-medium text-slate-300">Processing not started</p>
              <p className="text-xs text-slate-500 mt-1">
                Automated AI summary extraction will be implemented in the next phase.
              </p>
            </div>
          </motion.div>

          {/* Transcript Viewer Card */}
          <div className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent-400" />
                  Transcript
                  {segments.length > 0 && (
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      ({segments.length} segments)
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generated with local Faster-Whisper model
                </p>
              </div>

              {isReady && segments.length > 0 && (
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search in transcript..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
              )}
            </div>

            {/* In-progress state */}
            {isProcessing && (
              <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Transcription in progress</p>
                <p className="text-xs text-slate-500 mt-1">
                  Audio is being converted and transcribed. Segments will appear automatically when ready.
                </p>
              </div>
            )}

            {/* Failed state */}
            {isFailed && (
              <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Transcription failed</p>
                <p className="text-xs text-slate-500 mt-1">
                  Please review the error details above or delete and retry uploading.
                </p>
              </div>
            )}

            {/* Ready state with Transcript Segments */}
            {isReady && (
              <>
                {segmentsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
                    <p className="text-xs">Loading transcript segments...</p>
                  </div>
                ) : segments.length === 0 ? (
                  <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                    <Volume2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">No speech detected</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Whisper processed the audio but did not detect verbal conversation.
                    </p>
                  </div>
                ) : filteredSegments.length === 0 ? (
                  <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                    <p className="text-sm font-medium text-slate-300">No matching dialogue found</p>
                    <p className="text-xs text-slate-500 mt-1">Try a different search term.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {filteredSegments.map((seg) => (
                      <div
                        key={seg.id}
                        className="p-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 transition-colors flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
                      >
                        <div className="shrink-0 flex items-center gap-1.5 text-accent-400 font-mono text-xs bg-accent-500/10 px-2 py-0.5 rounded-md border border-accent-500/20 self-start">
                          <Clock className="w-3 h-3" />
                          <span>{formatSeconds(seg.start_time)}</span>
                          <span className="text-slate-500">-</span>
                          <span>{formatSeconds(seg.end_time)}</span>
                        </div>

                        <div className="flex-1">
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                            {seg.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
