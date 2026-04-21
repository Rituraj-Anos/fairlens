import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomTabs from '../components/BottomTabs';
import GeminiReportCard from '../components/GeminiReportCard';
import EmptyState from '../components/EmptyState';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';

interface Metric {
  name: string;
  value: number;
  passed: boolean;
  description: string;
  not_applicable?: boolean;
}

interface GroupStats {
  group: string;
  count: number;
  positive_rate: number;
}

interface AnalysisResults {
  session_id: string;
  attribute_analyses: Array<{
    attribute: string;
    metrics: Metric[];
    groups?: GroupStats[];
  }>;
  overall_severity: string;
}

const MetricsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const results = localStorage.getItem('analysis_results');
    if (results) {
      setTimeout(() => {
        setData(JSON.parse(results));
        setIsLoading(false);
      }, 800);
    } else {
      setIsLoading(false);
    }
  }, []);

  if (!isLoading && !data) return <EmptyState />;

  if (isLoading || !data || !data.attribute_analyses.length) {
    return (
      <div className="flex flex-col md:flex-row w-full max-w-[1920px] mx-auto flex-1 min-h-screen">
        <Sidebar />
        <div className="flex-grow p-4 md:p-12 overflow-y-auto pb-24 md:pb-12 animate-pulse">
           <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:12 gap-6 border-b border-surface-container-high pb-8">
             <div>
               <div className="h-4 w-48 bg-surface-container-high rounded mb-2"></div>
               <div className="h-10 w-64 bg-surface-container-high rounded"></div>
             </div>
             <div className="h-8 w-32 bg-surface-container-high rounded-lg"></div>
           </header>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-12">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="bg-surface-container-high p-6 rounded-lg h-40 md:h-48 border border-outline-variant/10 shadow-md flex flex-col justify-between">
                 <div className="flex justify-between">
                   <div className="h-4 w-20 bg-surface-container-highest rounded"></div>
                   <div className="h-4 w-12 bg-surface-container-highest rounded-full"></div>
                 </div>
                 <div className="h-10 w-24 bg-surface-container-highest rounded mt-auto"></div>
               </div>
             ))}
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-8">
               <div className="h-40 bg-surface-container-low rounded-xl border border-outline-variant/10 p-6 shadow-sm">
                 <div className="h-6 w-40 bg-surface-container-high rounded mb-4"></div>
                 <div className="space-y-2">
                   <div className="h-4 w-full bg-surface-container-high rounded"></div>
                   <div className="h-4 w-3/4 bg-surface-container-high rounded"></div>
                 </div>
               </div>
               <div className="h-64 bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
                 <div className="h-4 w-48 bg-surface-container-high rounded mb-6"></div>
                 <div className="h-40 w-full bg-surface-container-high/50 rounded flex flex-col justify-end gap-1 px-4 pb-0">
                    <div className="flex gap-4 items-end">
                      <div className="w-12 h-24 bg-surface-container-high rounded-t-sm"></div>
                      <div className="w-12 h-16 bg-surface-container-high rounded-t-sm"></div>
                    </div>
                 </div>
               </div>
             </div>
             <div className="h-[400px] bg-surface-container-low rounded-xl border border-outline-variant/10 p-6">
                <div className="h-6 w-32 bg-surface-container-high rounded mb-6"></div>
                <div className="space-y-4">
                  <div className="h-16 w-full bg-surface-container-high rounded"></div>
                  <div className="h-16 w-full bg-surface-container-high rounded"></div>
                  <div className="h-16 w-full bg-surface-container-high rounded"></div>
                </div>
             </div>
           </div>
        </div>
        <BottomTabs />
      </div>
    );
  }

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
      <Sidebar />

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
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-2 rounded-lg border border-outline-variant/10 shadow-lg">
              <span className="font-headline text-xs text-zinc-500 uppercase tracking-widest">Overall Risk</span>
              <div className="h-[18px] bg-surface-container-highest rounded-full flex items-center px-2 gap-2 border border-outline-variant/30">
                <span className={`h-1.5 w-1.5 rounded-full ${data.overall_severity === 'CRITICAL' || data.overall_severity === 'HIGH' ? 'bg-error' : 'bg-primary-container'}`}></span>
                <span className={`font-headline text-[10px] font-bold uppercase tracking-widest ${data.overall_severity === 'CRITICAL' || data.overall_severity === 'HIGH' ? 'text-error' : 'text-primary-container'}`}>{data.overall_severity}</span>
              </div>
            </div>
            <button 
               onClick={() => navigate('/report')}
               className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-widest transition-colors shadow-sm cursor-pointer"
             >
               <span className="material-symbols-outlined text-[18px]">summarize</span>
               Go to Report
             </button>
          </div>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-12">
          {metrics.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-surface-container-high p-6 rounded-lg flex flex-col justify-between h-40 md:h-48 border border-outline-variant/10 group relative shadow-md"
            >
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
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="lg:col-span-2 space-y-8"
          >
             <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border border-outline-variant/10 shadow-sm">
                <h3 className="font-headline text-lg md:text-xl font-semibold mb-4 text-on-surface">Analysis Insight</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  FairLens evaluated disparities across <span className="font-mono text-primary-container">{analysis.attribute}</span> using multiple fairness vectors. 
                  The current model shows <span className={data.overall_severity === 'CRITICAL' ? 'text-error font-bold' : 'text-primary-container'}>{data.overall_severity}</span> bias risk based on industry standard thresholds.
                </p>
             </div>
             
             <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border border-outline-variant/10">
                <h3 className="font-headline text-sm uppercase tracking-widest text-zinc-500 mb-6">Outcome distribution</h3>
                <div className="h-48 w-full mt-4">
                  {analysis.groups ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.groups} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="group" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-surface-container-highest border border-outline-variant/30 p-3 rounded shadow-xl text-xs font-mono">
                                  <p className="text-zinc-400 mb-1">Group: <span className="text-on-surface font-bold capitalize">{payload[0].payload.group}</span></p>
                                  <p className="text-primary-container font-bold">Pos Rate: {(payload[0].value as number * 100).toFixed(1)}%</p>
                                  <p className="text-zinc-500 mt-1">N={payload[0].payload.count}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={0.8} stroke="#71717a" strokeDasharray="3 3" label={{ position: 'top', value: '4/5 Rule Threshold', fill: '#71717a', fontSize: 10 }} />
                        <Bar dataKey="positive_rate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          <LabelList dataKey="positive_rate" position="top" formatter={(val: any) => Number(val).toFixed(2)} fill="#71717a" fontSize={10} />
                          {analysis.groups.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.positive_rate >= 0.5 ? '#00ff88' : '#ff4757'} fillOpacity={0.9} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono uppercase border border-dashed border-outline-variant/30 rounded-lg">Data not available</div>
                  )}
                </div>
             </div>
          </motion.div>

          {/* Gemini Forensic Audit Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <GeminiReportCard sessionId={data.session_id} analysis={data} />
            <button 
               onClick={() => navigate('/report')}
               className="mt-6 w-full flex items-center justify-center gap-2 bg-transparent text-[#00ff88] border-2 border-[#00ff88] hover:bg-[#00ff88]/10 px-6 py-3 rounded-lg font-bold transition-all font-mono text-sm shadow-[0_0_15px_rgba(0,255,136,0.1)] cursor-pointer"
             >
               <span className="material-symbols-outlined">description</span>
               Go to Report
             </button>
          </motion.div>
        </div>
      </div>
      
      <BottomTabs />
    </div>
  );
};

export default MetricsDashboard;
