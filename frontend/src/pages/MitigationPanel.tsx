import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomTabs from '../components/BottomTabs';

interface Comparison {
  metric_name: string;
  before: number | null;
  after: number | null;
  improved: boolean | null;
}

interface MitigationResults {
  method: string;
  comparisons: Comparison[];
  before_severity: string;
  after_severity: string;
}

const MitigationPanel: React.FC = () => {
  const [isDebiasing, setIsDebiasing] = useState(false);
  const [results, setResults] = useState<MitigationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const sessionId = localStorage.getItem('session_id');
  const protectedAttribute = localStorage.getItem('protected_attribute');
  const targetColumn = localStorage.getItem('target_column');

  useEffect(() => {
    if (!sessionId || !protectedAttribute || !targetColumn) {
      navigate('/configure');
    }
  }, [sessionId, protectedAttribute, targetColumn, navigate]);

  const handleRunDebiasing = async () => {
    setIsDebiasing(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:8080/api/mitigate/', {
        session_id: sessionId,
        protected_attributes: [protectedAttribute],
        label_column: targetColumn,
        method: 'reweighing'
      });

      setResults(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Mitigation failed. Please try again.');
    } finally {
      setIsDebiasing(false);
    }
  };

  const calculateOverallImprovement = () => {
    if (!results || results.comparisons.length === 0) return 0;
    const total = results.comparisons.length;
    const improved = results.comparisons.filter(c => c.improved === true).length;
    return Math.round((improved / total) * 100);
  };

  const formatVal = (val: number | null) => val === null ? 'N/A' : val.toFixed(3);

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1920px] mx-auto min-h-screen flex-1">
      <Sidebar activePage="mitigate" />

      <main className="flex-1 overflow-y-auto bg-surface-dim p-4 md:p-12 text-on-surface pb-24 md:pb-12">
        <header className="mb-8 md:12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-surface-container-high pb-6 gap-6">
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-2">Mitigation Panel</h1>
            <p className="text-on-surface-variant text-sm md:text-lg text-zinc-500 uppercase font-mono">PROTECTED: {protectedAttribute} | Method: {results?.method || 'Reweighing'}</p>
          </div>
          <button 
            onClick={handleRunDebiasing}
            disabled={isDebiasing}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-fixed rounded-lg font-bold text-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined ${isDebiasing ? 'animate-spin' : ''}`}>
              {isDebiasing ? 'sync' : 'play_arrow'}
            </span>
            {isDebiasing ? 'Debiasing...' : 'Run Debiasing'}
          </button>
        </header>

        {error && <p className="text-error mb-8 font-mono text-center">{error}</p>}

        {/* Stack vertically on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-surface-container-high rounded-xl p-8 border border-outline-variant/15 flex flex-col justify-center items-center relative overflow-hidden h-64 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-container/5 to-transparent"></div>
            <h2 className="font-headline text-xs md:text-sm uppercase tracking-widest text-zinc-500 mb-6 text-center z-10">Fairness Metrics Improved</h2>
            <div className="font-headline text-6xl md:text-7xl font-bold text-primary-container tracking-tighter z-10 flex items-baseline">
              {results ? `${calculateOverallImprovement()}` : '--'}<span className="text-4xl text-primary-container/80">%</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-4 font-mono z-10 text-zinc-500">
              Risk Profile: {results ? `${results.before_severity} → ${results.after_severity}` : 'Pending Audit'}
            </p>
          </div>

          <div className="lg:col-span-2 bg-surface-container-high rounded-xl p-6 md:p-8 border border-outline-variant/15 shadow-lg">
            <h3 className="font-headline text-xs md:text-sm uppercase tracking-widest text-zinc-500 mb-8 border-b border-surface-container/50 pb-4">Disparate Impact Comparison</h3>
            <div className="flex flex-col gap-8">
              {results?.comparisons.filter(c => c.metric_name.includes('disparate_impact_ratio')).map((c, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    <span>Baseline Ratio</span>
                    <span>Mitigated Ratio</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="w-full bg-surface-container-lowest h-4 rounded-r-full flex items-center relative overflow-hidden">
                      <div className="h-full bg-error transition-all duration-1000" style={{ width: `${Math.min((c.before || 0) * 100, 100)}%` }}></div>
                      <div className="absolute right-2 text-[10px] font-mono font-bold text-on-surface drop-shadow-md">{(c.before || 0).toFixed(2)}</div>
                    </div>
                    <div className="w-full bg-surface-container-lowest h-4 rounded-r-full flex items-center relative overflow-hidden">
                      <div className="h-full bg-primary-container transition-all duration-1000" style={{ width: `${Math.min((c.after || 0) * 100, 100)}%` }}></div>
                      <div className="absolute right-2 text-[10px] font-mono font-bold text-on-primary-container drop-shadow-md">{(c.after || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {!results && <div className="h-24 flex items-center justify-center border border-dashed border-outline-variant/30 rounded-lg text-zinc-600 font-mono text-xs uppercase">No mitigation data available</div>}
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="mt-8 bg-surface-container-high rounded-xl border border-outline-variant/15 overflow-hidden shadow-lg mb-20 md:mb-0">
          <div className="p-6 border-b border-surface-container/50">
            <h3 className="font-headline text-lg font-bold text-on-surface">Detailed Metrics Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-lowest text-[10px] uppercase tracking-widest font-headline text-zinc-500 border-b border-outline-variant/20">
                  <th className="p-4 font-medium">Metric</th>
                  <th className="p-4 font-medium text-center">Baseline</th>
                  <th className="p-4 font-medium text-center">Mitigated</th>
                  <th className="p-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm text-on-surface">
                {results?.comparisons.map((c, i) => (
                  <tr key={i} className="border-b border-surface-container/30 hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 capitalize text-xs">{c.metric_name.split(':')[1].replace(/_/g, ' ')}</td>
                    <td className="p-4 text-center text-zinc-400">{formatVal(c.before)}</td>
                    <td className="p-4 text-center text-primary-container font-bold">{formatVal(c.after)}</td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-highest text-[10px] font-body ${c.improved === true ? 'text-primary-container' : (c.improved === false ? 'text-zinc-500' : 'text-zinc-600')}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.improved === true ? 'bg-primary-container' : (c.improved === false ? 'bg-zinc-600' : 'bg-transparent border border-zinc-700')}`}></span>
                        {c.improved === true ? 'Improved' : (c.improved === false ? 'No Change' : 'N/A')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <BottomTabs />

      {results && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-surface-bright border border-primary-container/30 backdrop-blur-md rounded-lg shadow-2xl p-4 flex items-start gap-4 z-50 min-w-[280px] max-w-[90vw] text-on-surface">
          <span className="material-symbols-outlined text-primary-container">check_circle</span>
          <div className="flex-1">
            <h4 className="font-headline font-bold text-sm">Debiasing Complete</h4>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">Forensic weights successfully recalibrated.</p>
          </div>
          <button onClick={() => setResults(null)} className="text-zinc-500 hover:text-on-surface"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}
    </div>
  );
};

export default MitigationPanel;
