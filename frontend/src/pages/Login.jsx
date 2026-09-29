export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md p-8 bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-2xl shadow-xl text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xl border border-emerald-500/20">
          🔐
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Login</h1>
        <p className="text-sm text-slate-400 mb-6">
          Access your account and past meeting transcripts.
        </p>
        <div className="p-4 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
          Placeholder — Authentication form will be implemented in Phase 1.
        </div>
      </div>
    </div>
  );
}
