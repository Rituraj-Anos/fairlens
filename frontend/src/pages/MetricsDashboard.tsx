import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomTabs from '../components/BottomTabs';
import GeminiReportCard from '../components/GeminiReportCard';

interface Metric {
  name: string;
  value: number;
  passed: boolean;
  description: string;
  not_applicable?: boolean;
}

interface AnalysisResults {
  session_id: string;
  attribute_analyses: Array<{
    attribute: string;
    metrics: Metric[];
  }>;
  overall_severity: string;
}

const MetricsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalysisResults | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const results = localStorage.getItem('analysis_results');
    if (results) {
      setData(JSON.parse(results));
    } else {
      navigate('/configure');
    }
  }, [navigate]);

  if (!data || !data.attribute_analyses.length) return null;

  const analysis = data.attribute_analyses[0];
  const metrics = analysis.metrics;

  const getStatusColor = (m: Metric) => {
    if (m.not_applicable) return 'text-zinc-500';
    return m.passed ? 'text-primary-container' : 'text-error';
  };

  const getBadgeColor = (m: Metric) => {
    if (m.not_applicable) return 'bg-zinc-700';
    return m.passed ? 'bg-primary-container' : 'bg-error';
  };

  const formatValue = (m: Metric) => {
    if (m.not_applicable) return 'N/A';
    return m.value.toFixed(3);
  };

  const formatStatus = (m: Metric) => {
    if (m.not_applicable) return 'N/A';
    return m.passed ? 'Pass' : 'Fail';
  };

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1920px] mx-auto flex-1 min-h-screen">
      <Sidebar activePage="dashboard" />

      <div className="flex-grow p-4 md:p-12 overflow-y-auto pb-24 md:pb-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:12 gap-6 border-b border-surface-container-high pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[10px] md:text-xs text-zinc-500">ID: AUDIT-{data.session_id.slice(0,8)}</span>
              <span className="h-1 w-1 bg-zinc-500 rounded-full"></span>
              <span className="font-mono text-[10px] md:text-xs text-zinc-500 uppercase">PROTECTED: {analysis.attribute}</span>
            </div>
            <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tighter text-on-surface">Metrics Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-2 rounded-lg border border-outline-variant/10 shadow-lg">
            <span className="font-headline text-xs text-zinc-500 uppercase tracking-widest">Overall Risk</span>
            <div className="h-[18px] bg-surface-container-highest rounded-full flex items-center px-2 gap-2 border border-outline-variant/30">
              <span className={`h-1.5 w-1.5 rounded-full ${data.overall_severity === 'CRITICAL' || data.overall_severity === 'HIGH' ? 'bg-error' : 'bg-primary-container'}`}></span>
              <span className={`font-headline text-[10px] font-bold uppercase tracking-widest ${data.overall_severity === 'CRITICAL' || data.overall_severity === 'HIGH' ? 'text-error' : 'text-primary-container'}`}>{data.overall_severity}</span>
            </div>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-12">
          {metrics.map((m, i) => (
            <div key={i} className="bg-surface-container-high p-6 rounded-lg flex flex-col justify-between h-40 md:h-48 border border-outline-variant/10 group relative shadow-md">
              <div className="flex justify-between items-start">
                <h3 className="font-body text-xs md:text-sm text-on-surface-variant font-medium leading-tight max-w-[70%] capitalize">{m.name.replace(/_/g, ' ')}</h3>
                <div className="h-[18px] bg-surface-container-highest rounded-full flex items-center px-2 gap-1.5 border border-outline-variant/30">
                  <span className={`h-1.5 w-1.5 rounded-full ${getBadgeColor(m)}`}></span>
                  <span className={`font-headline text-[10px] font-bold uppercase ${getStatusColor(m)}`}>
                    {formatStatus(m)}
                  </span>
                </div>
              </div>
              <div className="font-mono text-3xl md:text-4xl font-light tracking-tight">
                <span className={getStatusColor(m)}>{formatValue(m)}</span>
              </div>
              <div className="opacity-0 md:group-hover:opacity-100 absolute bottom-full left-0 mb-2 w-48 p-2 bg-surface-container-highest text-[10px] text-on-surface rounded shadow-xl pointer-events-none transition-opacity z-50">
                {m.description}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border border-outline-variant/10 shadow-sm">
                <h3 className="font-headline text-lg md:text-xl font-semibold mb-4 text-on-surface">Analysis Insight</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  FairLens evaluated disparities across <span className="font-mono text-primary-container">{analysis.attribute}</span> using multiple fairness vectors. 
                  The current model shows <span className={data.overall_severity === 'CRITICAL' ? 'text-error font-bold' : 'text-primary-container'}>{data.overall_severity}</span> bias risk based on industry standard thresholds.
                </p>
             </div>
             
             <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border border-outline-variant/10">
                <h3 className="font-headline text-sm uppercase tracking-widest text-zinc-500 mb-6">Outcome distribution</h3>
                <div className="h-48 flex items-end gap-4 md:gap-8 border-l border-b border-outline-variant/30 pb-0 pl-4 relative">
                   <div className="flex-1 flex justify-center items-end gap-2 h-full">
                      <div className="w-8 md:w-12 bg-primary-container h-[85%] rounded-t-sm opacity-90"></div>
                      <div className="w-8 md:w-12 bg-surface-container-highest border border-outline-variant h-[45%] rounded-t-sm opacity-90"></div>
                   </div>
                   <div className="flex-1 flex justify-center items-end gap-2 h-full">
                      <div className="w-8 md:w-12 bg-primary-container h-[70%] rounded-t-sm opacity-90"></div>
                      <div className="w-8 md:w-12 bg-surface-container-highest border border-outline-variant h-[60%] rounded-t-sm opacity-90"></div>
                   </div>
                </div>
             </div>
          </div>

          {/* Gemini Forensic Audit Card */}
          <GeminiReportCard sessionId={data.session_id} analysis={data} />
        </div>
      </div>
      
      <BottomTabs />
    </div>
  );
};

export default MetricsDashboard;
