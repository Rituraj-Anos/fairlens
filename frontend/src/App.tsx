import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Upload from './pages/Upload';
import ColumnSelector from './pages/ColumnSelector';
import MetricsDashboard from './pages/MetricsDashboard';
import MitigationPanel from './pages/MitigationPanel';
import Report from './pages/Report';
import BottomTabs from './components/BottomTabs';

const NAV_ITEMS = [
  { label: 'Analysis', path: '/', exact: true },
  { label: 'Models', path: '/mitigate', exact: false },
  { label: 'Reports', path: '/report', exact: false },
] as const;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasAnalysisData = !!localStorage.getItem('analysis_results');

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="bg-[#0a0a0a] text-on-surface min-h-screen flex flex-col font-body selection:bg-primary-container/30 selection:text-primary-container">
      {/* ── Top Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-zinc-800/50 shadow-[0_2px_30px_rgba(0,0,0,0.6)]">
        <div className="flex justify-between items-center w-full px-4 md:px-8 py-0 max-w-[1920px] mx-auto h-16">
          {/* Logo + links */}
          <div className="flex items-center gap-6 md:gap-10 h-full">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="relative w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[#00ff88] text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lens
                </span>
                <div className="absolute inset-0 rounded-lg bg-[#00ff88]/20 blur-md" />
              </div>
              <span className="font-['Space_Grotesk'] text-lg font-bold text-on-surface tracking-tight">
                Fair<span className="text-[#00ff88]">Lens</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center h-full gap-1">
              {NAV_ITEMS.map(({ label, path, exact }) => {
                const active = isActive(path, exact);
                return (
                  <Link key={path} to={path} className="relative flex items-center h-full px-4 group">
                    <span
                      className={`font-['Space_Grotesk'] text-xs uppercase tracking-widest font-semibold transition-colors duration-200 ${
                        active ? 'text-[#00ff88]' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    >
                      {label}
                    </span>
                    {/* Bottom indicator bar */}
                    {active ? (
                      <motion.div
                        layoutId="navIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.8)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    ) : (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00ff88]/0 group-hover:bg-[#00ff88]/20 transition-colors" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Gemini badge */}
            <div className="hidden lg:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-[#00ff88] text-sm">auto_awesome</span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Gemini</span>
            </div>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => hasAnalysisData ? navigate('/dashboard') : navigate('/')}
              className={`font-['Space_Grotesk'] text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-4 md:px-5 py-2 md:py-2.5 rounded-lg transition-all cursor-pointer ${
                hasAnalysisData
                  ? 'bg-gradient-to-br from-[#00ff88] to-[#009954] text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.35)]'
                  : 'bg-surface-container border border-outline-variant/30 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {hasAnalysisData ? (
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">analytics</span>
                  Dashboard
                </span>
              ) : (
                 <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">upload</span>
                  Start Audit
                </span>
              )}
            </motion.button>

            {/* Notifications */}
            <button className="relative p-2 rounded-full hover:bg-surface-container transition-colors text-zinc-600 hover:text-zinc-300 cursor-pointer">
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full shadow-[0_0_6px_rgba(255,180,171,0.6)]" />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border-2 border-[#00ff88]/20 hover:border-[#00ff88]/50 transition-colors cursor-pointer">
              <div className="w-full h-full bg-gradient-to-br from-[#00ff88]/30 to-emerald-800/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#00ff88] text-sm">person</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Routes ──────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col pb-16 md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Upload />} />
            <Route path="/configure" element={<ColumnSelector />} />
            <Route path="/dashboard" element={<MetricsDashboard />} />
            <Route path="/mitigate" element={<MitigationPanel />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Tabs */}
      <BottomTabs />
    </div>
  );
};

export default App;
