import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const TABS = [
  { label: 'Home',       icon: 'cloud_upload', path: '/',          exact: true  },
  { label: 'Analysis',   icon: 'dashboard',    path: '/dashboard', exact: false },
  { label: 'Mitigate',   icon: 'query_stats',  path: '/mitigate',  exact: false },
  { label: 'Report',     icon: 'description',  path: '/report',    exact: false },
] as const;

const BottomTabs: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-zinc-800/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ label, icon, path, exact }) => {
          const active = isActive(path, exact);
          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-col items-center gap-1 flex-1 py-1.5 px-1"
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="bottomTabBg"
                  className="absolute inset-0 mx-1 rounded-xl bg-[#00ff88]/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Icon */}
              <div className="relative z-10">
                <span
                  className={`material-symbols-outlined text-xl transition-all duration-200 ${
                    active
                      ? 'text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]'
                      : 'text-zinc-600'
                  }`}
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {icon}
                </span>

                {/* Ping dot when active */}
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff88]" />
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`font-['Space_Grotesk'] text-[8px] uppercase tracking-widest font-bold relative z-10 transition-colors duration-200 ${
                  active ? 'text-[#00ff88]' : 'text-zinc-700'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabs;
