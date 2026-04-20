import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Sidebar: React.FC<{ activePage: 'dashboard' | 'mitigate' }> = ({ activePage }) => {
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-72 bg-[#131313] border-r border-zinc-800/50 h-full overflow-hidden overflow-x-hidden z-40">
      <div className="p-6 pb-2">
        <h2 className="font-headline text-xs tracking-widest uppercase mb-4 text-zinc-500 truncate">The Forensic</h2>
        <p className="font-headline text-lg text-on-surface font-semibold leading-tight truncate">AI Bias Engine</p>
      </div>
      <nav className="flex-grow flex flex-col gap-1 mt-6 font-['Space_Grotesk'] text-sm uppercase tracking-widest overflow-y-auto">
        <Link 
          to="/dashboard" 
          className={`${activePage === 'dashboard' ? 'bg-zinc-800/50 text-[#00ff88] border-l-4 border-[#00ff88]' : 'text-zinc-500'} flex items-center px-6 py-3 hover:text-zinc-200 hover:bg-zinc-800/30 transition-all gap-4`}
        >
          <span className="material-symbols-outlined text-lg">dashboard</span> 
          <span className="truncate">Dashboard</span>
        </Link>
        <Link 
          to="/mitigate" 
          className={`${activePage === 'mitigate' ? 'bg-zinc-800/50 text-[#00ff88] border-l-4 border-[#00ff88]' : 'text-zinc-500'} flex items-center px-6 py-3 hover:text-zinc-200 hover:bg-zinc-800/30 transition-all gap-4`}
        >
          <span className="material-symbols-outlined text-lg">query_stats</span> 
          <span className="truncate">Mitigation</span>
        </Link>
      </nav>
      <div className="p-6 mt-auto">
        <button 
          onClick={() => navigate('/')}
          className="w-full border border-outline-variant text-on-surface hover:text-white px-4 py-2 rounded text-xs font-headline tracking-widest uppercase hover:bg-surface-container transition-colors truncate"
        >
          New Analysis
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
