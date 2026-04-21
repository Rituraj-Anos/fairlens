import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Upload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setFileName(file.name);
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8080/api/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { session_id, meta } = response.data;
      const { all_columns, detected_protected_attributes, detected_label_column } = meta;
      const columnNames = all_columns.map((c: any) => c.name);

      localStorage.setItem('session_id', session_id);
      localStorage.setItem('columns', JSON.stringify(columnNames));
      localStorage.setItem('detected_protected_attributes', JSON.stringify(detected_protected_attributes || []));
      localStorage.setItem('detected_label_column', detected_label_column || '');

      navigate('/configure');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Upload failed. Please check if the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-12 relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#00ff88]/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-400/[0.03] rounded-full blur-[80px] pointer-events-none" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10 md:mb-14"
        >
          {/* Step badge */}
          <div className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
            </span>
            <span className="text-[#00ff88] text-[10px] font-mono uppercase tracking-widest">Step 1 of 3 — Dataset Upload</span>
          </div>

          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-on-surface mb-4 leading-[1.1]">
            Initialize{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00cc6a]">
              Forensic Audit
            </span>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Upload your dataset to begin the AI-powered bias detection and fairness analysis.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="mt-5 flex items-center justify-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3"
              >
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <p className="text-error font-mono text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        >
          <div
            className={`relative w-full rounded-2xl transition-all duration-500 cursor-pointer group ${
              isDragging ? 'drop-zone-active scale-[1.01]' : ''
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Animated border */}
            <div className={`absolute inset-0 rounded-2xl border-2 border-dashed transition-all duration-500 ${
              isDragging
                ? 'border-[#00ff88] shadow-[0_0_40px_rgba(0,255,136,0.2),inset_0_0_60px_rgba(0,255,136,0.03)]'
                : 'border-outline-variant/30 group-hover:border-[#00ff88]/40 group-hover:shadow-[0_0_25px_rgba(0,255,136,0.08)]'
            }`} />

            <div className="relative rounded-2xl bg-surface-container-lowest/80 backdrop-blur-sm flex flex-col items-center justify-center py-16 md:py-24 px-8 text-center min-h-[320px] md:min-h-[420px] overflow-hidden">
              {/* Inner shimmer on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer rounded-2xl pointer-events-none" />

              {/* Icon */}
              <motion.div
                animate={isDragging ? { scale: 1.15, y: -8 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative mb-8"
              >
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isDragging
                    ? 'bg-[#00ff88]/20 shadow-[0_0_30px_rgba(0,255,136,0.3)]'
                    : 'bg-surface-container-high group-hover:bg-[#00ff88]/10 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]'
                }`}>
                  <span className={`material-symbols-outlined text-4xl md:text-5xl transition-all duration-300 ${
                    isUploading ? 'animate-spin text-[#00ff88]' : isDragging ? 'text-[#00ff88]' : 'text-[#00ff88]/60 group-hover:text-[#00ff88]'
                  }`}
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    {isUploading ? 'sync' : isDragging ? 'move_to_inbox' : 'cloud_upload'}
                  </span>
                </div>

                {/* Ping ring */}
                {isDragging && (
                  <div className="absolute inset-0 rounded-2xl border border-[#00ff88]/50 animate-ping" />
                )}
              </motion.div>

              {/* Text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={isUploading ? 'uploading' : isDragging ? 'dragging' : 'idle'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="font-headline text-xl md:text-2xl font-semibold text-on-surface mb-2">
                    {isUploading
                      ? 'Processing dataset...'
                      : isDragging
                      ? 'Release to upload'
                      : fileName
                      ? fileName
                      : 'Drop your CSV dataset here'}
                  </h2>
                  <p className="text-on-surface-variant text-xs md:text-sm mb-8 font-mono opacity-60">
                    {isUploading ? 'Analyzing schema and structure...' : 'Supports hiring, loan, medical, and census datasets'}
                  </p>
                </motion.div>
              </AnimatePresence>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                className="hidden"
                accept=".csv"
              />

              {!isUploading && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden bg-transparent border border-[#00ff88]/40 hover:border-[#00ff88] text-[#00ff88] px-8 py-3 rounded-xl font-mono text-sm tracking-widest uppercase transition-all duration-300 hover:bg-[#00ff88]/10 hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] group/btn"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">folder_open</span>
                    Browse Files
                  </span>
                </motion.button>
              )}

              {isUploading && (
                <div className="w-64 h-1 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a]"
                    initial={{ width: '0%' }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Features row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { icon: 'lock', label: 'Zero persistent storage', desc: 'Data lives only in memory' },
            { icon: 'flash_on', label: 'Instant analysis', desc: 'Powered by AI fairness engine' },
            { icon: 'auto_awesome', label: 'Gemini-powered', desc: 'AI forensic audit report' },
          ].map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3 bg-surface-container/60 border border-outline-variant/15 rounded-xl px-4 py-3"
            >
              <span className="material-symbols-outlined text-[#00ff88]/60 text-sm">{feat.icon}</span>
              <div>
                <p className="text-on-surface text-xs font-['Space_Grotesk'] font-semibold">{feat.label}</p>
                <p className="text-zinc-600 text-[10px] font-mono">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
};

export default Upload;
