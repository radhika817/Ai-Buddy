import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Edit2,
  Check,
  X,
  Search,
  Users,
  Copy,
  ExternalLink,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { AppShell, TopBar, Button, Badge, Chip, Footer } from '../components/ui';
import MeetingChat from '../components/MeetingChat';

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

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) {
    return '—';
  }
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatSeconds(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDeadline(item) {
  if (item.deadline_date) {
    try {
      const d = new Date(item.deadline_date);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return item.deadline_date;
    }
  }
  if (item.deadline_text && item.deadline_text.trim()) {
    return item.deadline_text;
  }
  return 'No deadline';
}

function getStatusBadgeConfig(status) {
  switch (status?.toLowerCase()) {
    case 'ready':
      return { variant: 'ready', label: 'Ready', dot: true };
    case 'failed':
      return { variant: 'failed', label: 'Failed', dot: false };
    case 'analyzing':
      return { variant: 'analyzing', label: 'Analyzing', dot: false };
    case 'transcribing':
      return { variant: 'analyzing', label: 'Transcribing', dot: false };
    case 'uploaded':
    default:
      return { variant: 'analyzing', label: 'Uploaded', dot: false };
  }
}

const STEP_ORDER = ['uploaded', 'transcribing', 'analyzing', 'ready'];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [highlightedSegmentId, setHighlightedSegmentId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const userTabSelectionRef = useRef(false);
  const fetchedDetailsRef = useRef(false);

  // Toast notifications
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Meeting Title inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Segment text inline editing
  const [editingTextSegId, setEditingTextSegId] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);

  // Segment speaker inline editing
  const [editingSpeakerSegId, setEditingSpeakerSegId] = useState(null);
  const [speakerInputValue, setSpeakerInputValue] = useState('');
  const [isSavingSpeaker, setIsSavingSpeaker] = useState(false);

  // Batch rename speaker modal
  const [isRenameSpeakerOpen, setIsRenameSpeakerOpen] = useState(false);
  const [renameOldSpeaker, setRenameOldSpeaker] = useState('');
  const [renameNewSpeaker, setRenameNewSpeaker] = useState('');
  const [isRenamingSpeaker, setIsRenamingSpeaker] = useState(false);

  // Meeting export state
  const [exporting, setExporting] = useState(false);

  // Follow-up email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTone, setEmailTone] = useState('friendly');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Distinct speaker names in this meeting
  const uniqueSpeakers = Array.from(
    new Set(segments.map((s) => s.speaker).filter(Boolean))
  ).sort();

  const isReady = meeting?.status?.toLowerCase() === 'ready';
  const isFailed = meeting?.status?.toLowerCase() === 'failed';
  const isProcessing = ['uploaded', 'transcribing', 'analyzing'].includes(meeting?.status?.toLowerCase());

  // Keyboard accessibility: Escape closes open modals or inline inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEmailModalOpen) setIsEmailModalOpen(false);
        if (isRenameSpeakerOpen) setIsRenameSpeakerOpen(false);
        if (isEditingTitle) setIsEditingTitle(false);
        if (editingTextSegId) setEditingTextSegId(null);
        if (editingSpeakerSegId) setEditingSpeakerSegId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmailModalOpen, isRenameSpeakerOpen, isEditingTitle, editingTextSegId, editingSpeakerSegId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
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
      setSegments(res.data || []);
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
      setActionItems(res.data || []);
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
      setDecisions(res.data || []);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setDecisionsLoading(false);
    }
  };

  useEffect(() => {
    fetchedDetailsRef.current = false;
    if (id) {
      fetchMeeting(true);
    }
  }, [id]);

  // Polling every 5 seconds while processing
  useEffect(() => {
    let intervalId = null;
    if (meeting && ['uploaded', 'transcribing', 'analyzing'].includes(meeting.status?.toLowerCase())) {
      intervalId = setInterval(() => {
        fetchMeeting(false);
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [meeting?.status, id]);

  // Default tab handling and deep linking
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      userTabSelectionRef.current = true;
      setActiveTab(tabParam);
      return;
    }
    if (meeting?.status === 'ready' && !userTabSelectionRef.current) {
      setActiveTab('summary');
    }
  }, [meeting?.status, searchParams]);

  // Deep link ?tab=transcript&t=SECONDS
  useEffect(() => {
    const timeParam = searchParams.get('t');
    if (timeParam !== null && segments && segments.length > 0) {
      const totalSeconds = parseFloat(timeParam);
      if (!isNaN(totalSeconds)) {
        let matched = segments.find(
          (s) => s.start_time <= totalSeconds && s.end_time >= totalSeconds
        );
        if (!matched) {
          matched = segments.reduce((closest, curr) => {
            if (!closest) return curr;
            return Math.abs(curr.start_time - totalSeconds) < Math.abs(closest.start_time - totalSeconds)
              ? curr
              : closest;
          }, null);
        }

        if (matched) {
          setHighlightedSegmentId(matched.id);
          setTimeout(() => {
            const el = document.getElementById(`segment-${matched.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 250);

          setTimeout(() => {
            setHighlightedSegmentId(null);
          }, 3500);
        }
      }
    }
  }, [searchParams, segments]);

  const handleTabChange = (tabName) => {
    userTabSelectionRef.current = true;
    setActiveTab(tabName);
  };

  const handleTimestampClick = (timestampStr) => {
    if (!timestampStr) return;
    const clean = timestampStr.replace(/[\[\]]/g, '');
    const parts = clean.split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    handleTabChange('transcript');
    setSearchTerm('');

    if (segments && segments.length > 0) {
      let matched = segments.find(
        (s) => s.start_time <= totalSeconds && s.end_time >= totalSeconds
      );
      if (!matched) {
        matched = segments.reduce((closest, curr) => {
          if (!closest) return curr;
          return Math.abs(curr.start_time - totalSeconds) < Math.abs(closest.start_time - totalSeconds)
            ? curr
            : closest;
        }, null);
      }

      if (matched) {
        setHighlightedSegmentId(matched.id);
        setTimeout(() => {
          const el = document.getElementById(`segment-${matched.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

        setTimeout(() => {
          setHighlightedSegmentId(null);
        }, 3500);
      }
    }
  };

  // Title Save
  const handleSaveTitle = async () => {
    const trimmed = titleInputValue.trim();
    if (!trimmed) {
      showToast('Meeting title cannot be empty.', 'error');
      return;
    }
    if (trimmed.length > 120) {
      showToast('Meeting title must be 120 characters or less.', 'error');
      return;
    }
    try {
      setIsSavingTitle(true);
      const res = await api.patch(`/meetings/${id}`, { title: trimmed });
      setMeeting((prev) => ({ ...prev, title: res.data.title }));
      setIsEditingTitle(false);
      showToast('Meeting title updated successfully.');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update meeting title.', 'error');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Segment Text Save
  const handleSaveSegmentText = async (segId) => {
    const trimmed = textInputValue.trim();
    if (!trimmed) {
      showToast('Transcript text cannot be empty.', 'error');
      return;
    }
    try {
      setIsSavingText(true);
      const res = await api.patch(`/meetings/${id}/transcript/${segId}`, { text: trimmed });
      setSegments((prev) =>
        prev.map((s) => (s.id === segId ? { ...s, text: res.data.text, edited: res.data.edited } : s))
      );
      setEditingTextSegId(null);
      showToast('Transcript segment updated.');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update transcript text.', 'error');
    } finally {
      setIsSavingText(false);
    }
  };

  // Segment Speaker Save
  const handleSaveSpeaker = async (segId) => {
    const trimmed = speakerInputValue.trim();
    try {
      setIsSavingSpeaker(true);
      const res = await api.patch(`/meetings/${id}/transcript/${segId}`, {
        speaker: trimmed || null,
      });
      setSegments((prev) =>
        prev.map((s) => (s.id === segId ? { ...s, speaker: res.data.speaker } : s))
      );
      setEditingSpeakerSegId(null);
      showToast(trimmed ? `Speaker set to "${trimmed}".` : 'Speaker label removed.');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update speaker label.', 'error');
    } finally {
      setIsSavingSpeaker(false);
    }
  };

  // Batch rename speaker
  const handleBatchRenameSpeaker = async () => {
    const oldName = renameOldSpeaker.trim();
    const newName = renameNewSpeaker.trim();
    if (!oldName || !newName) {
      showToast('Both current and new speaker names are required.', 'error');
      return;
    }
    try {
      setIsRenamingSpeaker(true);
      const res = await api.post(`/meetings/${id}/speakers/rename`, {
        old_name: oldName,
        new_name: newName,
      });
      setSegments((prev) =>
        prev.map((s) => (s.speaker === oldName ? { ...s, speaker: newName } : s))
      );
      setIsRenameSpeakerOpen(false);
      setRenameNewSpeaker('');
      showToast(res.data.message || `Renamed "${oldName}" to "${newName}" across meeting.`);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to rename speaker.', 'error');
    } finally {
      setIsRenamingSpeaker(false);
    }
  };

  // Action item toggle with optimistic rollback
  const handleToggleActionItem = async (itemId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    setActionItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    );
    try {
      await api.patch(`/action-items/${itemId}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update action item status:', err);
      setActionItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: currentStatus } : item))
      );
      showToast('Failed to update task status.', 'error');
    }
  };

  // Delete meeting
  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete "${meeting.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      await api.delete(`/meetings/${id}`);
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete meeting.', 'error');
      setDeleting(false);
    }
  };

  // Export to Markdown
  const handleExportMarkdown = async () => {
    if (!isReady) return;
    try {
      setExporting(true);
      const res = await api.get(`/meetings/${id}/export?format=md`, {
        responseType: 'blob',
      });
      let filename = `${meeting.title || 'meeting'}-export.md`;
      const disposition = res.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = new Blob([res.data], { type: 'text/markdown;charset=utf-8' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('Meeting exported to Markdown successfully.');
    } catch (err) {
      console.error('Export error:', err);
      showToast(err.response?.data?.detail || 'Failed to export meeting.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Follow-up Email Generation
  const handleGenerateEmail = async (overrideTone) => {
    const toneToUse = overrideTone || emailTone;
    try {
      setIsGeneratingEmail(true);
      setEmailError('');
      const res = await api.post(`/meetings/${id}/follow-up-email`, {
        tone: toneToUse,
      });
      setEmailSubject(res.data.subject || '');
      setEmailBody(res.data.body || '');
      showToast('Follow-up email generated.');
    } catch (err) {
      console.error('Email generation error:', err);
      const msg = err.response?.data?.detail || 'Failed to generate follow-up email.';
      setEmailError(msg);
      showToast(msg, 'error');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopySubject = async () => {
    if (!emailSubject) return;
    try {
      await navigator.clipboard.writeText(emailSubject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
      showToast('Subject copied to clipboard.');
    } catch {
      showToast('Failed to copy subject.', 'error');
    }
  };

  const handleCopyBody = async () => {
    if (!emailBody) return;
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
      showToast('Email body copied to clipboard.');
    } catch {
      showToast('Failed to copy email body.', 'error');
    }
  };

  const getMailtoLink = () => {
    const subjectParam = encodeURIComponent(emailSubject || '');
    const bodyParam = encodeURIComponent(emailBody || '');
    return `mailto:?subject=${subjectParam}&body=${bodyParam}`;
  };

  const filteredSegments = segments.filter((seg) => {
    const q = searchTerm.toLowerCase();
    const matchesText = seg.text && seg.text.toLowerCase().includes(q);
    const matchesSpeaker = seg.speaker && seg.speaker.toLowerCase().includes(q);
    return matchesText || matchesSpeaker;
  });

  const navLinks = [
    { label: 'Meetings', href: '/dashboard', active: true },
    { label: 'Tasks', href: '/tasks' },
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

  // Loading skeleton state
  if (loading) {
    return (
      <AppShell>
        <TopBar navLinks={navLinks} action={logoutButton} />
        <div className="w-full px-6 lg:px-10 py-12 flex-1 flex flex-col gap-8">
          <div className="h-6 w-32 bg-frame border border-hairline rounded-pill animate-pulse" />
          <div className="h-12 w-3/4 max-w-xl bg-frame border border-hairline rounded-input animate-pulse" />
          <div className="h-40 w-full bg-frame border border-hairline rounded-card animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-frame border border-hairline rounded-card animate-pulse" />
            <div className="lg:col-span-4 h-96 bg-frame border border-hairline rounded-card animate-pulse" />
          </div>
        </div>
        <Footer />
      </AppShell>
    );
  }

  // Error state
  if (error || !meeting) {
    return (
      <AppShell>
        <TopBar navLinks={navLinks} action={logoutButton} />
        <div className="w-full px-6 lg:px-10 py-16 flex-1 flex flex-col items-center justify-center">
          <div className="max-w-lg w-full bg-white border border-hairline rounded-card p-8 text-center flex flex-col items-center gap-4">
            <h2 className="font-display font-bold text-2xl text-ink">Meeting Not Found</h2>
            <p className="font-sans text-sm text-muted">
              {error || 'Could not find the requested meeting.'}
            </p>
            <Button to="/dashboard" variant="primary" size="md">
              Return to Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </AppShell>
    );
  }

  const badgeConfig = getStatusBadgeConfig(meeting.status);

  return (
    <AppShell>
      <TopBar navLinks={navLinks} action={logoutButton} />

      {/* Subheader & Page Controls Bar */}
      <section className="w-full px-6 lg:px-10 pt-8 pb-6 border-b border-hairline bg-frame">
        <div className="flex flex-col gap-4">
          {/* Back Link */}
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              <span>←</span>
              <span>Meetings</span>
            </Link>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              {/* Inline Title Edit */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2 max-w-2xl">
                  <input
                    type="text"
                    value={titleInputValue}
                    onChange={(e) => setTitleInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    maxLength={120}
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-white border border-ink rounded-input font-display text-2xl sm:text-3xl font-extrabold text-ink focus:outline-none"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveTitle}
                    disabled={isSavingTitle || !titleInputValue.trim()}
                    title="Save title"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingTitle(false)}
                    disabled={isSavingTitle}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group flex-wrap">
                  <h1 className="font-display font-extrabold text-3xl sm:text-[44px] sm:leading-[48px] text-ink tracking-tight">
                    {meeting.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(true);
                      setTitleInputValue(meeting.title);
                    }}
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    title="Rename meeting"
                    aria-label="Rename meeting"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Metadata Row */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className="font-mono text-xs sm:text-[13px] text-muted tracking-wider uppercase">
                  {formatDate(meeting.created_at)}
                </span>
                <span className="text-hairline">•</span>
                <span className="font-mono text-xs sm:text-[13px] text-muted tracking-wider">
                  {formatDuration(meeting.duration_seconds)}
                </span>
                <span className="text-hairline">•</span>
                <Badge variant={badgeConfig.variant} dot={badgeConfig.dot}>
                  {badgeConfig.label}
                </Badge>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMarkdown}
                disabled={!isReady || exporting}
                title={!isReady ? 'Export is available once the meeting is ready' : 'Download Markdown export (.md)'}
              >
                {exporting ? 'Exporting...' : 'Export'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEmailModalOpen(true);
                  if (!emailSubject && !emailBody) {
                    handleGenerateEmail();
                  }
                }}
                disabled={!isReady}
                title={!isReady ? 'Follow-up email is available once the meeting is ready' : 'Draft a follow-up email recap'}
              >
                Follow-up email
              </Button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-2.5 rounded-pill border border-hairline text-muted hover:text-status-failed-text hover:border-status-failed-text/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                title="Delete meeting"
                aria-label="Delete meeting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Two-Column Layout */}
      <main className="flex-1 w-full px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (~66% width / 8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* PROCESSING STATE: Flat Stepper & 5-Second Polling */}
          {isProcessing && (
            <div className="bg-white rounded-[20px] border border-hairline p-6 flex flex-col gap-4 shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-base text-ink">
                    {meeting.status === 'transcribing'
                      ? 'Transcribing Audio...'
                      : meeting.status === 'analyzing'
                      ? 'Analyzing Discussion & Generating Summary...'
                      : 'Processing Audio Upload...'}
                  </h3>
                  <p className="font-sans text-xs text-muted mt-0.5">
                    {meeting.status === 'analyzing'
                      ? 'Extracting summary, tasks, and decisions with Gemini. Polling every 5 seconds.'
                      : 'Running speech-to-text pipeline in background. Polling every 5 seconds.'}
                  </p>
                </div>
                <Badge variant="analyzing">
                  {meeting.status}
                </Badge>
              </div>

              {/* Flat Stepper Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-hairline">
                {['uploaded', 'transcribing', 'analyzing', 'ready'].map((step, idx) => {
                  const stepStatus = (() => {
                    const currIdx = STEP_ORDER.indexOf(meeting.status?.toLowerCase());
                    const thisIdx = idx;
                    if (thisIdx < currIdx) return 'completed';
                    if (thisIdx === currIdx) return 'current';
                    return 'pending';
                  })();

                  const stepLabels = ['1. Uploaded', '2. Transcribing', '3. Analyzing', '4. Ready'];

                  let stepClasses = 'bg-frame border-hairline text-muted';
                  if (stepStatus === 'current') {
                    stepClasses = 'bg-ink text-frame border-ink font-bold';
                  } else if (stepStatus === 'completed') {
                    stepClasses = 'bg-status-ready-bg text-status-ready-text border-status-ready-text/20 font-semibold';
                  }

                  return (
                    <div
                      key={step}
                      className={`p-3 rounded-xl border text-center font-sans text-xs transition-colors ${stepClasses}`}
                    >
                      <p>{stepLabels[idx]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAILED STATE: Error Message & Delete Button (No Retry) */}
          {isFailed && (
            <div className="bg-status-failed-bg border border-status-failed-text/20 rounded-[20px] p-6 text-status-failed-text shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-status-failed-text">
                    Transcription Failed
                  </h3>
                  <p className="font-sans text-xs text-status-failed-text/90 leading-relaxed">
                    {meeting.error_message || 'An error occurred during audio processing or model transcription.'}
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-status-failed-text hover:bg-black text-white shrink-0"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Speakers Legend (Real Speakers) */}
          {uniqueSpeakers.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-sans text-xs uppercase tracking-wider text-muted font-semibold select-none">
                Speakers
              </span>
              {uniqueSpeakers.map((spk) => {
                const tint = getSpeakerTint(spk);
                return (
                  <span
                    key={spk}
                    className={`inline-flex items-center px-3.5 py-1 rounded-pill ${tint} border border-hairline font-sans text-xs sm:text-[13px] font-semibold text-ink shadow-none`}
                  >
                    {spk}
                  </span>
                );
              })}
            </div>
          )}

          {/* Navigation Tabs Row */}
          <div
            role="tablist"
            aria-label="Meeting content sections"
            className="border-b border-hairline flex items-center gap-6 sm:gap-8 overflow-x-auto"
          >
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'transcript', label: 'Transcript', count: segments.length },
              { id: 'action-items', label: 'Action items', count: actionItems.length },
              { id: 'decisions', label: 'Decisions', count: decisions.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 border-b-2 font-sans text-base sm:text-[17px] transition-colors duration-150 flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                    isActive
                      ? 'border-ink font-semibold text-ink'
                      : 'border-transparent font-medium text-muted hover:text-ink'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="font-mono text-xs text-muted">
                      ({tab.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex flex-col gap-8">
            {/* 1. SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div
                id="tabpanel-summary"
                role="tabpanel"
                aria-labelledby="tab-summary"
                className="flex flex-col gap-8"
              >
                {/* Lavender Summary Accent Block */}
                <section className="bg-lavender rounded-[20px] border border-hairline p-6 sm:p-8 flex flex-col gap-3 shadow-none">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-ink">
                    Summary
                  </h2>
                  <p className="font-sans text-base sm:text-[17px] leading-relaxed text-ink">
                    {meeting.summary || 'No summary available for this meeting.'}
                  </p>
                </section>

                {/* Key Points Section */}
                {meeting.key_points && meeting.key_points.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink">
                      Key points
                    </h3>
                    <ul className="flex flex-col gap-3 pl-1">
                      {meeting.key_points.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-ink text-lg leading-6 select-none font-bold">•</span>
                          <span className="font-sans text-base text-ink leading-relaxed">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Action Items Overview */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink">
                      Action items
                    </h3>
                    {actionItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('action-items')}
                        className="font-sans text-xs text-muted hover:text-ink transition-colors"
                      >
                        View all ({actionItems.length}) →
                      </button>
                    )}
                  </div>

                  {actionItems.length === 0 ? (
                    <div className="bg-white rounded-[16px] border border-hairline p-6 text-center text-sm text-muted">
                      No action items detected in this meeting.
                    </div>
                  ) : (
                    <div className="bg-white rounded-[16px] border border-hairline overflow-hidden divide-y divide-hairline shadow-none">
                      {actionItems.slice(0, 4).map((item) => {
                        const isDone = item.status === 'done';
                        const tint = item.assigned_to ? getSpeakerTint(item.assigned_to) : 'bg-frame';
                        return (
                          <div
                            key={item.id}
                            className="p-4 px-5 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <input
                                id={`summary-item-${item.id}`}
                                type="checkbox"
                                checked={isDone}
                                onChange={() => handleToggleActionItem(item.id, item.status)}
                                className="w-5 h-5 rounded-[6px] border-[1.5px] border-hairline text-ink focus:ring-0 cursor-pointer"
                              />
                              <label
                                htmlFor={`summary-item-${item.id}`}
                                className={`font-sans text-sm sm:text-base text-ink cursor-pointer select-none truncate ${
                                  isDone ? 'line-through text-muted' : ''
                                }`}
                              >
                                {item.task}
                              </label>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`inline-flex items-center px-3 py-0.5 rounded-pill ${tint} border border-hairline font-sans text-xs sm:text-[13px] font-medium text-ink`}
                              >
                                {item.assigned_to || 'Unassigned'}
                              </span>
                              <span className="font-mono text-xs uppercase text-muted font-semibold">
                                {formatDeadline(item)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Decisions Overview */}
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg sm:text-xl text-ink">
                      Decisions
                    </h3>
                    {decisions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('decisions')}
                        className="font-sans text-xs text-muted hover:text-ink transition-colors"
                      >
                        View all ({decisions.length}) →
                      </button>
                    )}
                  </div>

                  {decisions.length === 0 ? (
                    <div className="bg-white rounded-[16px] border border-hairline p-6 text-center text-sm text-muted">
                      No decisions logged in this meeting.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {decisions.slice(0, 3).map((dec, idx) => (
                        <div
                          key={dec.id || idx}
                          className="bg-white rounded-[16px] border border-hairline p-4 sm:p-5 flex items-center justify-between gap-4 shadow-none"
                        >
                          <span className="font-sans text-sm sm:text-base font-medium text-ink">
                            {dec.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 2. TRANSCRIPT TAB */}
            {activeTab === 'transcript' && (
              <div
                id="tabpanel-transcript"
                role="tabpanel"
                aria-labelledby="tab-transcript"
                className="flex flex-col gap-6"
              >
                {/* Search & Batch Rename Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Search dialogue or speaker..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-pill border border-hairline bg-white font-sans text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors"
                    />
                    <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {isReady && uniqueSpeakers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsRenameSpeakerOpen(true);
                        setRenameOldSpeaker(uniqueSpeakers[0] || '');
                        setRenameNewSpeaker('');
                      }}
                      className="text-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Rename speaker</span>
                    </Button>
                  )}
                </div>

                {/* Segments List */}
                {segmentsLoading ? (
                  <div className="py-12 text-center text-sm text-muted font-sans">
                    Loading transcript segments...
                  </div>
                ) : segments.length === 0 ? (
                  <div className="bg-white rounded-[16px] border border-hairline p-10 text-center text-muted font-sans text-sm">
                    No speech detected in this recording.
                  </div>
                ) : filteredSegments.length === 0 ? (
                  <div className="bg-white rounded-[16px] border border-hairline p-10 text-center text-muted font-sans text-sm">
                    No matching dialogue found for "{searchTerm}".
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {filteredSegments.map((seg) => {
                      const isHighlighted = highlightedSegmentId === seg.id;
                      const speakerTint = getSpeakerTint(seg.speaker);
                      const isEditingText = editingTextSegId === seg.id;
                      const isEditingSpeaker = editingSpeakerSegId === seg.id;

                      return (
                        <div
                          key={seg.id}
                          id={`segment-${seg.id}`}
                          className={`p-4 sm:p-5 rounded-[16px] border transition-colors flex flex-col gap-2.5 ${
                            isHighlighted
                              ? 'bg-lavender/40 border-ink ring-2 ring-ink/30'
                              : 'bg-white border-hairline'
                          }`}
                        >
                          {/* Segment Header */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {/* Monospace Timestamp */}
                              <span className="font-mono text-xs text-muted tracking-wider select-none">
                                {formatSeconds(seg.start_time)} – {formatSeconds(seg.end_time)}
                              </span>

                              {/* Speaker Chip / Inline Speaker Edit */}
                              {isEditingSpeaker ? (
                                <div className="inline-flex items-center gap-1 bg-white border border-ink rounded-pill px-2.5 py-0.5">
                                  <input
                                    list="meeting-speakers-datalist"
                                    type="text"
                                    value={speakerInputValue}
                                    onChange={(e) => setSpeakerInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveSpeaker(seg.id);
                                      if (e.key === 'Escape') setEditingSpeakerSegId(null);
                                    }}
                                    placeholder="Speaker name..."
                                    autoFocus
                                    className="w-28 bg-transparent text-xs text-ink placeholder:text-muted/60 focus:outline-none font-sans font-medium"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSpeaker(seg.id)}
                                    disabled={isSavingSpeaker}
                                    className="text-status-ready-text hover:text-black p-0.5 rounded"
                                    title="Save speaker"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSpeakerSegId(null)}
                                    disabled={isSavingSpeaker}
                                    className="text-muted hover:text-ink p-0.5 rounded"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSpeakerSegId(seg.id);
                                    setSpeakerInputValue(seg.speaker || '');
                                  }}
                                  className={`inline-flex items-center px-3 py-0.5 rounded-pill ${speakerTint} border border-hairline font-sans text-xs font-semibold text-ink hover:opacity-85 transition-opacity`}
                                  title="Click to assign or change speaker"
                                >
                                  {seg.speaker || '+ Speaker'}
                                </button>
                              )}
                            </div>

                            {/* Edit Text Button */}
                            {!isEditingText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTextSegId(seg.id);
                                  setTextInputValue(seg.text);
                                }}
                                className="p-1 rounded text-muted hover:text-ink transition-colors text-xs flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                                title="Edit transcript segment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="font-sans text-[11px]">Edit</span>
                              </button>
                            )}
                          </div>

                          {/* Segment Body */}
                          {isEditingText ? (
                            <div className="flex flex-col gap-2 pt-1">
                              <textarea
                                value={textInputValue}
                                onChange={(e) => setTextInputValue(e.target.value)}
                                rows={2}
                                autoFocus
                                className="w-full p-3 bg-frame border border-ink rounded-input font-sans text-sm text-ink focus:outline-none leading-relaxed resize-y"
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveSegmentText(seg.id)}
                                  disabled={isSavingText || !textInputValue.trim()}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingTextSegId(null)}
                                  disabled={isSavingText}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-sans text-sm sm:text-base text-ink leading-relaxed inline">
                                {seg.text}
                              </p>
                              {seg.edited && (
                                <span
                                  className="ml-2 font-mono text-[10px] uppercase font-semibold text-muted bg-frame border border-hairline px-1.5 py-0.5 rounded select-none align-baseline"
                                  title="This transcript segment was edited"
                                >
                                  edited
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. ACTION ITEMS TAB */}
            {activeTab === 'action-items' && (
              <div
                id="tabpanel-action-items"
                role="tabpanel"
                aria-labelledby="tab-action-items"
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl text-ink">
                    Action items
                  </h3>
                  {actionItems.length > 0 && (
                    <span className="font-mono text-xs text-muted">
                      {actionItems.filter((i) => i.status === 'done').length} of {actionItems.length} completed
                    </span>
                  )}
                </div>

                {actionItemsLoading ? (
                  <div className="py-12 text-center text-sm text-muted font-sans">
                    Loading action items...
                  </div>
                ) : actionItems.length === 0 ? (
                  <div className="bg-white rounded-[16px] border border-hairline p-10 text-center text-muted font-sans text-sm">
                    No action items detected in this meeting.
                  </div>
                ) : (
                  <div className="bg-white rounded-[16px] border border-hairline overflow-hidden divide-y divide-hairline shadow-none">
                    {actionItems.map((item) => {
                      const isDone = item.status === 'done';
                      const tint = item.assigned_to ? getSpeakerTint(item.assigned_to) : 'bg-frame';
                      return (
                        <div
                          key={item.id}
                          className="p-4 px-5 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <input
                              id={`item-${item.id}`}
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleToggleActionItem(item.id, item.status)}
                              className="w-5 h-5 rounded-[6px] border-[1.5px] border-hairline text-ink focus:ring-0 cursor-pointer shrink-0"
                            />
                            <label
                              htmlFor={`item-${item.id}`}
                              className={`font-sans text-sm sm:text-base text-ink cursor-pointer select-none truncate ${
                                isDone ? 'line-through text-muted' : ''
                              }`}
                            >
                              {item.task}
                            </label>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`inline-flex items-center px-3 py-0.5 rounded-pill ${tint} border border-hairline font-sans text-xs sm:text-[13px] font-medium text-ink`}
                            >
                              {item.assigned_to || 'Unassigned'}
                            </span>
                            <span className="font-mono text-xs uppercase text-muted font-semibold">
                              {formatDeadline(item)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. DECISIONS TAB */}
            {activeTab === 'decisions' && (
              <div
                id="tabpanel-decisions"
                role="tabpanel"
                aria-labelledby="tab-decisions"
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl text-ink">
                    Decisions
                  </h3>
                  {decisions.length > 0 && (
                    <span className="font-mono text-xs text-muted">
                      {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
                    </span>
                  )}
                </div>

                {decisionsLoading ? (
                  <div className="py-12 text-center text-sm text-muted font-sans">
                    Loading decisions...
                  </div>
                ) : decisions.length === 0 ? (
                  <div className="bg-white rounded-[16px] border border-hairline p-10 text-center text-muted font-sans text-sm">
                    No decisions detected in this meeting.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {decisions.map((dec, idx) => (
                      <div
                        key={dec.id || idx}
                        className="bg-white rounded-[16px] border border-hairline p-4 sm:p-5 flex items-center justify-between gap-4 shadow-none"
                      >
                        <span className="font-sans text-sm sm:text-base font-medium text-ink">
                          {dec.decision}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (~34% width / 4 cols on desktop) */}
        <aside className="lg:col-span-4 h-full">
          <MeetingChat
            meetingId={meeting.id}
            isReady={isReady}
            meetingStatus={meeting.status}
            onTimestampClick={handleTimestampClick}
          />
        </aside>
      </main>

      <Footer />

      {/* HTML5 Datalist for Speaker Autocomplete */}
      <datalist id="meeting-speakers-datalist">
        {uniqueSpeakers.map((spk) => (
          <option key={spk} value={spk} />
        ))}
      </datalist>

      {/* Batch Rename Speaker Modal */}
      {isRenameSpeakerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 shadow-none">
          <div className="bg-white border border-hairline rounded-[20px] p-6 w-full max-w-md shadow-none flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-ink" />
                <span>Rename Speaker Everywhere</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRenameSpeakerOpen(false)}
                className="p-1 rounded text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-sans text-xs font-medium text-muted mb-1.5">
                  Select Existing Speaker
                </label>
                <select
                  value={renameOldSpeaker}
                  onChange={(e) => setRenameOldSpeaker(e.target.value)}
                  className="w-full h-11 px-3 bg-frame border border-hairline rounded-input font-sans text-sm text-ink focus:outline-none focus:border-ink"
                >
                  {uniqueSpeakers.map((spk) => (
                    <option key={spk} value={spk}>
                      {spk} ({segments.filter((s) => s.speaker === spk).length} segment{segments.filter((s) => s.speaker === spk).length === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-sans text-xs font-medium text-muted mb-1.5">
                  New Speaker Name
                </label>
                <input
                  type="text"
                  value={renameNewSpeaker}
                  onChange={(e) => setRenameNewSpeaker(e.target.value)}
                  placeholder="e.g. Radhika"
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBatchRenameSpeaker();
                  }}
                  className="w-full h-11 px-3 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRenameSpeakerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchRenameSpeaker}
                disabled={isRenamingSpeaker || !renameNewSpeaker.trim() || !renameOldSpeaker}
              >
                {isRenamingSpeaker ? 'Renaming...' : 'Rename Everywhere'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 shadow-none">
          <div className="bg-white border border-hairline rounded-[20px] p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-hairline shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">
                  Draft Follow-Up Email
                </h3>
                <p className="font-sans text-xs text-muted">
                  Recap meeting summary, action items, and decisions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 rounded text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
              {/* Tone Toggle & Generate Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-frame border border-hairline rounded-card">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-muted">Tone:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTone('friendly');
                        if (emailSubject || emailBody) handleGenerateEmail('friendly');
                      }}
                      className={`px-3.5 py-1 rounded-pill font-sans text-xs font-medium transition-colors ${
                        emailTone === 'friendly'
                          ? 'bg-ink text-frame'
                          : 'border border-hairline text-muted hover:text-ink bg-white'
                      }`}
                    >
                      Friendly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTone('formal');
                        if (emailSubject || emailBody) handleGenerateEmail('formal');
                      }}
                      className={`px-3.5 py-1 rounded-pill font-sans text-xs font-medium transition-colors ${
                        emailTone === 'formal'
                          ? 'bg-ink text-frame'
                          : 'border border-hairline text-muted hover:text-ink bg-white'
                      }`}
                    >
                      Formal
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleGenerateEmail()}
                  disabled={isGeneratingEmail}
                >
                  {isGeneratingEmail ? 'Generating with Gemini...' : emailSubject || emailBody ? 'Regenerate' : 'Generate'}
                </Button>
              </div>

              {/* Error Alert */}
              {emailError && (
                <div className="p-3 bg-status-failed-bg border border-status-failed-text/20 rounded-xl text-status-failed-text font-sans text-xs">
                  {emailError}
                </div>
              )}

              {/* Subject Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-sans text-xs font-medium text-ink">Subject</label>
                  {emailSubject && (
                    <button
                      type="button"
                      onClick={handleCopySubject}
                      className="font-sans text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSubject ? 'Copied!' : 'Copy Subject'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject will appear here..."
                  className="w-full h-11 px-3 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink"
                />
              </div>

              {/* Body Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-sans text-xs font-medium text-ink">Email Body</label>
                  {emailBody && (
                    <button
                      type="button"
                      onClick={handleCopyBody}
                      className="font-sans text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedBody ? 'Copied!' : 'Copy Body'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email body will appear here..."
                  className="w-full p-3 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-hairline shrink-0">
              <div>
                {(emailSubject || emailBody) && (
                  <a
                    href={getMailtoLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-ink hover:underline decoration-hairline underline-offset-4"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in email app</span>
                  </a>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification (Flat, no blur) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-card border shadow-none flex items-center gap-3 font-sans text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-status-failed-bg text-status-failed-text border-status-failed-text/30'
                : 'bg-white text-ink border-hairline'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-muted hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
