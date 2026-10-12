import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, RotateCcw } from 'lucide-react';
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
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-pill font-mono text-[11px] font-semibold bg-frame border border-hairline text-muted hover:text-ink hover:border-ink transition-colors cursor-pointer align-baseline select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
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
    <div className="bg-white rounded-[20px] border border-hairline p-6 flex flex-col justify-between min-h-[580px] lg:sticky lg:top-24 shadow-none">
      {/* Top Area: Header & Messages */}
      <div className="flex flex-col gap-5 flex-1">
        {/* Chat Header */}
        <div className="pb-3 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg text-ink">
              Ask AI Buddy
            </h2>
            <span className="font-sans text-xs text-muted">
              Contextual
            </span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1 rounded text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chat Messages History */}
        <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="py-4 text-left space-y-3">
              <p className="font-sans text-sm text-ink leading-relaxed">
                Have a question about this meeting? Ask about key takeaways, decisions, action items, or specific statements. Cites timestamps directly.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              {msg.role === 'user' ? (
                <div className="flex flex-col items-end">
                  <div className="max-w-[85%] bg-ink text-frame rounded-2xl rounded-tr-sm px-4 py-3 shadow-none">
                    <p className="font-sans text-sm leading-snug">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="max-w-[90%] bg-chat-bubble-ai text-ink rounded-2xl rounded-tl-sm px-4 py-3 border border-hairline/60 shadow-none">
                    <p className="font-sans text-sm leading-relaxed">
                      {renderAnswerWithTimestamps(msg.content, onTimestampClick)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator: Flat three-dot indicator */}
          {loading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-chat-bubble-ai rounded-2xl rounded-tl-sm border border-hairline/60 shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse [animation-delay:200ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-ink/70 animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-status-failed-bg border border-status-failed-text/20 rounded-xl text-status-failed-text text-xs leading-relaxed">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Area: Suggested Prompts & Chat Input */}
      <div className="flex flex-col gap-4 pt-4 border-t border-hairline/50 mt-4">
        {/* Suggested Questions */}
        {isReady && messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-sans text-[11px] uppercase tracking-wider text-muted font-semibold pl-1 select-none">
              Suggested
            </span>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="w-full text-left px-3.5 py-2 rounded-pill border border-hairline hover:border-ink text-ink font-sans text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        {!isReady ? (
          <div className="p-3 rounded-xl bg-frame border border-hairline text-center">
            <p className="font-sans text-xs text-muted">
              AI Buddy chat will be available once audio processing is complete.
            </p>
          </div>
        ) : (
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !isReady}
              placeholder="Ask about this meeting"
              className="w-full h-12 pl-5 pr-12 rounded-pill border border-hairline bg-frame font-sans text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading || !isReady}
              aria-label="Send query"
              className="absolute right-1.5 w-9 h-9 rounded-full bg-ink text-frame flex items-center justify-center hover:bg-black disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink active:scale-95"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
