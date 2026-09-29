import { useParams } from 'react-router-dom';

export default function MeetingDetail() {
  const { id } = useParams();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="pb-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Meeting ID: {id || 'demo'}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Status: Ready
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-4 tracking-tight">Meeting Details</h1>
        <p className="text-slate-400 mt-1">
          Review timestamped transcripts, summaries, action items, and key decisions.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
            <p className="text-sm text-slate-400">
              Placeholder — AI generated summary will appear here once processed.
            </p>
          </div>
          <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Transcript</h2>
            <p className="text-sm text-slate-400">
              Placeholder — Timestamped transcript segments will be displayed here.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Action Items</h2>
            <p className="text-sm text-slate-400">Placeholder — Extracted tasks & deadlines.</p>
          </div>
          <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Decisions</h2>
            <p className="text-sm text-slate-400">Placeholder — Key decisions logged.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
