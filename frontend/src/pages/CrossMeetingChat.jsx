import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, RotateCcw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { AppShell, TopBar, Button, Footer } from '../components/ui';

const SUGGESTED_QUESTIONS = [
  'What decisions were made recently?',
  'What are my open action items?',
  'Summarize my latest meeting',
  'Who is responsible for what?',
];

function formatSecondsToMMSS(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function renderAnswerWithCitations(content, sources = [], onCitationClick) {
  if (!content) return null;

  // Matches bracketed citations like [Meeting Title, 03:25]
  const bracketRegex = /(\[[^\]]*?\d{1,2}:\d{2}(?::\d{2})?[^\]]*?\])/g;
  const parts = content.split(bracketRegex);

  return parts.map((part, index) => {
    const isBracketed = part.startsWith('[') && part.endsWith(']') && /\d{1,2}:\d{2}/.test(part);
    if (!isBracketed) {
      return <span key={index}>{part}</span>;
    }

    const inner = part.slice(1, -1);
    const subCitations = inner
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    return (
      <span key={index} className="inline-flex flex-wrap items-center gap-1 mx-1 align-baseline">
        {subCitations.map((sub, subIdx) => {
          const match = sub.match(/^(?:Meeting:\s*)?(.*?),\s*(\d{1,2}:\d{2}(?::\d{2})?)$/i);
          if (!match) {
            return (
              <span key={subIdx} className="font-mono text-xs text-muted">
                [{sub}]
              </span>
            );
          }

          const rawTitle = match[1].trim();
          const timeStr = match[2].trim();
          const parsedSeconds = parseTimeSeconds(timeStr);

          // Find matching source
          const matchedSource =
            sources.find((s) => {
              if (!s.meeting_title) return false;
              const sTitle = s.meeting_title.toLowerCase();
              const qTitle = rawTitle.toLowerCase();
              return sTitle.includes(qTitle) || qTitle.includes(sTitle);
            }) || (sources.length === 1 ? sources[0] : null);

          const meetingId = matchedSource ? matchedSource.meeting_id : null;
          const targetTime =
            matchedSource?.start_time !== undefined ? matchedSource.start_time : parsedSeconds;

          return (
            <button
              key={subIdx}
              type="button"
              onClick={() => onCitationClick(meetingId, targetTime)}
              title={
                meetingId
                  ? `Open "${rawTitle}" transcript at ${timeStr}`
                  : `Referenced at ${timeStr}`
              }
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill font-mono text-[11px] font-semibold bg-frame border border-hairline text-muted hover:text-ink hover:border-ink transition-colors cursor-pointer select-none"
            >
              <span className="truncate max-w-[140px] font-sans font-medium">{rawTitle}</span>
              <span>{timeStr}</span>
            </button>
          );
        })}
      </span>
    );
  });
}

export default function CrossMeetingChat() {
  const navigate = useNavigate();

  // Persist conversation in sessionStorage across refreshes
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ai_buddy_cross_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null); // { message: string, retryQuestion: string }
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('ai_buddy_cross_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to cache chat history:', err);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, errorState]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const toggleSources = (messageId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleCitationClick = (meetingId, time) => {
    if (!meetingId) return;
    navigate(`/meetings/${meetingId}?tab=transcript&t=${time}`);
  };

  const handleSendMessage = async (customText) => {
    const questionToSend = (customText !== undefined ? customText : input).trim();
    if (!questionToSend || loading) return;

    setErrorState(null);
    setInput('');

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: questionToSend,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Send max last 6 messages as history
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post('/chat', {
        question: questionToSend,
        history: historyPayload,
      });

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: res.data.answer || "I couldn't find that in your meetings.",
        sources: res.data.sources || [],
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        (status === 429
          ? 'Too many requests. Please wait a moment before trying again.'
          : 'Failed to get an answer from AI Buddy. Please verify your connection and try again.');

      setErrorState({
        message: detail,
        retryQuestion: questionToSend,
      });
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setErrorState(null);
    setExpandedSources({});
    sessionStorage.removeItem('ai_buddy_cross_chat_messages');
  };

  const navLinks = [
    { label: 'Meetings', href: '/dashboard' },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Ask AI', href: '/chat', active: true },
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

      <div className="w-full px-6 lg:px-10 py-8 flex-1 flex flex-col items-center">
        <div className="w-full max-w-[800px] flex-1 flex flex-col gap-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-hairline gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl tracking-tight text-ink">
                <span className="font-display font-extrabold uppercase">ASK ACROSS </span>
                <span className="font-display font-light italic">MEETINGS</span>
              </h1>
              <p className="font-sans text-xs sm:text-sm text-muted mt-1">
                Ask questions across all your recordings with source citations.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              disabled={messages.length === 0 && !errorState}
              className="self-start sm:self-auto text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New chat</span>
            </Button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 flex flex-col gap-4 min-h-[380px] overflow-y-auto pr-1">
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="my-auto py-8 text-center flex flex-col items-center gap-6">
                <div className="max-w-md flex flex-col gap-2">
                  <h2 className="font-display font-bold text-xl text-ink">
                    What would you like to know?
                  </h2>
                  <p className="font-sans text-sm text-muted leading-relaxed">
                    AI Buddy searches across all your recorded meetings and answers questions directly with timestamp citations.
                  </p>
                </div>

                {/* Suggested Question Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="p-3.5 rounded-pill border border-hairline hover:border-ink bg-white font-sans text-xs sm:text-sm text-ink text-left transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    >
                      <span className="truncate">{q}</span>
                      <span className="text-muted text-xs shrink-0">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2">
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end">
                    <div className="max-w-[85%] bg-ink text-frame rounded-2xl rounded-tr-sm px-4 py-3 shadow-none">
                      <p className="font-sans text-sm sm:text-[15px] leading-snug">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <div className="max-w-[90%] bg-chat-bubble-ai text-ink rounded-2xl rounded-tl-sm px-4 py-3 border border-hairline/60 shadow-none">
                      <div className="font-sans text-sm sm:text-[15px] leading-relaxed">
                        {renderAnswerWithCitations(msg.content, msg.sources, handleCitationClick)}
                      </div>
                    </div>

                    {/* Collapsible Sources List */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="max-w-[90%] w-full">
                        <button
                          type="button"
                          onClick={() => toggleSources(msg.id)}
                          className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer py-1"
                        >
                          <span>Sources ({msg.sources.length})</span>
                          {expandedSources[msg.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="mt-2 flex flex-col gap-2">
                            {msg.sources.map((src, srcIdx) => (
                              <div
                                key={srcIdx}
                                onClick={() => handleCitationClick(src.meeting_id, src.start_time)}
                                title="Click to view segment in meeting transcript"
                                className="p-3 rounded-xl bg-white border border-hairline hover:border-ink transition-colors cursor-pointer flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between text-xs gap-2">
                                  <span className="font-sans font-semibold text-ink truncate">
                                    {src.meeting_title}
                                  </span>
                                  <span className="font-mono text-xs text-muted shrink-0">
                                    {formatSecondsToMMSS(src.start_time)}
                                  </span>
                                </div>
                                {src.text_preview && (
                                  <p className="font-sans text-xs text-muted line-clamp-2">
                                    {src.text_preview.slice(0, 150)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Flat Typing Indicator */}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-chat-bubble-ai rounded-2xl rounded-tl-sm border border-hairline/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            )}

            {/* Error Message with Network Retry */}
            {errorState && (
              <div className="p-4 rounded-xl bg-status-failed-bg border border-status-failed-text/20 text-status-failed-text text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorState.message}</span>
                </div>
                {errorState.retryQuestion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(errorState.retryQuestion)}
                    className="self-end sm:self-auto text-xs"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Pill Input Area */}
          <div className="pt-2 border-t border-hairline">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about decisions, deadlines, or topics across meetings"
                className="w-full h-12 pl-5 pr-12 rounded-pill border border-hairline bg-white font-sans text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                aria-label="Send query"
                className="absolute right-1.5 w-9 h-9 rounded-full bg-ink text-frame flex items-center justify-center hover:bg-black disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink active:scale-95"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </AppShell>
  );
}
