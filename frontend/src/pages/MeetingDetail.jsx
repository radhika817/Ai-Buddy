import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Download,
  Share2,
  CheckSquare,
  Bookmark,
  MessageSquare,
  Search,
  Bot
} from 'lucide-react';

const SAMPLE_TRANSCRIPT = [
  {
    speaker: 'Radhika',
    role: 'Lead',
    time: '00:01:15',
    text: "Thanks everyone for joining. Today's goal is to finalize the architecture for AI Buddy, specifically deciding between Whisper API vs running it locally, and establishing our PostgreSQL schema.",
  },
  {
    speaker: 'Atharva',
    role: 'Backend',
    time: '00:02:42',
    text: "I looked into Whisper locally on CPU. A 30-minute recording took almost 20 minutes to transcribe and choked our memory. The OpenAI Whisper API is only $0.006 per minute and responds in seconds.",
  },
  {
    speaker: 'Tejas',
    role: 'Frontend',
    time: '00:04:10',
    text: "Agreed. Using the API lets us keep the server lightweight on Render or Neon. I'll make sure the frontend handles asynchronous background processing with friendly polling status.",
  },
  {
    speaker: 'Radhika',
    role: 'Lead',
    time: '00:05:30',
    text: "Decision made: We will start with OpenAI Whisper API for Phase 1. Atharva, please set up the background task worker. Tejas, let's have the dashboard and upload flow ready by Friday.",
  },
];

const SAMPLE_ACTION_ITEMS = [
  {
    id: 1,
    task: 'Configure FastAPI background worker for Whisper API integration',
    owner: 'Atharva',
    deadline: 'Oct 2, 2026',
    completed: true,
  },
  {
    id: 2,
    task: 'Implement drag-and-drop upload frontend with polling status',
    owner: 'Tejas',
    deadline: 'Oct 4, 2026',
    completed: false,
  },
  {
    id: 3,
    task: 'Connect Neon PostgreSQL database and write initial schema migrations',
    owner: 'Radhika',
    deadline: 'Oct 1, 2026',
    completed: true,
  },
];

const SAMPLE_DECISIONS = [
  {
    id: 1,
    decision: 'Use OpenAI Whisper API for STT instead of self-hosted local model for MVP.',
    timestamp: '00:05:30',
  },
  {
    id: 2,
    decision: 'Adopt Neon PostgreSQL with pgvector for structured records and future RAG memory.',
    timestamp: '00:07:15',
  },
];

export default function MeetingDetail() {
  const { id } = useParams();
  const [tasks, setTasks] = useState(SAMPLE_ACTION_ITEMS);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Analysis Ready
          </span>
          <button
            type="button"
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors text-xs flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meeting Header */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
            Meeting #{id || '1'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Sep 28, 2026
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            45 mins
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Q3 System Architecture & Database Planning
        </h1>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-300">
          <Users className="w-4 h-4 text-accent-400" />
          <span className="font-semibold text-white">Participants:</span>
          <span>Radhika (Lead), Atharva (Backend), Tejas (Frontend)</span>
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
            <p className="text-sm text-slate-300 leading-relaxed">
              The team evaluated transcription infrastructure options and determined that the OpenAI Whisper API is the most viable path forward for the MVP, eliminating hardware bottlenecks. The database will run on PostgreSQL (Neon) with pgvector to prepare for cross-meeting semantic recall.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Key Discussion Points
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 mt-0.5">•</span>
                  <span>Whisper API benchmarked against local CPU execution; API selected for latency and cloud cost efficiency.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 mt-0.5">•</span>
                  <span>Database schema designed with 5 core tables and future pgvector chunks support.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 mt-0.5">•</span>
                  <span>Sprint target set for full Phase 1 MVP completion by next week.</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Transcript Viewer Card */}
          <div className="p-6 sm:p-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent-400" />
                  Full Transcript
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Speaker diarized with synchronized timestamps</p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter dialogue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                />
              </div>
            </div>

            {/* Transcript Timeline */}
            <div className="mt-6 space-y-5">
              {SAMPLE_TRANSCRIPT.map((entry, index) => (
                <div key={index} className="flex gap-4 p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
                  <div className="shrink-0 text-center">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                        entry.speaker === 'Radhika'
                          ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                          : entry.speaker === 'Atharva'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {entry.speaker[0]}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                      {entry.time}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{entry.speaker}</span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800/80">
                        {entry.role}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                </div>
              ))}
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
              <span className="text-xs text-slate-400">
                {tasks.filter((t) => t.completed).length}/{tasks.length} Done
              </span>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    task.completed
                      ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-accent-500/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-accent-500 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p
                        className={`text-xs font-medium leading-snug ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {task.task}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold">
                          @{task.owner}
                        </span>
                        <span className="text-slate-400">Due {task.deadline}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

            <div className="space-y-3">
              {SAMPLE_DECISIONS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800/80 hover:border-cyan-500/30 transition-colors"
                >
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {item.decision}
                  </p>
                  <span className="text-[10px] text-cyan-400 font-mono mt-2 block">
                    Recorded at {item.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Meeting Memory / Q&A Prompt Teaser */}
          <div className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-accent-500/20 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-2 text-accent-400">
              <Bot className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Ask AI Buddy</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask natural language questions about this meeting or across all previous meetings.
            </p>
            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="What was decided about the API?"
                disabled
                className="w-full pl-3 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 placeholder-slate-600 cursor-not-allowed opacity-80"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                Phase 3
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
