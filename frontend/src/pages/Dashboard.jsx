import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  Sparkles,
  ArrowUpRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const SAMPLE_MEETINGS = [
  {
    id: '1',
    title: 'Q3 System Architecture & Database Planning',
    date: 'Sep 28, 2026',
    duration: '45 mins',
    status: 'Ready',
    participants: ['Radhika', 'Atharva', 'Tejas'],
    summary: 'Finalized PostgreSQL with pgvector for meeting memory. Decided on OpenAI Whisper API for fast background transcription.',
    actionItemsCount: 4,
    decisionsCount: 2,
  },
  {
    id: '2',
    title: 'Frontend UI/UX Polish & Design Tokens',
    date: 'Sep 25, 2026',
    duration: '32 mins',
    status: 'Ready',
    participants: ['Radhika', 'Atharva'],
    summary: 'Reviewed dark modern color palette, Framer Motion page transitions, and responsive mobile navigation components.',
    actionItemsCount: 3,
    decisionsCount: 1,
  },
  {
    id: '3',
    title: 'Backend Pipeline & Whisper Integration Sync',
    date: 'Today, 10:30 AM',
    duration: '24 mins',
    status: 'Analyzing',
    participants: ['Radhika'],
    summary: 'Audio extracted and transcribed via Whisper. AI model currently generating summary, task owners, and decision log.',
    actionItemsCount: null,
    decisionsCount: null,
  },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner / Greeting */}
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
            <span className="text-3xl font-bold text-white">12</span>
            <span className="text-xs text-accent-400 font-medium">+2 this week</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Action Items
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">7</span>
            <span className="text-xs text-amber-400 font-medium">3 due soon</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Decisions Logged
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">19</span>
            <span className="text-xs text-slate-400 font-medium">Across all meetings</span>
          </div>
        </motion.div>
      </div>

      {/* Recent Meetings Section Header with Search Mockup */}
      <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Recent Meetings</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any meeting card to view transcript & extracted insights</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search meetings..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
            />
          </div>
          <button
            type="button"
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Styled Meeting Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SAMPLE_MEETINGS.map((meeting) => (
          <motion.div
            key={meeting.id}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="group flex flex-col bg-slate-900/60 hover:bg-slate-900/90 backdrop-blur-md border border-slate-800/80 hover:border-accent-500/40 rounded-2xl p-6 transition-all shadow-xl hover:shadow-2xl hover:shadow-accent-500/5 cursor-pointer"
          >
            <Link to={`/meetings/${meeting.id}`} className="flex flex-col flex-1">
              {/* Card Header: Status & Duration */}
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {meeting.date}
                </span>

                {meeting.status === 'Ready' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Analyzing...
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-accent-300 transition-colors line-clamp-2">
                {meeting.title}
              </h3>

              {/* Summary snippet */}
              <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                {meeting.summary}
              </p>

              {/* Attendees */}
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{meeting.participants.join(', ')}</span>
                <span className="mx-1 text-slate-600">•</span>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{meeting.duration}</span>
              </div>

              {/* Highlights Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-xs">
                {meeting.status === 'Ready' ? (
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="text-accent-400 font-medium">{meeting.actionItemsCount} Tasks</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-medium">{meeting.decisionsCount} Decisions</span>
                  </div>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Generating insights...
                  </span>
                )}

                <span className="text-slate-500 group-hover:text-accent-400 transition-colors flex items-center gap-0.5 font-medium">
                  View
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
