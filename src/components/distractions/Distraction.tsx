import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RotateCcw } from 'lucide-react';
import type { 
  DistractionId, 
  DistractionResult,
  DistractionSuccessPayload,
  DistractionFailurePayload,
  DistractionTimeoutPayload
} from '../../types/distraction';
import { DISTRACTIONS } from '../../utils/distractionRegistry';
import { DistractionIntro } from './DistractionIntro';
import { DistractionTimer } from './DistractionTimer';
import { DistractionResultView } from './DistractionResult';
import { GameFactory } from '../games/GameFactory';

export interface DistractionProps {
  distractionId: DistractionId;
  isOpen?: boolean;
  timeLimit?: number; // default 120 seconds (2 minutes)
  onSuccess?: (payload: DistractionSuccessPayload) => void;
  onFailure?: (payload: DistractionFailurePayload) => void;
  onTimeout?: (payload: DistractionTimeoutPayload) => void;
  onComplete?: (payload: DistractionResult) => void;
  onClose?: () => void;
  continueButtonText?: string;
  nextProblemIndex?: number;
  isRunAllMode?: boolean;
  showDevControls?: boolean;
  problemId?: number;
  hasNextChallenge?: boolean;
}

type ModalPhase = 'intro' | 'playing' | 'result';

export const Distraction: React.FC<DistractionProps> = ({
  distractionId,
  isOpen = true,
  timeLimit = 120,
  onSuccess,
  onFailure,
  onTimeout,
  onComplete,
  onClose,
  continueButtonText,
  nextProblemIndex,
  isRunAllMode = false,
  showDevControls = true,
  problemId = 1,
}) => {
  const meta = DISTRACTIONS.find((d) => d.id === distractionId) || DISTRACTIONS[0];

  const [phase, setPhase] = useState<ModalPhase>('intro');
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [resultPayload, setResultPayload] = useState<DistractionResult | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize or reset challenge state
  const resetChallenge = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimeRemaining(timeLimit);
    setResultPayload(null);
    setPhase('intro');
  }, [timeLimit]);

  useEffect(() => {
    if (isOpen) {
      resetChallenge();
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, distractionId, resetChallenge]);

  // Lock body scroll when overlay is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Timeout
  const handleGameTimeout = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const elapsedSec = timeLimit;

    const payload: DistractionTimeoutPayload = {
      distractionId: meta.id,
      result: 'timeout',
      timeTaken: elapsedSec,
      timeTakenSeconds: elapsedSec,
      timestamp: new Date().toISOString(),
      problemId,
    };

    setResultPayload(payload);
    setPhase('result');
    onTimeout?.(payload);
    onComplete?.(payload);
  }, [meta.id, timeLimit, problemId, onTimeout, onComplete]);

  // Handle countdown complete -> Start Game & Timer
  const handleCountdownComplete = useCallback(() => {
    setPhase('playing');
    startTimeRef.current = performance.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleGameTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleGameTimeout]);

  // Handle Pass
  const handleGamePass = useCallback((metrics?: Record<string, string | number | boolean>) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const elapsedSec = Math.max(1, Math.round(((performance.now() - startTimeRef.current) / 1000) * 10) / 10);

    const payload: DistractionSuccessPayload = {
      distractionId: meta.id,
      result: 'passed',
      timeTaken: elapsedSec,
      timeTakenSeconds: elapsedSec,
      metrics,
      timestamp: new Date().toISOString(),
      problemId,
    };

    setResultPayload(payload);
    setPhase('result');
    onSuccess?.(payload);
    onComplete?.(payload);
  }, [meta.id, problemId, onSuccess, onComplete]);

  // Handle Fail
  const handleGameFail = useCallback((reason?: string, metrics?: Record<string, string | number | boolean>) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const elapsedSec = Math.max(1, Math.round(((performance.now() - startTimeRef.current) / 1000) * 10) / 10);

    const payload: DistractionFailurePayload = {
      distractionId: meta.id,
      result: 'failed',
      timeTaken: elapsedSec,
      timeTakenSeconds: elapsedSec,
      metrics: { ...metrics, reason: reason || 'Failure condition met' },
      timestamp: new Date().toISOString(),
      problemId,
    };

    setResultPayload(payload);
    setPhase('result');
    onFailure?.(payload);
    onComplete?.(payload);
  }, [meta.id, problemId, onFailure, onComplete]);

  // Trap ESC key & focus to prevent accidental dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="distraction-modal-title"
      >
        {/* Unskippable Backdrop with Blur & Cyber Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[#04060abf] backdrop-blur-xl cyber-grid"
        />

        {/* Scanline overlay for cyber immersion */}
        <div className="fixed inset-0 scanline-overlay pointer-events-none opacity-40 z-10" />

        {/* Main Distraction Panel */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-20 w-full max-w-2xl bg-gradient-to-b from-[#0e1320] via-[#090d16] to-[#06080e] border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_-15px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col"
        >
          {/* Top Challenge Header */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-['Orbitron'] font-black tracking-widest text-cyan-400">
                    CTRL ALT DISTRACT
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold uppercase">
                    CHALLENGE #{String(meta.index).padStart(2, '0')}
                  </span>
                </div>
                <h1 id="distraction-modal-title" className="text-sm font-semibold text-slate-200 tracking-wide font-sans m-0 p-0 text-left">
                  {meta.title}
                </h1>
              </div>
            </div>

            {/* 2-Minute Timer component */}
            {phase === 'playing' && (
              <DistractionTimer
                totalSeconds={timeLimit}
                timeRemaining={timeRemaining}
                isPaused={false}
              />
            )}
          </div>

          {/* Body content based on phase */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center min-h-[380px]">
            {phase === 'intro' && (
              <DistractionIntro
                meta={meta}
                onCountdownComplete={handleCountdownComplete}
              />
            )}

            {phase === 'playing' && (
              <div className="w-full flex flex-col items-center">
                <GameFactory
                  distractionId={meta.id}
                  onPass={handleGamePass}
                  onFail={handleGameFail}
                  timeRemaining={timeRemaining}
                  isPaused={false}
                />
              </div>
            )}

            {phase === 'result' && resultPayload && (
              <DistractionResultView
                meta={meta}
                result={resultPayload}
                onContinue={() => onClose?.()}
                onRetry={resetChallenge}
                continueButtonText={continueButtonText}
                nextProblemIndex={nextProblemIndex}
                isRunAllMode={isRunAllMode}
              />
            )}
          </div>

          {/* Dev helper tray (only in preview/testing mode) */}
          {showDevControls && (
            <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>DISTRACTION TAKEOVER ACTIVE</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetChallenge}
                  className="hover:text-cyan-400 flex items-center gap-1 transition cursor-pointer"
                  title="Restart current distraction"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="hover:text-rose-400 transition cursor-pointer"
                    title="Exit to Coding Interface"
                  >
                    [Back to Coding]
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Aliases for compatibility
export const DistractionOverlay = Distraction;
export const DistractionModal = Distraction;
export default Distraction;
