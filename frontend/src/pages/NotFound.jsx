import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, TopBar, Button, Footer } from '../components/ui';

export default function NotFound() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const navLinks = token
    ? [
        { label: 'Meetings', href: '/dashboard' },
        { label: 'Tasks', href: '/tasks' },
        { label: 'Ask AI', href: '/chat' },
      ]
    : [
        { label: 'How it works', href: '/#how-it-works' },
        { label: 'Features', href: '/#features' },
      ];

  const topBarAction = token ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="text-xs sm:text-sm font-semibold"
    >
      Log out
    </Button>
  ) : (
    <Button to="/login" variant="outline" size="sm">
      Log in
    </Button>
  );

  return (
    <AppShell>
      <TopBar navLinks={navLinks} action={topBarAction} />

      <div className="w-full px-6 lg:px-10 py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full bg-white border border-hairline rounded-[20px] p-8 sm:p-10 flex flex-col items-center gap-4 shadow-none">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            404 — Not Found
          </span>
          <h1 className="text-3xl sm:text-4xl text-ink tracking-tight">
            <span className="font-display font-extrabold uppercase">PAGE NOT </span>
            <span className="font-display font-light italic">FOUND</span>
          </h1>
          <p className="font-sans text-sm text-muted">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="pt-2">
            <Button
              to={token ? '/dashboard' : '/'}
              variant="primary"
              size="md"
            >
              {token ? 'Back to Dashboard' : 'Back to Home'}
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </AppShell>
  );
}
