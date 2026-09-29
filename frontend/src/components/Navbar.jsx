import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-base">
            🎙️
          </span>
          <span>AI Buddy</span>
        </NavLink>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/upload" className={navLinkClass}>
            Upload
          </NavLink>
          <NavLink to="/meetings/demo" className={navLinkClass}>
            Meeting Detail
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white'
              }`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/register"
            className="text-sm font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
          >
            Register
          </NavLink>
        </div>
      </div>
    </header>
  );
}
