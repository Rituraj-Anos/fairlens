import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

interface ReportData {
  summary: string;
  root_causes: string[];
  recommendations: string[];
  severity: string;
}

const Report: React.FC = () => {
  const [data, setData] = useState<AnalysisResults | null>(null);
  const [mitigation, setMitigation] = useState<any>(null);
  const [geminiReport, setGeminiReport] = useState<ReportData | null>(null);
  const [datasetName, setDatasetName] = useState<string>('Uploaded Dataset');
  const [showToast, setShowToast] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const results = localStorage.getItem('analysis_results');
    const mitResults = localStorage.getItem('mitigation_results');
    const storedReport = localStorage.getItem('gemini_report');
    const storedDataset = localStorage.getItem('dataset_name');

    if (storedDataset) setDatasetName(storedDataset);

    if (results) {
      const parsedData = JSON.parse(results);
      setData(parsedData);
      
      if (mitResults) setMitigation(JSON.parse(mitResults));

      if (storedReport) {
        setGeminiReport(JSON.parse(storedReport));
      } else {
        // Fetch from API if not available
        axios.post('http://localhost:8080/api/report/', {
          session_id: parsedData.session_id,
          analysis: parsedData
        }).then(res => {
          setGeminiReport(res.data);
          localStorage.setItem('gemini_report', JSON.stringify(res.data));
        }).catch(err => {
          console.error("Failed to fetch report:", err);
        });
      }
    } else {
      navigate('/configure');
    }
  }, [navigate]);

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-lowest text-zinc-500 font-mono">Loading Report...</div>;
  }

  const analysis = data.attribute_analyses[0];
  const metrics = analysis.metrics;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`fairlens-audit-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getMetricThreshold = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('disparate_impact')) return '0.8 - 1.25';
    if (n.includes('statistical_parity') || n.includes('equal_opportunity')) return '-0.1 to 0.1';
    if (n.includes('theil_index')) return '< 0.2';
    return 'Varies';
  };

  const calculateImprovement = (before: number, after: number, name: string) => {
    const n = name.toLowerCase();
    let beforeDist = 0; let afterDist = 0;
    if (n.includes('disparate_impact')) {
       beforeDist = Math.abs(1 - before);
       afterDist = Math.abs(1 - after);
    } else {
       beforeDist = Math.abs(before);
       afterDist = Math.abs(after);
    }
    
    if (beforeDist === 0) return '0%';
    const imp = ((beforeDist - afterDist) / beforeDist) * 100;
    return imp > 0 ? `+${imp.toFixed(1)}%` : `${imp.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-surface-lowest sm:p-8 p-4 flex justify-center">
       <style>{`
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
            .print\\:hidden { display: none !important; }
            .print\\:p-0 { padding: 0 !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-none { border: none !important; }
            .print\\:break-inside-avoid { break-inside: avoid !important; }
          }
       `}</style>
       <div className="w-full max-w-[1000px]">
           {/* Top Actions (no print) */}
           <div className="flex justify-between items-center mb-8 print:hidden">
              <button onClick={() => navigate('/dashboard')} className="text-zinc-400 hover:text-white flex items-center gap-2 font-mono text-sm transition-colors cursor-pointer">
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to Dashboard
              </button>
              <div className="flex items-center gap-3">
                  <button onClick={handleShare} className="flex items-center gap-2 bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-bold hover:bg-surface-container-highest transition-all font-mono text-sm cursor-pointer border border-outline-variant/30 relative">
                      <span className="material-symbols-outlined">share</span>
                      Share
                      {showToast && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-primary-container text-zinc-900 text-[10px] uppercase font-bold tracking-widest py-1.5 px-3 rounded shadow-lg pointer-events-none whitespace-nowrap z-50">
                          Link copied!
                        </div>
                      )}
                  </button>
                  <button onClick={handleExportPDF} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-[#00ff88] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00cc6a] transition-all font-mono text-sm cursor-pointer shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="material-symbols-outlined">{isGeneratingPdf ? 'hourglass_empty' : 'download'}</span>
                      {isGeneratingPdf ? 'Generating PDF...' : 'Export PDF'}
                  </button>
              </div>
           </div>

           {/* PAPER SHEET */}
           <div ref={reportRef} className="bg-surface-container-lowest p-8 md:p-12 rounded-xl shadow-2xl border border-outline-variant/20 print:shadow-none print:border-none print:p-0">
               
               {/* Section 1 - Header */}
               <header className="border-b border-surface-container-high pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div>
                       <div className="flex items-center gap-2 mb-4">
                           <span className="material-symbols-outlined text-4xl text-primary-container">lens</span>
                           <span className="font-headline text-3xl font-bold tracking-tight text-on-surface">FairLens</span>
                       </div>
                       <h1 className="text-2xl font-body font-light text-on-surface-variant uppercase tracking-widest mb-4">Bias Audit Report</h1>
                       <div className="space-y-1 font-mono text-xs text-zinc-500">
                           <p>Audit ID: {data.session_id}</p>
                           <p>Date: {new Date().toLocaleString()}</p>
                           <p>Dataset Name: {datasetName}</p>
                           <p>Protected Attribute: <span className="text-on-surface capitalize font-bold">{analysis.attribute}</span></p>
                       </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                       <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-widest">Overall Severity</span>
                       <div className={`px-4 py-2 rounded-full font-bold tracking-widest uppercase border ${
                            data.overall_severity === 'CRITICAL' || data.overall_severity === 'HIGH' 
                            ? 'bg-error/10 border-error/20 text-error' 
                            : 'bg-primary-container/10 border-primary-container/20 text-primary-container'
                       }`}>
                           {data.overall_severity}
                       </div>
                   </div>
               </header>

               {/* Section 2 - Executive Summary */}
               <section className="mb-10">
                   <h2 className="text-lg font-headline font-bold text-on-surface border-b border-surface-container-high pb-2 mb-4">1. Executive Summary</h2>
                   {geminiReport ? (
                       <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                          {geminiReport.summary}
                       </p>
                   ) : (
                       <div className="space-y-2 translate-y-1">
                           <div className="h-3 w-full animate-pulse bg-surface-container-highest rounded"></div>
                           <div className="h-3 w-5/6 animate-pulse bg-surface-container-highest rounded"></div>
                           <div className="h-3 w-4/6 animate-pulse bg-surface-container-highest rounded"></div>
                       </div>
                   )}
               </section>

               {/* Section 3 - Fairness Metrics Table */}
               <section className="mb-10 print:break-inside-avoid">
                   <h2 className="text-lg font-headline font-bold text-on-surface border-b border-surface-container-high pb-2 mb-4">2. Fairness Metrics Table</h2>
                   <div className="overflow-x-auto rounded-lg border border-surface-container-high">
                       <table className="w-full text-left border-collapse">
                           <thead>
                               <tr className="bg-surface-container-high text-xs font-mono uppercase tracking-widest text-zinc-400">
                                   <th className="p-3 border-b border-surface-container-highest">Metric Name</th>
                                   <th className="p-3 border-b border-surface-container-highest">Value</th>
                                   <th className="p-3 border-b border-surface-container-highest">Threshold</th>
                                   <th className="p-3 border-b border-surface-container-highest">Status</th>
                               </tr>
                           </thead>
                           <tbody className="text-sm font-mono text-on-surface">
                               {metrics.map((m, i) => (
                                   <tr key={i} className="border-b border-surface-container-highest/50 last:border-b-0 print:border-b-zinc-800">
                                       <td className="p-3 capitalize">{m.name.replace(/_/g, ' ')}</td>
                                       <td className="p-3">{m.not_applicable ? 'N/A' : m.value.toFixed(3)}</td>
                                       <td className="p-3 text-zinc-500">{getMetricThreshold(m.name)}</td>
                                       <td className="p-3">
                                           <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest inline-block ${m.not_applicable ? 'bg-surface-container-highest text-zinc-500' : (m.passed ? 'bg-primary-container/10 text-primary-container border border-primary-container/20' : 'bg-error/10 text-error border border-error/20')}`}>
                                               {m.not_applicable ? 'N/A' : (m.passed ? 'PASS' : 'FAIL')}
                                           </span>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </section>

               {/* Section 4 - Group Analysis */}
               {analysis.groups && (
                   <section className="mb-10 print:break-inside-avoid">
                       <h2 className="text-lg font-headline font-bold text-on-surface border-b border-surface-container-high pb-2 mb-4">3. Group Analysis</h2>
                       <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Positive Outcome Rates by Group</p>
                       <div className="h-64 w-full mt-4">
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
                               <Bar dataKey="positive_rate" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                  <LabelList dataKey="positive_rate" position="top" formatter={(val: any) => Number(val).toFixed(2)} fill="#71717a" fontSize={10} />
                                 {analysis.groups.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.positive_rate >= 0.5 ? '#00ff88' : '#ff4757'} fillOpacity={0.9} />
                                 ))}
                               </Bar>
                             </BarChart>
                           </ResponsiveContainer>
                       </div>
                   </section>
               )}

               {/* Section 5 & 6 - Root Causes and Recommendations */}
               {geminiReport ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 print:break-inside-avoid">
                       <section>
                           <h2 className="text-lg font-headline font-bold text-on-surface border-b border-surface-container-high pb-2 mb-4">4. Root Causes</h2>
                           <ul className="list-disc pl-5 space-y-2 text-sm text-on-surface-variant font-body leading-relaxed">
                               {geminiReport.root_causes.map((rc, i) => <li key={i}>{rc}</li>)}
                           </ul>
                       </section>
                       <section>
                           <h2 className="text-lg font-headline font-bold text-on-surface border-b border-surface-container-high pb-2 mb-4">5. Recommendations</h2>
                           <ol className="list-decimal pl-5 space-y-2 text-sm text-on-surface-variant font-body leading-relaxed">
                               {geminiReport.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                           </ol>
                       </section>
                   </div>
               ) : (
                    <div className="mb-10 space-y-4">
                       <div className="h-6 w-1/3 animate-pulse bg-surface-container-high rounded mb-4"></div>
                       <div className="h-16 w-full animate-pulse bg-surface-container-high rounded"></div>
                    </div>
               )}

               {/* Section 7 - Mitigation Results */}
               {mitigation && (
                   <section className="mb-10 print:break-inside-avoid bg-surface-container-high p-6 rounded-lg border border-primary-container/20 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 blur-3xl rounded-full"></div>
                       <h2 className="text-lg font-headline font-bold text-primary-container border-b border-surface-container-highest pb-2 mb-2 relative z-10">6. Mitigation Results</h2>
                       <p className="text-xs font-mono text-zinc-400 mb-6 uppercase tracking-widest relative z-10">
                          Applied Algorithm: <span className="text-on-surface font-bold">{mitigation.method_used}</span>
                       </p>
                       <div className="overflow-x-auto rounded-lg border border-surface-container-highest relative z-10">
                           <table className="w-full text-left border-collapse">
                               <thead>
                                   <tr className="bg-surface-container-highest/50 text-xs font-mono uppercase tracking-widest text-zinc-400">
                                       <th className="p-3 border-b border-surface-container-highest">Metric</th>
                                       <th className="p-3 border-b border-surface-container-highest">Before</th>
                                       <th className="p-3 border-b border-surface-container-highest">After</th>
                                       <th className="p-3 border-b border-surface-container-highest">Improvement</th>
                                   </tr>
                               </thead>
                               <tbody className="text-sm font-mono text-on-surface">
                                   {mitigation.before_vs_after.map((comparison: any, i: number) => {
                                       const imp = calculateImprovement(comparison.before.value, comparison.after.value, comparison.metric);
                                       const isPositive = imp.startsWith('+');
                                       return (
                                       <tr key={i} className="border-b border-surface-container-highest/50 last:border-b-0 print:border-b-zinc-800">
                                           <td className="p-3 capitalize">{comparison.metric.replace(/_/g, ' ')}</td>
                                           <td className="p-3 text-zinc-500">{comparison.before.value.toFixed(3)}</td>
                                           <td className="p-3 text-on-surface font-bold">{comparison.after.value.toFixed(3)}</td>
                                           <td className={`p-3 font-bold ${isPositive ? 'text-primary-container' : (imp.startsWith('-') ? 'text-error' : 'text-zinc-500')}`}>
                                               {imp}
                                           </td>
                                       </tr>
                                       );
                                   })}
                               </tbody>
                           </table>
                       </div>
                   </section>
               )}

               {/* Section 8 - Footer */}
               <footer className="mt-16 pt-8 border-t border-surface-container-high flex flex-col items-center justify-center gap-2 print:break-inside-avoid">
                   <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">Generated by FairLens — Google Solution Challenge 2026</p>
                   <p className="font-mono text-[10px] text-zinc-600">{new Date().toISOString()}</p>
               </footer>

           </div>
       </div>
    </div>
  );
};

export default Report;
