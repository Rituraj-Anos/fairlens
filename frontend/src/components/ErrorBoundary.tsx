import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; errorInfo?: ErrorInfo; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('[FairLens ErrorBoundary]', error, errorInfo);
  }

  handleRestart = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-error/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#00ff88]/3 rounded-full blur-[80px]" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,180,171,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,180,171,1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 w-full max-w-xl"
        >
          {/* Glass card */}
          <div className="bg-surface-container-high/60 backdrop-blur-xl border border-error/20 rounded-2xl p-8 md:p-10 shadow-[0_20px_80px_rgba(255,180,171,0.1)]">
            {/* Error badge */}
            <div className="inline-flex items-center gap-2 bg-error/10 border border-error/20 rounded-full px-4 py-1.5 mb-6">
              <span className="material-symbols-outlined text-error text-sm">bug_report</span>
              <span className="text-error text-[10px] font-mono uppercase tracking-widest">System Exception</span>
            </div>

            <h1 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold text-on-surface mb-3 leading-tight">
              Something{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-error to-red-400">
                went wrong
              </span>
            </h1>

            <p className="text-zinc-500 font-['Manrope'] text-sm mb-6 leading-relaxed">
              The FairLens application encountered an unexpected error. Your analysis session data may still be preserved.
            </p>

            {/* Error box */}
            {this.state.error && (
              <div className="mb-8 bg-surface-container-lowest rounded-xl p-4 border border-error/10 overflow-auto max-h-32 custom-scrollbar">
                <p className="text-error/80 font-mono text-xs leading-relaxed">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-outline-variant/30 hover:border-[#00ff88]/40 text-zinc-400 hover:text-[#00ff88] px-6 py-3 rounded-xl font-['Space_Grotesk'] text-sm uppercase tracking-widest hover:bg-[#00ff88]/5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Try Again
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={this.handleRestart}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-[#00ff88] to-[#009954] text-black px-6 py-3 rounded-xl font-['Space_Grotesk'] text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,255,136,0.35)] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Restart App
              </motion.button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-[10px] font-mono text-zinc-800 uppercase tracking-widest">
              FairLens v1.0 — Restarting will clear your session data
            </p>
          </div>
        </motion.div>
      </div>
    );
  }
}

export default ErrorBoundary;
