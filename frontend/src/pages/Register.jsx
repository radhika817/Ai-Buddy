import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { AppShell, TopBar, Button, Footer } from '../components/ui';

export default function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to Dashboard
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide an email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        email: email.trim(),
        password,
        name: name.trim() || null,
      });

      navigate('/login', {
        state: { message: 'Account created successfully! Please sign in.' },
        replace: true,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail[0]?.msg || 'Validation error'
            : 'Failed to create account. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const topBarAction = (
    <Button to="/login" variant="outline" size="sm">
      Log in
    </Button>
  );

  return (
    <AppShell>
      <TopBar action={topBarAction} />

      <div className="w-full px-6 lg:px-10 py-12 flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Left: Form in White Card */}
          <div className="bg-white rounded-[20px] border border-hairline p-8 sm:p-10 flex flex-col justify-between shadow-none">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
                  Create an account
                </h1>
                <p className="font-sans text-sm text-muted">
                  Get started with structured team memory.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 bg-status-failed-bg border border-status-failed-text/20 rounded-xl text-status-failed-text text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="register-name"
                    className="font-sans text-xs font-semibold text-muted uppercase tracking-wider"
                  >
                    Full Name
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Radhika Kandalkar"
                    disabled={loading}
                    className="w-full h-12 px-4 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="register-email"
                    className="font-sans text-xs font-semibold text-muted uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    disabled={loading}
                    className="w-full h-12 px-4 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="register-password"
                    className="font-sans text-xs font-semibold text-muted uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full h-12 pl-4 pr-11 bg-frame border border-hairline rounded-input font-sans text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-muted hover:text-ink transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="font-sans text-[11px] text-muted">
                    Must be at least 6 characters
                  </p>
                </div>

                {/* Submit Pill Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    className="w-full"
                  >
                    Create account
                  </Button>
                </div>
              </form>
            </div>

            {/* Switch to Login Link */}
            <div className="mt-8 pt-6 border-t border-hairline text-center">
              <p className="font-sans text-xs text-muted">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-ink underline decoration-hairline underline-offset-4 hover:text-black transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Right: Lavender Panel (Hidden on Mobile) */}
          <div className="hidden md:flex flex-col justify-between bg-lavender rounded-[20px] border border-hairline p-8 sm:p-10 shadow-none">
            <div className="flex flex-col gap-4 my-auto">
              <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-ink leading-tight">
                Turn meetings into action.
              </h2>
              <p className="font-sans text-sm lg:text-base text-ink leading-relaxed">
                Upload recordings to get searchable transcripts, auto-detected action items with owners, and key decisions.
              </p>
            </div>

            {/* Honest Privacy Note */}
            <div className="flex items-center gap-2 pt-6 border-t border-ink/15">
              <span className="w-2 h-2 rounded-full bg-status-ready-text shrink-0" />
              <p className="font-sans text-xs text-ink/80 leading-snug">
                Transcription runs on your own computer. Summaries and chat use Google Gemini.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </AppShell>
  );
}
