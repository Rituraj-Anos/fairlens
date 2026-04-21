import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const EmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1920px] mx-auto flex-1 min-h-screen">
      {/* Reuse sidebar feel without import dependency */}
      <div className="flex-grow flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#00ff88]/[0.04] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 text-center max-w-md"
        >
          {/* Animated icon container */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-8 relative w-24 h-24"
          >
            <div className="absolute inset-0 rounded-full bg-[#00ff88]/10 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00ff88]/10 to-cyan-500/10 border border-[#00ff88]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#00ff88]/60 text-5xl">dataset</span>
            </div>
          </motion.div>

          {/* Text */}
          <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-white mb-3 tracking-tight">
            No analysis data found
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 font-mono">
            Upload a dataset and configure your audit parameters<br />to start detecting bias.
          </p>

          {/* Metrics preview — teaser skeleton */}
          <div className="flex gap-2 justify-center mb-8 opacity-30">
            {[40, 60, 35, 55, 45].map((h, i) => (
              <div
                key={i}
                className="w-8 bg-[#00ff88] rounded-t-sm"
                style={{ height: `${h}px`, opacity: 0.4 + i * 0.1 }}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-[#00ff88] text-black px-8 py-3.5 rounded-xl font-bold font-['Space_Grotesk'] text-sm transition-all shadow-[0_0_25px_rgba(0,255,136,0.4)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Start New Analysis
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default EmptyState;
