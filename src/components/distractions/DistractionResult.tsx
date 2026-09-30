import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import type { DistractionMeta, DistractionResult as DistractionResultType } from '../../types/distraction';
import { playSuccessFanfare, playFailureGlitch } from '../../utils/sound';

interface DistractionResultViewProps {
  meta: DistractionMeta;
  result: DistractionResultType;
  onContinue: () => void;
  onRetry: () => void;
  nextProblemIndex?: number;
  continueButtonText?: string;
  isRunAllMode?: boolean;
  hasNextChallenge?: boolean;
}

export const DistractionResultView: React.FC<DistractionResultViewProps> = ({
  meta,
  result,
  onContinue,
  onRetry,
  continueButtonText,
  hasNextChallenge = true,
}) => {
  const isPassed = result.result === 'passed';
  const isTimeout = result.result === 'timeout';

  useEffect(() => {
    if (isPassed) {
      playSuccessFanfare();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#38bdf8', '#c084fc', '#f59e0b'],
        });
      } catch {}
    } else {
      playFailureGlitch();
    }
  }, [isPassed]);

  const defaultButtonLabel = continueButtonText || (
    hasNextChallenge ? 'NEXT CHALLENGE' : 'FINISH'
  );

  const buttonLabel = defaultButtonLabel;

  return (
    <div className="flex flex-col items-center justify-center text-center p-5 max-w-xl mx-auto w-full">
      {/* Result Status Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 260 }}
        className="mb-4"
      >
        {isPassed ? (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        ) : isTimeout ? (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.5)]">
            <AlertTriangle className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-500/15 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.5)]">
            <XCircle className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        )}
      </motion.div>

      {/* Header Result Message */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-slate-400 block mb-1">
          CHALLENGE {String(meta.index).padStart(2, '0')} / 10 • {meta.title}
        </span>
        
        <h2
          className={`text-2xl sm:text-3xl lg:text-4xl font-black font-['Orbitron'] tracking-wider mb-2 ${
            isPassed
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300'
              : isTimeout
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-rose-300'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-300 to-amber-300'
          }`}
        >
          {isPassed ? '✓ CHALLENGE CLEARED' : isTimeout ? '⏱ TIME EXPIRED // CHALLENGE FAILED' : '✕ CHALLENGE FAILED'}
        </h2>

        <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto mb-5 font-mono">
          {isPassed
            ? 'Distraction challenge bypassed. Returning to coding session...'
            : 'Your coding problem receives 0 points.'}
        </p>
      </motion.div>

      {/* Telemetry Metrics Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-lg text-left"
      >
        <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
          <span>EMITTED CALLBACK TELEMETRY</span>
          <span className="text-[10px] text-slate-400">{meta.codename}</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px]">TIME TAKEN</span>
            <span className="text-slate-100 font-bold text-sm">{result.timeTaken}s</span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-500 block text-[10px]">RESULT STATUS</span>
            <span className={`font-bold text-sm uppercase ${isPassed ? 'text-emerald-400' : isTimeout ? 'text-amber-400' : 'text-rose-400'}`}>
              {result.result}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[10px]">CALLBACK</span>
            <span className="text-cyan-400 font-bold text-sm">
              {isPassed ? 'onSuccess()' : isTimeout ? 'onTimeout()' : 'onFailure()'}
            </span>
          </div>
        </div>

        {result.metrics && Object.keys(result.metrics).length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap gap-2 text-[11px] font-mono">
            {Object.entries(result.metrics).map(([key, val]) => (
              <span key={key} className="px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/20 text-cyan-300">
                {key}: <strong>{String(val)}</strong>
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        <button
          onClick={onRetry}
          className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          RETRY CHALLENGE
        </button>

        <button
          onClick={onContinue}
          className={`px-6 py-2.5 rounded-xl font-['Orbitron'] font-bold text-xs sm:text-sm tracking-wider flex items-center gap-2 transition cursor-pointer ${
            isPassed
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
              : 'bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:brightness-110 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
          }`}
        >
          <span>{buttonLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
