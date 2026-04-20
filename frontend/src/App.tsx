import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Upload from './pages/Upload';
import ColumnSelector from './pages/ColumnSelector';
import MetricsDashboard from './pages/MetricsDashboard';
import MitigationPanel from './pages/MitigationPanel';

const App: React.FC = () => {
  const navigate = useNavigate();
  const hasAnalysisData = !!localStorage.getItem('analysis_results');

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* TopNavBar */}
      <nav className="bg-[#0e0e0e] text-[#00ff88] font-['Space_Grotesk'] tracking-tighter w-full top-0 border-b border-emerald-500/10 shadow-[0_20px_50px_-12px_rgba(0,255,136,0.08)] z-50 sticky">
        <div className="flex justify-between items-center w-full px-4 md:px-8 py-4 max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/" className="text-xl md:text-2xl font-bold tracking-tighter text-[#00ff88] uppercase flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lens</span>
              FairLens
            </Link>
            {/* Hide links on mobile */}
            <div className="hidden md:flex gap-6 uppercase text-sm font-bold">
              <Link className="text-[#00ff88] border-b-2 border-[#00ff88] pb-1 hover:bg-zinc-800/50 transition-all scale-95 duration-100" to="/">Analysis</Link>
              <Link className="text-zinc-500 hover:text-zinc-300 transition-colors hover:bg-zinc-800/50 transition-all" to="/mitigate">Models</Link>
              <a className="text-zinc-500 hover:text-zinc-300 transition-colors hover:bg-zinc-800/50 transition-all" href="#">Datasets</a>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary-container text-sm">auto_awesome</span>
              <span className="text-xs font-mono text-on-surface-variant">Powered by Gemini</span>
            </div>
            {/* Run Audit visible on mobile but smaller text/padding */}
            <button 
              onClick={() => hasAnalysisData && navigate('/dashboard')}
              className={`bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-fixed px-3 md:px-5 py-1.5 md:py-2 font-headline font-bold uppercase tracking-wider text-[10px] md:text-sm hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-shadow ${!hasAnalysisData ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Run Audit
            </button>
            <div className="flex gap-2 md:gap-4 shrink-0">
              <button className="text-[#00ff88] hover:bg-zinc-800/50 transition-all p-1.5 md:p-2 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">settings</span>
              </button>
              <button className="text-[#00ff88] hover:bg-zinc-800/50 transition-all p-1.5 md:p-2 rounded-full flex items-center justify-center relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error rounded-full"></span>
              </button>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-primary-container/30 overflow-hidden shadow-inner">
                <img alt="User" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeov5nBN2CM-EFvsqwjHq2O17XLsY2tSnjgG-ssbYaezt9T5f6lj0fNk90Vvx-V_cfZQ0UFgvJYtcUnV4XSfhjrW2lhdhrGvqqlB_fbGtSY1EMg1hgYC4tfMJr0Hfti2IHhYWvlt7BDQ0_YiObOmxMkgd4N15EfjvYI44mjQQwdWi9wOqGqL4golKBp-oGkjp34D9g-RQkY4Gq3H0ahF0jUB95ClFn_y8y1Sq9CV410VGejZiRYsw25GUuCxu5co-WErHO4vCv6xU"/>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex flex-col">
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/configure" element={<ColumnSelector />} />
          <Route path="/dashboard" element={<MetricsDashboard />} />
          <Route path="/mitigate" element={<MitigationPanel />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
