import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, LayoutDashboard, UploadCloud, LogIn, UserPlus, LogOut, User, Menu, X, Sparkles } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('token')));
  const [userName, setUserName] = useState('');

  // Sync auth status with localStorage & custom events
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(Boolean(token));

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUserName(parsed.name || parsed.email || '');
        } catch {
          setUserName('');
        }
      } else {
        setUserName('');
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('auth-change', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserName('');
    window.dispatchEvent(new Event('auth-change'));
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
      isActive
        ? 'text-accent-400 bg-accent-500/10 border border-accent-500/25 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
      isActive
        ? 'text-accent-400 bg-accent-500/10 border border-accent-500/25'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo / Brand Name */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-600 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-accent-500/20"
          >
            <Bot className="w-5 h-5 text-slate-950 stroke-[2.2]" />
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight group-hover:text-accent-300 transition-colors">
              AI Buddy
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Sparkles className="w-2.5 h-2.5" />
              v0.1
            </span>
          </div>
        </NavLink>

        {/* Desktop Navigation Links */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/" className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4 opacity-70" />
              Dashboard
            </NavLink>
            <NavLink to="/upload" className={navLinkClass}>
              <UploadCloud className="w-4 h-4 opacity-70" />
              Upload Meeting
            </NavLink>
          </nav>
        )}

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {userName && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <User className="w-3.5 h-3.5 text-accent-400" />
                  <span className="max-w-[140px] truncate font-medium">{userName}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </NavLink>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <NavLink
                  to="/register"
                  className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-accent-500 hover:bg-accent-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-accent-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </NavLink>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/40"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-800 bg-background/95 backdrop-blur-2xl px-4 py-4 space-y-2 overflow-hidden"
          >
            {isAuthenticated ? (
              <>
                <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink to="/upload" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                  <UploadCloud className="w-5 h-5" />
                  Upload Meeting
                </NavLink>
                <div className="pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout {userName ? `(${userName})` : ''}
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-semibold bg-accent-500 text-slate-950 shadow-md shadow-accent-500/20"
                >
                  <UserPlus className="w-5 h-5" />
                  Get Started
                </NavLink>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
