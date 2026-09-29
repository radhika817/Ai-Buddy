export default function Upload() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Upload Meeting</h1>
        <p className="text-slate-400 mt-1">Upload audio or video files (.mp3, .mp4, .wav, .m4a) for automated transcription and AI analysis.</p>
      </div>

      <div className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 bg-slate-800/30 rounded-2xl p-12 text-center transition-colors">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20">
          📁
        </div>
        <p className="text-lg font-semibold text-white">Drag and drop your meeting file here</p>
        <p className="text-sm text-slate-400 mt-1">Supported formats: MP3, MP4, WAV, M4A up to 500MB</p>
        <div className="mt-6">
          <button
            type="button"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/10 cursor-not-allowed opacity-80"
            disabled
          >
            Select File (Phase 1)
          </button>
        </div>
      </div>
    </div>
  );
}
