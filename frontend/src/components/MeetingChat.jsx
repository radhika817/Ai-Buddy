import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles, AlertCircle, Clock, RotateCcw, User } from 'lucide-react';
import api from '../services/api';

const SUGGESTED_QUESTIONS = [
  'Summarize this meeting',
  'What are my action items?',
  'What decisions were made?',
];

function renderAnswerWithTimestamps(text, onTimestampClick) {
  if (!text) return null;
  // Match [MM:SS] or [HH:MM:SS]
  const parts = text.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\])/g);
  return parts.map((part, idx) => {
    const match = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
    if (match) {
      const timeStr = match[1];
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onTimestampClick && onTimestampClick(timeStr)}
          title={`Jump to ${timeStr} in transcript`}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/35 hover:text-accent-200 border border-accent-500/40 transition-colors cursor-pointer align-baseline"
        >
          <Clock className="w-2.5 h-2.5" />
          <span>[{timeStr}]</span>
        </button>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function MeetingChat({ meetingId, isReady, meetingStatus, onTimestampClick }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const question = (textToSend !== undefined ? textToSend : input).trim();
    if (!question || loading || !isReady) return;

    setError('');
    setInput('');

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: question,
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setLoading(true);

    try {
      // Send max last 6 history items
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post(`/meetings/${meetingId}/chat`, {
        question,
        history: historyPayload,
      });

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: res.data.answer || "That wasn't discussed in this meeting.",
      };

      setMessages([...currentMessages, assistantMessage]);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        'Failed to get a response from AI Buddy. Please verify your connection and try again.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-xl flex flex-col h-[560px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-500/10 border border-accent-500/30 text-accent-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Ask AI Buddy</h3>
              <span className="flex h-2 w-2 relative">
                {isReady && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isReady ? 'Grounded on this meeting’s transcript' : `Status: ${meetingStatus || 'processing'}`}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Empty State / Suggested Chips */}
        {messages.length === 0 && (
          <div className="py-6 px-2 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-accent-500/15 to-teal-400/10 border border-accent-500/25 flex items-center justify-center text-accent-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Have a question about this meeting?</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Ask about key takeaways, decisions, action items, or specific statements. Cites timestamps directly.
              </p>
            </div>

            {isReady && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Suggested Questions
                </p>
                <div className="flex flex-col gap-1.5 max-w-xs mx-auto">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-accent-500/40 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-accent-500/15 border border-accent-500/30 text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-accent-600/30 to-teal-500/20 text-white border border-accent-500/30 rounded-tr-xs shadow-md shadow-accent-500/5'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
                }`}
              >
                {msg.role === 'assistant'
                  ? renderAnswerWithTimestamps(msg.content, onTimestampClick)
                  : msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing / Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-accent-400"
          >
            <div className="w-6 h-6 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-accent-400" />
              <span className="text-slate-400 text-xs">AI Buddy is searching the transcript...</span>
            </div>
          </motion.div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips bar if there are messages */}
      {isReady && messages.length > 0 && !loading && (
        <div className="px-3 py-1.5 border-t border-slate-800/60 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 mr-1">Ask:</span>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Footer / Input area */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        {!isReady ? (
          <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-medium">
              AI Buddy chat will be available once audio processing is complete.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !isReady}
              placeholder="Ask a question about this meeting..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !isReady}
              className="p-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 disabled:opacity-40 disabled:hover:bg-accent-500 text-slate-950 font-semibold transition-all shadow-md shadow-accent-500/20 shrink-0 cursor-pointer"
              title="Send message (Enter)"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
