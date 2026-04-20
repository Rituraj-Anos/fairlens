import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomTabs: React.FC = () => {
  const location = useLocation();
  const activePage = location.pathname.includes('mitigate') ? 'mitigate' : 'dashboard';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0e0e0e] border-t border-emerald-500/10 flex justify-around items-center h-16 z-50 px-4">
      <Link 
        to="/dashboard" 
        className={`flex flex-col items-center gap-1 ${activePage === 'dashboard' ? 'text-[#00ff88]' : 'text-zinc-500'}`}
      >
        <span className="material-symbols-outlined">dashboard</span>
        <span className="text-[10px] uppercase font-headline tracking-tighter">Dashboard</span>
      </Link>
      <Link 
        to="/mitigate" 
        className={`flex flex-col items-center gap-1 ${activePage === 'mitigate' ? 'text-[#00ff88]' : 'text-zinc-500'}`}
      >
        <span className="material-symbols-outlined">query_stats</span>
        <span className="text-[10px] uppercase font-headline tracking-tighter">Mitigation</span>
      </Link>
    </div>
  );
};

export default BottomTabs;
