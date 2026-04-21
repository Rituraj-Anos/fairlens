import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  icon?: string;
  visible: boolean;
  variant?: 'success' | 'info' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, icon = 'auto_awesome', visible, variant = 'success' }) => {
  const colors = {
    success: 'border-[#00ff88]/30 text-[#00ff88]',
    info: 'border-blue-500/30 text-blue-400',
    error: 'border-rose-500/30 text-rose-400',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-[#0e0e0e]/95 backdrop-blur-xl border ${colors[variant]} rounded-full px-5 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.8)]`}
        >
          {/* Glow dot */}
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variant === 'success' ? 'bg-[#00ff88]' : variant === 'info' ? 'bg-blue-400' : 'bg-rose-400'}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${variant === 'success' ? 'bg-[#00ff88]' : variant === 'info' ? 'bg-blue-400' : 'bg-rose-400'}`} />
          </span>
          <span className={`material-symbols-outlined text-base ${colors[variant]}`}>{icon}</span>
          <p className="text-white text-xs font-['Space_Grotesk'] font-medium tracking-wide whitespace-nowrap">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
