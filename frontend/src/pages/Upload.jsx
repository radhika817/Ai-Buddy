import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileAudio, CheckCircle2, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export default function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Automated Audio & Video Pipeline
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Upload Meeting Recording
        </h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base leading-relaxed">
          Upload audio or video files. AI Buddy transcribes conversations and automatically identifies action items, assignees, and key decisions.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all bg-slate-900/60 backdrop-blur-xl ${
          isDragging
            ? 'border-accent-400 bg-accent-500/5 shadow-2xl shadow-accent-500/10'
            : 'border-slate-800 hover:border-accent-500/40'
        }`}
      >
        <input
          type="file"
          id="meeting-file"
          className="hidden"
          accept=".mp3,.mp4,.wav,.m4a,.mkv"
          onChange={handleFileInput}
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-20 h-20 mb-5 rounded-3xl bg-gradient-to-tr from-accent-600/20 to-teal-400/10 text-accent-400 flex items-center justify-center border border-accent-500/30 shadow-xl shadow-accent-500/10"
          >
            <UploadCloud className="w-10 h-10 stroke-[1.8]" />
          </motion.div>

          {selectedFile ? (
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 w-full mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <FileAudio className="w-5 h-5 text-accent-400 shrink-0" />
                <div className="text-left truncate">
                  <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Drag and drop your recording here
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                or click to browse from your device
              </p>
            </>
          )}

          {/* Format Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {['MP3', 'MP4', 'WAV', 'M4A', 'MKV'].map((ext) => (
              <span
                key={ext}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60"
              >
                .{ext.toLowerCase()}
              </span>
            ))}
            <span className="text-xs text-slate-500 ml-1">Up to 500 MB</span>
          </div>

          {/* Action button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <label
              htmlFor="meeting-file"
              className="cursor-pointer px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all border border-slate-700/80 shadow-sm"
            >
              Browse Files
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!selectedFile}
              className={`px-6 py-3 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg ${
                selectedFile
                  ? 'bg-accent-500 hover:bg-accent-400 text-slate-950 shadow-accent-500/20 cursor-pointer'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>Process Recording</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Processing Pipeline Highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-accent-500/10 text-accent-400 flex items-center justify-center text-sm font-bold border border-accent-500/20 mb-3">
            1
          </div>
          <h4 className="text-sm font-bold text-white">Audio Extraction & STT</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Extracts clear audio using FFmpeg and runs transcription with Whisper.
          </p>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-sm font-bold border border-cyan-500/20 mb-3">
            2
          </div>
          <h4 className="text-sm font-bold text-white">LLM Intelligence</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Extracts summaries, action items with owners, and timestamped decisions.
          </p>
        </div>

        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-sm font-bold border border-teal-500/20 mb-3">
            3
          </div>
          <h4 className="text-sm font-bold text-white">Persistent Memory</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Saves to Neon PostgreSQL with vector embeddings for future cross-meeting Q&A.
          </p>
        </div>
      </div>
    </div>
  );
}
