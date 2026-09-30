import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileAudio,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';
import api from '../services/api';

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'mp4', 'mkv', 'webm'];
const MAX_FILE_SIZE_MB = 100;

export default function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const validateAndSetFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Invalid file type .${ext}. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      // Suggest clean title from filename
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a meeting title.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Please select an audio or video file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('file', selectedFile);

    try {
      await api.post('/meetings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      // Redirect to Dashboard on success
      navigate('/');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        (Array.isArray(err.response?.data)
          ? err.response.data[0]?.msg
          : 'Failed to upload meeting. Please check server connection.');
      setErrorMessage(detail);
      setUploading(false);
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

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Meeting Title
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <FileText className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning & Architecture Review"
              disabled={uploading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-slate-900/60 backdrop-blur-xl ${
            isDragging
              ? 'border-accent-400 bg-accent-500/5 shadow-2xl shadow-accent-500/10'
              : 'border-slate-800 hover:border-accent-500/40'
          }`}
        >
          <input
            type="file"
            id="meeting-file"
            className="hidden"
            accept=".mp3,.wav,.m4a,.mp4,.mkv,.webm"
            onChange={handleFileInput}
            disabled={uploading}
          />

          <div className="max-w-md mx-auto flex flex-col items-center">
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-tr from-accent-600/20 to-teal-400/10 text-accent-400 flex items-center justify-center border border-accent-500/30 shadow-xl shadow-accent-500/10"
            >
              <UploadCloud className="w-8 h-8 stroke-[1.8]" />
            </motion.div>

            {selectedFile ? (
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 w-full mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 truncate">
                  <FileAudio className="w-5 h-5 text-accent-400 shrink-0" />
                  <div className="text-left truncate">
                    <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Drag and drop your recording here
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  or browse from your device
                </p>
              </>
            )}

            {/* Format Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {ALLOWED_EXTENSIONS.map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60 uppercase"
                >
                  .{ext}
                </span>
              ))}
              <span className="text-xs text-slate-500 ml-1">Up to 100 MB</span>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="w-full mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium text-accent-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading recording...
                  </span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-500 to-teal-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <label
                htmlFor="meeting-file"
                className={`cursor-pointer px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all border border-slate-700/80 shadow-sm ${
                  uploading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Browse Files
              </label>

              <motion.button
                whileHover={{ scale: uploading ? 1 : 1.02 }}
                whileTap={{ scale: uploading ? 1 : 0.98 }}
                type="submit"
                disabled={uploading || !selectedFile || !title.trim()}
                className={`px-6 py-2.5 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg ${
                  !uploading && selectedFile && title.trim()
                    ? 'bg-accent-500 hover:bg-accent-400 text-slate-950 shadow-accent-500/20 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span>Process Recording</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </form>

      {/* Processing Pipeline Highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-accent-500/10 text-accent-400 flex items-center justify-center text-sm font-bold border border-accent-500/20 mb-3">
            1
          </div>
          <h4 className="text-sm font-bold text-white">Audio Extraction & STT</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Extracts audio and queues asynchronous speech-to-text with Whisper.
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
