import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ColumnSelector: React.FC = () => {
  const [columns, setColumns] = useState<string[]>([]);
  const [protectedAttribute, setProtectedAttribute] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedColumns = localStorage.getItem('columns');
    const detectedProtected = localStorage.getItem('detected_protected_attributes');
    const detectedTarget = localStorage.getItem('detected_label_column');

    if (storedColumns) {
      setColumns(JSON.parse(storedColumns));
    } else {
      navigate('/');
    }

    if (detectedProtected) {
      const parsed = JSON.parse(detectedProtected);
      if (parsed.length > 0) setProtectedAttribute(parsed[0]);
    }
    if (detectedTarget) {
      setTargetColumn(detectedTarget);
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!protectedAttribute || !targetColumn) {
      setError('Please select both a protected attribute and a target column.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    const sessionId = localStorage.getItem('session_id');

    try {
      const response = await axios.post('http://localhost:8080/api/analyze/', {
        session_id: sessionId,
        protected_attributes: [protectedAttribute],
        label_column: targetColumn,
      });

      localStorage.setItem('analysis_results', JSON.stringify(response.data));
      localStorage.setItem('protected_attribute', protectedAttribute);
      localStorage.setItem('target_column', targetColumn);

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail?.[0]?.msg || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const SelectField = ({
    id, label, value, onChange, icon, hint
  }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; icon: string; hint: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#00ff88]/60 text-sm">{icon}</span>
        <label className="block font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.2em] text-zinc-500" htmlFor={id}>
          {label}
        </label>
        {value && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 px-2 py-0.5 rounded-full"
          >
            ✓ Selected
          </motion.span>
        )}
      </div>
      <div className="relative group">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-container-lowest text-on-surface border-0 border-b-2 border-outline-variant/30 px-4 py-4 focus:ring-0 transition-all font-mono text-base rounded-t-lg appearance-none cursor-pointer focus:outline-none group-focus-within:border-[#00ff88] focus:bg-[#00ff88]/[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300ff88%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem top 50%',
            backgroundSize: '0.65rem auto',
          }}
        >
          <option value="" disabled>Select {label.toLowerCase()}…</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
        {/* Animated underline */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00ff88] to-[#00cc6a] scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left duration-300 rounded-full" />
      </div>
      <p className="text-zinc-600 text-[10px] font-mono px-1">{hint}</p>
    </div>
  );

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-12 relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#00ff88]/[0.04] rounded-full blur-[130px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-400/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 md:mb-12"
        >
          {/* Step badge */}
          <div className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
            </span>
            <span className="text-[#00ff88] text-[10px] font-mono uppercase tracking-widest">Step 2 of 3 — Data Configuration</span>
          </div>

          <div className="border-l-4 border-[#00ff88]/50 pl-5 space-y-3">
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-on-surface leading-[1.1]">
              Configure Audit{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00cc6a]">
                Parameters
              </span>
            </h1>
            <p className="font-body text-on-surface-variant text-base md:text-lg max-w-xl">
              Select the sensitive attribute to evaluate for bias and the target prediction column.
            </p>
          </div>
        </motion.div>

        {/* Detected columns info banner */}
        {columns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 flex items-center gap-3 bg-surface-container border border-outline-variant/15 rounded-xl px-5 py-3"
          >
            <span className="material-symbols-outlined text-[#00ff88]/60 text-sm">table_chart</span>
            <p className="text-zinc-400 text-xs font-mono">
              Detected <span className="text-[#00ff88] font-bold">{columns.length} columns</span> in dataset
            </p>
          </motion.div>
        )}

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="bg-surface-container-high rounded-2xl p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-outline-variant/10 relative overflow-hidden"
        >
          {/* Top-right ambient inner glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ff88]/5 blur-3xl rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-10 relative z-10">
            <SelectField
              id="protected-attribute"
              label="Protected Attribute"
              value={protectedAttribute}
              onChange={setProtectedAttribute}
              icon="policy"
              hint="The demographic feature to audit (e.g. race, gender, age)"
            />
            <SelectField
              id="target-column"
              label="Target Column"
              value={targetColumn}
              onChange={setTargetColumn}
              icon="track_changes"
              hint="The outcome column your model predicts (e.g. loan_approved)"
            />
          </div>

          {/* Selection preview */}
          <AnimatePresence>
            {protectedAttribute && targetColumn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="bg-[#00ff88]/5 border border-[#00ff88]/15 rounded-xl p-4 flex flex-wrap gap-6 font-mono text-xs">
                  <div>
                    <span className="text-zinc-600 uppercase tracking-widest text-[9px] block mb-1">Protected</span>
                    <span className="text-[#00ff88] font-bold">{protectedAttribute}</span>
                  </div>
                  <div className="text-outline-variant/30 self-center">→</div>
                  <div>
                    <span className="text-zinc-600 uppercase tracking-widest text-[9px] block mb-1">Target</span>
                    <span className="text-on-surface font-bold">{targetColumn}</span>
                  </div>
                  <div className="ml-auto self-center">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Audit ready</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3"
              >
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <p className="text-error font-mono text-xs">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-6 border-t border-outline-variant/15 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
            <button
              onClick={() => navigate('/')}
              className="text-zinc-500 hover:text-zinc-300 flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Upload
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full sm:w-auto bg-gradient-to-br from-[#00ff88] to-[#009954] text-black px-10 py-4 text-base font-['Space_Grotesk'] font-bold tracking-tight rounded-xl hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className={`material-symbols-outlined relative z-10 transition-transform ${isAnalyzing ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                {isAnalyzing ? 'sync' : 'analytics'}
              </span>
              <span className="relative z-10">
                {isAnalyzing ? 'Analyzing bias patterns...' : 'Run Bias Analysis'}
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Metrics preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap gap-2 justify-center"
        >
          {['Disparate Impact', 'Statistical Parity', 'Equal Opportunity', 'Equalized Odds', 'Theil Index'].map((m) => (
            <span
              key={m}
              className="text-[9px] font-mono uppercase tracking-widest text-zinc-700 border border-zinc-800/60 rounded-full px-3 py-1"
            >
              {m}
            </span>
          ))}
        </motion.div>
      </div>
    </main>
  );
};

export default ColumnSelector;
