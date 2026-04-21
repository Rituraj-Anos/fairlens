import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Dashboard',   icon: 'dashboard',   path: '/dashboard' },
  { label: 'Mitigation',  icon: 'query_stats', path: '/mitigate'  },
  { label: 'Report',      icon: 'description', path: '/report'    },
] as const;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <aside className="hidden md:flex flex-col w-72 bg-[#0a0a0a] border-r border-zinc-800/40 h-full overflow-hidden z-40 shrink-0">
      {/* Logo area */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00ff88] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>lens</span>
            </div>
            <div className="absolute inset-0 rounded-lg bg-[#00ff88]/10 blur-md" />
          </div>
          <div>
            <p className="font-['Space_Grotesk'] text-xs text-zinc-500 uppercase tracking-widest leading-none mb-0.5">The Forensic</p>
            <p className="font-['Space_Grotesk'] text-sm font-bold text-on-surface leading-none">AI Bias Engine</p>
          </div>
        </div>

        {/* Horizontal separator with glow */}
        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent" />
      </div>

      {/* Nav */}
      <nav className="flex-grow flex flex-col gap-1 mt-4 px-3 overflow-y-auto custom-scrollbar">
        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.2em] px-3 mb-2">Navigation</p>

        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
            >
              {/* Active indicator pill */}
              {active && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {/* Hover bg */}
              {!active && (
                <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-200" />
              )}

              {/* Left accent bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00ff88] rounded-r-full shadow-[0_0_8px_rgba(0,255,136,0.8)]" />
              )}

              <span
                className={`material-symbols-outlined text-lg relative z-10 transition-all duration-200 ${
                  active ? 'text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]' : 'text-zinc-600 group-hover:text-zinc-400'
                }`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>

              <span
                className={`font-['Space_Grotesk'] text-sm uppercase tracking-wider font-semibold relative z-10 transition-colors duration-200 ${
                  active ? 'text-[#00ff88]' : 'text-zinc-600 group-hover:text-zinc-300'
                }`}
              >
                {item.label}
              </span>

              {active && (
                <span className="ml-auto relative z-10 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff88]" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer area */}
      <div className="p-4 mt-auto">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-4" />

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 border border-outline-variant/30 hover:border-[#00ff88]/30 text-zinc-500 hover:text-[#00ff88] px-4 py-2.5 rounded-xl text-xs font-['Space_Grotesk'] tracking-widest uppercase hover:bg-[#00ff88]/5 transition-all duration-200 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm group-hover:rotate-[-10deg] transition-transform">add_circle</span>
          New Analysis
        </button>

        <div className="mt-4 flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.8)]" />
          <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Backend Online</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
