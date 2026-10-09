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
  Volume2,
  Check,
  User,
} from 'lucide-react';
import api from '../services/api';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [segments, setSegments] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [actionItemsLoading, setActionItemsLoading] = useState(false);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const userTabSelectionRef = useRef(false);
  const fetchedDetailsRef = useRef(false);

  // Automatically default to Summary tab when the meeting is ready, unless the user manually picked a tab
  useEffect(() => {
    if (meeting?.status === 'ready' && !userTabSelectionRef.current) {
      setActiveTab('summary');
    }
  }, [meeting?.status]);

  const handleTabChange = (tabName) => {
    userTabSelectionRef.current = true;
    setActiveTab(tabName);
  };

  const fetchMeeting = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const res = await api.get(`/meetings/${id}`);
      setMeeting(res.data);

      if (res.data.status === 'ready' && !fetchedDetailsRef.current) {
        fetchedDetailsRef.current = true;
        fetchTranscript();
        fetchActionItems();
        fetchDecisions();
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

  const fetchActionItems = async () => {
    try {
      setActionItemsLoading(true);
      const res = await api.get(`/meetings/${id}/action-items`);
      setActionItems(res.data);
    } catch (err) {
      console.error('Failed to load action items:', err);
    } finally {
      setActionItemsLoading(false);
    }
  };

  const fetchDecisions = async () => {
    try {
      setDecisionsLoading(true);
      const res = await api.get(`/meetings/${id}/decisions`);
      setDecisions(res.data);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setDecisionsLoading(false);
    }
  };

  const handleToggleActionItem = async (itemId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    // Optimistic UI update
    setActionItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
    try {
      await api.patch(`/action-items/${itemId}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update action item status:', err);
      // Revert on failure
      setActionItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: currentStatus } : item))
      );
      alert('Failed to update task status. Please try again.');
    }
  };

  useEffect(() => {
    fetchedDetailsRef.current = false;
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
                    ? 'Analyzing Dialogue & Generating AI Summary...'
                    : 'Processing Audio Upload...'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {meeting.status === 'analyzing'
                    ? 'Generating summary, action items and decisions with Gemini. Polling every 5 seconds...'
                    : 'Running speech-to-text pipeline in background. Polling every 5 seconds...'}
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
              <p className="text-xs font-bold">3. Analyzing</p>
              <p className="text-[10px] text-slate-500 mt-0.5">AI Summary</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAILED STATE CARD WITH ERROR MESSAGE AND DELETE BUTTON */}
      {isFailed && (
        <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-xl text-rose-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-lg shadow-rose-500/20"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Meeting</span>
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tabs for Transcript & Summary (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs when Ready */}
          {isReady && (
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleTabChange('summary')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'summary'
                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Summary</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('transcript')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'transcript'
                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Transcript</span>
                {segments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {segments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('action-items')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'action-items'
                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Action Items</span>
                {actionItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {actionItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('decisions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'decisions'
                    ? 'bg-accent-500/10 text-accent-400 border border-accent-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Decisions</span>
                {decisions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {decisions.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* TRANSCRIPT TAB CONTENT */}
          {(activeTab === 'transcript' || isProcessing || isFailed) && (
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
                      placeholder="Search dialogue..."
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
                    <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                      {filteredSegments.map((seg) => (
                        <div
                          key={seg.id}
                          className="p-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 transition-colors flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
                        >
                          <div className="shrink-0 flex items-center gap-1.5 text-accent-400 font-mono text-xs bg-accent-500/10 px-2.5 py-1 rounded-lg border border-accent-500/20 self-start">
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
          )}

          {/* SUMMARY TAB CONTENT (When activeTab === 'summary') */}
          {activeTab === 'summary' && isReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Summary</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      AI-generated overview and key meeting takeaways
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Gemini 2.5 Flash-Lite
                </span>
              </div>

              {meeting.summary || (meeting.key_points && meeting.key_points.length > 0) ? (
                <div className="space-y-6">
                  {/* Summary Text */}
                  {meeting.summary && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Overview
                      </h3>
                      <div className="p-4 sm:p-5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-200 text-sm sm:text-base leading-relaxed">
                        {meeting.summary}
                      </div>
                    </div>
                  )}

                  {/* Bulleted Key Points */}
                  {meeting.key_points && meeting.key_points.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Key Points
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          {meeting.key_points.length} points
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {meeting.key_points.map((point, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/70 hover:border-slate-700/80 transition-colors text-xs sm:text-sm text-slate-200"
                          >
                            <span className="w-2 h-2 rounded-full bg-accent-400 shrink-0 mt-1.5 shadow-sm shadow-accent-400/50" />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">No summary available</p>
                  <p className="text-xs text-slate-500 mt-1">
                    A summary was not generated for this meeting.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ACTION ITEMS TAB CONTENT */}
          {activeTab === 'action-items' && isReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-500/10 text-accent-400 border border-accent-500/20">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Action Items</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tasks, assignees, and deadlines extracted from discussion
                    </p>
                  </div>
                </div>

                {actionItems.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20">
                    <span>
                      {actionItems.filter((i) => i.status === 'done').length} of {actionItems.length} completed
                    </span>
                  </span>
                )}
              </div>

              {actionItemsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
                  <p className="text-xs">Loading action items...</p>
                </div>
              ) : actionItems.length === 0 ? (
                <div className="p-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                  <CheckSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">No action items detected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No explicit tasks or follow-up assignments were identified in this meeting.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {actionItems.map((item) => {
                    const isDone = item.status === 'done';
                    return (
                      <li
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                          isDone
                            ? 'bg-slate-950/30 border-slate-800/50 opacity-75'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80'
                        }`}
                      >
                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleActionItem(item.id, item.status)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'border-slate-600 bg-slate-900 hover:border-accent-400 text-transparent'
                          }`}
                          title={isDone ? 'Mark as pending' : 'Mark as done'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Task Description */}
                          <p
                            className={`text-xs sm:text-sm leading-relaxed ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-200 font-medium'
                            }`}
                          >
                            {item.task}
                          </p>

                          {/* Assignee & Deadline tags */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            {/* Assignee */}
                            {item.assigned_to ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 font-medium">
                                <User className="w-3.5 h-3.5 text-accent-400" />
                                <span>{item.assigned_to}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/50 italic">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span>Unassigned</span>
                              </span>
                            )}

                            {/* Deadline */}
                            {item.deadline_text ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>{item.deadline_text}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/50 italic">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>No deadline</span>
                              </span>
                            )}

                            {/* Status Pill */}
                            <span
                              className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                isDone
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}

          {/* DECISIONS TAB CONTENT */}
          {activeTab === 'decisions' && isReady && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Decisions</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Agreements, conclusions, and resolutions logged from the meeting
                    </p>
                  </div>
                </div>

                {decisions.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
                  </span>
                )}
              </div>

              {decisionsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  <p className="text-xs">Loading decisions...</p>
                </div>
              ) : decisions.length === 0 ? (
                <div className="p-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                  <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">No decisions detected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No definitive decisions or agreements were explicitly stated in this recording.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {decisions.map((dec, idx) => (
                    <li
                      key={dec.id || idx}
                      className="p-4 rounded-xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex items-start gap-3.5 group"
                    >
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                          {dec.decision}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
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
              {isReady && actionItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange('action-items')}
                  className="text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
                >
                  View all ({actionItems.length})
                </button>
              )}
            </div>

            {isReady ? (
              actionItems.length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                  <p className="text-xs font-medium text-slate-400">No action items detected</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                    <span>Progress</span>
                    <span className="font-mono text-accent-400">
                      {actionItems.filter((i) => i.status === 'done').length}/{actionItems.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {actionItems.slice(0, 3).map((item) => (
                      <li
                        key={item.id}
                        onClick={() => handleTabChange('action-items')}
                        className="p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/70 text-xs text-slate-300 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        <span className={`truncate flex-1 ${item.status === 'done' ? 'line-through text-slate-500' : ''}`}>
                          {item.task}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                <p className="text-xs font-medium text-slate-400">
                  {meeting?.status === 'analyzing' ? 'Analyzing action items...' : 'Processing not started'}
                </p>
              </div>
            )}
          </motion.div>

          {/* Decisions Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className="p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-cyan-400" />
                Decisions Logged
              </h2>
              {isReady && decisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange('decisions')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  View all ({decisions.length})
                </button>
              )}
            </div>

            {isReady ? (
              decisions.length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                  <p className="text-xs font-medium text-slate-400">No decisions detected</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {decisions.slice(0, 3).map((dec, idx) => (
                    <li
                      key={dec.id || idx}
                      onClick={() => handleTabChange('decisions')}
                      className="p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/70 text-xs text-slate-300 flex items-start gap-2 cursor-pointer transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span className="line-clamp-2 leading-relaxed">{dec.decision}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                <p className="text-xs font-medium text-slate-400">
                  {meeting?.status === 'analyzing' ? 'Extracting decisions...' : 'Processing not started'}
                </p>
              </div>
            )}
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
