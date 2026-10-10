import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  RotateCcw,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  ListTodo,
  FileText,
  Users,
  RotateCw,
} from 'lucide-react';
import api from '../services/api';

const SUGGESTED_QUESTIONS = [
  {
    title: 'Recent Decisions',
    question: 'What decisions were made recently?',
    icon: CheckCircle2,
    gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
  },
  {
    title: 'Open Action Items',
    question: 'What are my open action items?',
    icon: ListTodo,
    gradient: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
  },
  {
    title: 'Latest Meeting',
    question: 'Summarize my latest meeting',
    icon: FileText,
    gradient: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-300',
  },
  {
    title: 'Responsibilities',
    question: 'Who is responsible for what?',
    icon: Users,
    gradient: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300',
  },
];

function formatSecondsToMMSS(seconds) {
  if (seconds === undefined || seconds === null) return '00:00';
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

/**
 * Parses and renders answer text with in-text citation chips like [Sprint Review, 03:25]
 */
function renderAnswerWithCitations(content, sources = [], onCitationClick) {
  if (!content) return null;

  // Matches bracketed citations like [Meeting Title, 03:25] or [Meeting 1, 00:00; Meeting 2, 01:10]
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
              <span key={subIdx} className="text-accent-400 font-medium">
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 hover:text-accent-200 border border-accent-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <Clock className="w-3 h-3 text-accent-400 shrink-0" />
              <span className="font-semibold truncate max-w-[150px]">{rawTitle}</span>
              <span className="font-mono text-[11px] text-accent-400">({timeStr})</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
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
  const textareaRef = useRef(null);

  // Sync to sessionStorage
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

    // Append user message
    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: questionToSend,
      timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        (status === 429
          ? 'Too many requests or high API demand. Please wait a moment before trying again.'
          : 'Failed to get an answer from AI Buddy. Please verify your connection and try again.');

      setErrorState({
        message: detail,
        retryQuestion: questionToSend,
      });
    } finally {
      setLoading(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
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

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-600 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-accent-500/20">
            <Bot className="w-5 h-5 text-slate-950 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Ask AI Buddy
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Cross-Meeting AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Semantic memory search across all your recorded meetings & discussions
            </p>
          </div>
        </div>

        {/* New Chat Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleNewChat}
          disabled={messages.length === 0 && !errorState}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </motion.button>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[420px] max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* Empty State with Suggested Questions */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-500/20 via-teal-500/15 to-accent-600/10 border border-accent-500/30 flex items-center justify-center text-accent-400 mb-4 shadow-xl shadow-accent-500/5">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight mb-1">
              Ask anything about your team discussions
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-8">
              AI Buddy searches by meaning across all your indexed meetings, tracks changes over time, and cites exact timestamps.
            </p>

            {/* 4 Suggested Question Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleSendMessage(item.question)}
                    className={`p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border ${item.gradient} transition-all text-left flex items-start gap-3 shadow-lg shadow-black/20 group cursor-pointer`}
                  >
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 shrink-0 group-hover:border-accent-500/30 transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        "{item.question}"
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Message Bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant Icon */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-accent-500/10 border border-accent-500/30 text-accent-400 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Body */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent-500/15 border border-accent-500/30 text-accent-100 rounded-tr-sm shadow-md shadow-accent-500/5'
                    : 'bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-100 rounded-tl-sm shadow-xl shadow-black/20'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.role === 'assistant'
                    ? renderAnswerWithCitations(msg.content, msg.sources, handleCitationClick)
                    : msg.content}
                </div>

                {/* Collapsible Sources (Assistant only) */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleSources(msg.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-accent-300 transition-colors cursor-pointer group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                      <span>Referenced Sources ({msg.sources.length})</span>
                      {expandedSources[msg.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-0.5 group-hover:translate-y-0.5 transition-transform" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSources[msg.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2.5 space-y-2 overflow-hidden"
                        >
                          {msg.sources.map((src, srcIdx) => (
                            <div
                              key={srcIdx}
                              onClick={() => handleCitationClick(src.meeting_id, src.start_time)}
                              title="Click to view segment in meeting transcript"
                              className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800/90 hover:border-accent-500/40 transition-all cursor-pointer group flex flex-col gap-1 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="font-semibold text-white group-hover:text-accent-300 transition-colors flex items-center gap-1.5 truncate">
                                  <ExternalLink className="w-3 h-3 text-accent-400 shrink-0" />
                                  {src.meeting_title}
                                </span>
                                <span className="font-mono text-[11px] text-accent-400 font-semibold px-2 py-0.5 rounded bg-accent-500/10 border border-accent-500/20 shrink-0">
                                  {formatSecondsToMMSS(src.start_time)}
                                </span>
                              </div>
                              {src.text_preview && (
                                <p className="text-xs text-slate-400 line-clamp-2 italic mt-0.5">
                                  "{src.text_preview}"
                                </p>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Animated Typing Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-accent-500/10 border border-accent-500/30 text-accent-400 flex items-center justify-center shrink-0 mt-1 shadow-sm">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-900/80 border border-slate-800 text-slate-300 shadow-xl flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                AI Buddy is searching across your meetings...
              </span>
            </div>
          </motion.div>
        )}

        {/* Error / Rate-limit Message with Retry Button */}
        {errorState && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorState.message}</span>
            </div>
            {errorState.retryQuestion && (
              <button
                type="button"
                onClick={() => handleSendMessage(errorState.retryQuestion)}
                className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2 bg-slate-900/90 backdrop-blur-xl border border-slate-800 focus-within:border-accent-500/50 rounded-2xl p-2 transition-all shadow-xl shadow-black/30"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about decisions, deadlines, tasks across your meetings (Enter to send, Shift+Enter for new line)..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none max-h-32 min-h-[40px] leading-relaxed scrollbar-thin"
          />

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 disabled:opacity-40 disabled:hover:bg-accent-500 text-slate-950 font-semibold transition-all shadow-md shadow-accent-500/20 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center"
            title="Send Message"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Send className="w-4 h-4 stroke-[2.2]" />
            )}
          </motion.button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-2">
          AI Buddy answers exclusively from your meeting recordings with source citations.
        </p>
      </div>
    </div>
  );
}
