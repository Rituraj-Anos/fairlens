import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ReportData {
  summary: string;
  root_causes: string[];
  recommendations: string[];
  severity: string;
}

const GeminiReportCard: React.FC<{ sessionId: string, analysis: any }> = ({ sessionId, analysis }) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await axios.post('http://localhost:8080/api/report/', {
          session_id: sessionId,
          analysis: analysis
        });
        setReport(response.data);
      } catch (err) {
        console.error('Failed to fetch Gemini report:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId && analysis) {
      fetchReport();
    }
  }, [sessionId, analysis]);

  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-primary-container/20 flex flex-col items-center justify-center min-h-[300px]">
        <span className="material-symbols-outlined text-primary-container animate-spin text-4xl mb-4">sync</span>
        <p className="text-on-surface-variant font-mono text-sm">Generating Forensic Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-primary-container/20">
        <h3 className="font-headline text-lg font-semibold text-primary-container mb-4">Analysis Insight</h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          FairLens evaluated disparities across the selected attributes. System detected bias levels that require attention. Proceed to mitigation to rectify disparities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl border border-primary-container/20 shadow-[0_20px_50px_-12px_rgba(0,255,136,0.08)] relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-3xl rounded-full"></div>
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <span className="material-symbols-outlined text-primary-container">smart_toy</span>
        <h3 className="font-headline text-lg font-semibold text-primary-container tracking-tight">Gemini Forensic Audit</h3>
      </div>
      
      <div className="space-y-6 font-body text-sm text-on-surface-variant leading-relaxed relative z-10 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        <div>
          <h4 className="text-on-surface font-bold mb-2 uppercase text-[10px] tracking-widest opacity-60">Summary</h4>
          <p>{report.summary}</p>
        </div>

        <div>
          <h4 className="text-on-surface font-bold mb-2 uppercase text-[10px] tracking-widest opacity-60">Root Causes</h4>
          <ul className="list-disc pl-5 space-y-1">
            {report.root_causes.map((rc, i) => <li key={i}>{rc}</li>)}
          </ul>
        </div>

        <div>
          <h4 className="text-on-surface font-bold mb-2 uppercase text-[10px] tracking-widest opacity-60">Recommendations</h4>
          <ol className="list-decimal pl-5 space-y-2 font-medium text-on-surface">
            {report.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
          </ol>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-outline-variant/20 relative z-10">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-500 uppercase">Audit Status</span>
          <span className={report.severity === 'FAIR' ? 'text-primary-container' : 'text-error font-bold'}>
            {report.severity} RISK DETECTED
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeminiReportCard;
