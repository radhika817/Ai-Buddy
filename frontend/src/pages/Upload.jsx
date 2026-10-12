import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileAudio, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { AppShell, TopBar, Button, Footer } from '../components/ui';

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'mp4', 'mkv', 'webm'];
const MAX_FILE_SIZE_MB = 100;

export default function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoBanner, setDemoBanner] = useState('');

  // Check backend health to detect if demo mode is enabled
  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const res = await api.get('/health');
        if (res.data?.processing_enabled === false) {
          setDemoMode(true);
        }
      } catch (err) {
        // Silently continue if health endpoint is unreachable
      }
    };
    checkDemoMode();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

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
      setErrorMessage(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
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

      // Flash success before navigating
      setUploadProgress(100);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 400);
    } catch (err) {
      if (err.response?.status === 503) {
        const detail =
          err.response?.data?.detail ||
          'Uploads and processing are disabled in this demo. Run the project locally to process recordings.';
        setDemoBanner(detail);
        setErrorMessage('');
      } else {
        const detail =
          err.response?.data?.detail ||
          (Array.isArray(err.response?.data)
            ? err.response.data[0]?.msg
            : 'Failed to upload meeting. Please check server connection.');
        setErrorMessage(detail);
      }
      setUploading(false);
    }
  };

  const navLinks = [
    { label: 'Meetings', href: '/dashboard' },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Ask AI', href: '/chat' },
  ];

  const logoutButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="text-xs sm:text-sm font-semibold"
    >
      Log out
    </Button>
  );

  return (
    <AppShell>
      <TopBar navLinks={navLinks} action={logoutButton} />

      <div className="w-full px-6 lg:px-10 py-10 flex-1 flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-5xl tracking-tight text-ink">
              <span className="font-display font-extrabold uppercase">UPLOAD A </span>
              <span className="font-display font-light italic">RECORDING</span>
            </h1>
            <p className="font-sans text-sm sm:text-base text-muted">
              Upload audio or video files to transcribe and analyze.
            </p>
          </div>

          {/* Success Banner (Short fade for success state) */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="p-4 bg-status-ready-bg border border-status-ready-text/20 rounded-card flex items-center justify-center gap-2 text-status-ready-text font-sans text-sm font-semibold"
              >
                <span>Upload complete! Taking you to your dashboard...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Demo Mode Notice */}
          {demoMode && (
            <div className="p-4 bg-status-warning-bg border border-status-warning-text/20 rounded-card flex items-start gap-3 text-status-warning-text font-sans text-sm">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Demo Mode Active: </span>
                <span>
                  Audio and video processing are switched off in this demo deployment. You can explore all existing meetings, transcripts, and AI chat. Run locally to process new recordings.
                </span>
              </div>
            </div>
          )}

          {/* 503 Service Unavailable Notice */}
          {demoBanner && (
            <div className="p-4 bg-status-analyzing-bg border border-status-analyzing-text/20 rounded-card flex items-start gap-3 text-status-analyzing-text font-sans text-sm">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Environment Notice: </span>
                <span>{demoBanner}</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-status-failed-bg border border-status-failed-text/20 rounded-card flex items-center gap-3 text-status-failed-text font-sans text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Title Input */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="meeting-title"
                className="font-sans text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Meeting Title
              </label>
              <input
                id="meeting-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint Planning & Architecture Review"
                disabled={uploading}
                maxLength={120}
                className="w-full h-12 px-4 rounded-xl border border-hairline bg-white font-sans text-base text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Drop Zone Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white border border-dashed rounded-[20px] p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 transition-colors duration-200 ease-out ${
                isDragging ? 'border-ink bg-frame' : 'border-hairline'
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

              <div className="w-14 h-14 rounded-full bg-frame border border-hairline flex items-center justify-center text-ink">
                <UploadCloud className="w-7 h-7" />
              </div>

              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="w-full max-w-md p-4 bg-frame border border-hairline rounded-card flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileAudio className="w-5 h-5 text-ink shrink-0" />
                    <div className="text-left truncate">
                      <p className="font-sans text-sm font-semibold text-ink truncate">
                        {selectedFile.name}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 rounded text-muted hover:text-status-failed-text transition-colors"
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col gap-1.5 items-center">
                  <h2 className="font-display font-bold text-lg text-ink">
                    Drop a file here or browse
                  </h2>
                  <p className="font-sans text-xs sm:text-sm text-muted">
                    Accepted formats: {ALLOWED_EXTENSIONS.join(', ')}
                  </p>
                  <p className="font-sans text-xs text-muted">
                    Maximum file size: {MAX_FILE_SIZE_MB} MB
                  </p>
                </div>
              )}

              {/* Upload Progress Bar (ScaleX transform instead of width animation) */}
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-md space-y-2 pt-2"
                >
                  <div className="flex items-center justify-between font-sans text-xs text-muted">
                    <span>{isSuccess ? 'Upload complete!' : 'Uploading recording...'}</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-frame border border-hairline rounded-full overflow-hidden">
                    <div
                      className="h-full w-full bg-ink origin-left transition-transform duration-200 ease-out"
                      style={{ transform: `scaleX(${uploadProgress / 100})` }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                <label
                  htmlFor="meeting-file"
                  className={`inline-flex items-center justify-center font-sans font-semibold rounded-pill h-10 px-5 text-sm border border-hairline bg-transparent text-ink hover:border-ink cursor-pointer transition-colors ${
                    uploading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Browse
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={uploading || !selectedFile || !title.trim()}
                  loading={uploading}
                >
                  Process Recording
                </Button>
              </div>
            </div>

            {/* Honest Privacy Note */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-status-ready-text shrink-0" />
              <p className="font-sans text-xs sm:text-sm text-muted text-center">
                Transcription runs on your own computer. Summaries and chat use Google Gemini.
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </AppShell>
  );
}
