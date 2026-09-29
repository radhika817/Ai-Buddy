export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of your recent meetings and action items.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            System Online
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Meetings</p>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
        <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Pending Tasks</p>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
        <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Decisions Recorded</p>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
      </div>

      <div className="mt-8 p-12 bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl text-center">
        <p className="text-slate-400 font-medium">No meetings yet</p>
        <p className="text-xs text-slate-500 mt-1">Upload a recording to start capturing insights.</p>
      </div>
    </div>
  );
}
