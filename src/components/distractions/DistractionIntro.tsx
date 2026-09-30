import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Clock } from 'lucide-react';
import type { DistractionMeta } from '../../types/distraction';
import { playCountdownTick, playCountdownGo, playWarningAlarm } from '../../utils/sound';

interface DistractionIntroProps {
  meta: DistractionMeta;
  onCountdownComplete: () => void;
  timeLimit?: number;
}

export const DistractionIntro: React.FC<DistractionIntroProps> = ({
  meta,
  onCountdownComplete,
  timeLimit = 120,
}) => {
  const [countdown, setCountdown] = useState(3);
  const [showGo, setShowGo] = useState(false);

  useEffect(() => {
    // High alert alarm on entrance
    playWarningAlarm();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) {
          playCountdownTick();
          return prev - 1;
        } else if (prev === 1) {
          clearInterval(interval);
          setShowGo(true);
          playCountdownGo();
          setTimeout(() => {
            onCountdownComplete();
          }, 700);
          return 0;
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onCountdownComplete]);

  const minutes = Math.floor(timeLimit / 60);
  const seconds = timeLimit % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 max-w-xl mx-auto w-full">
      {/* High-Alert Header Banner */}
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-rose-500/20 border-2 border-rose-500 text-rose-300 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse"
      >
        <ShieldAlert className="w-5 h-5 text-rose-400" />
        <span className="font-['Orbitron'] text-xs sm:text-sm font-black tracking-widest uppercase">
          ⚠ DISTRACTION DETECTED
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="text-slate-300 font-mono text-xs sm:text-sm mb-1"
      >
        &ldquo;Your coding session has been interrupted.&rdquo;
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-cyan-400 font-mono text-xs mb-5 font-semibold"
      >
        Complete the challenge to resume.
      </motion.p>

      {/* Challenge Title & Info Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6 w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner"
      >
        <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-slate-800">
          <span className="text-cyan-400 font-bold uppercase tracking-widest">
            CHALLENGE {String(meta.index).padStart(2, '0')} / 10 • {meta.category}
          </span>
          <span className="flex items-center gap-1 text-amber-300 font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {timeFormatted}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-teal-300 mb-2 tracking-wide uppercase">
          {meta.title}
        </h2>
        
        <p className="text-slate-300 text-xs max-w-md mx-auto leading-relaxed mb-3">
          {meta.description}
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>OBJECTIVE: <strong className="text-slate-100">{meta.targetRequirement}</strong></span>
        </div>
      </motion.div>

      {/* Animated 3 -> 2 -> 1 -> GO! Countdown */}
      <div className="h-24 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!showGo ? (
            <motion.div
              key={countdown}
              initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
              animate={{ scale: 1.25, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.45, type: 'spring' }}
              className="text-7xl sm:text-8xl font-black font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-teal-400 to-emerald-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]"
            >
              {countdown}
            </motion.div>
          ) : (
            <motion.div
              key="go"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1.15], opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="text-6xl sm:text-7xl font-black font-['Orbitron'] text-emerald-400 drop-shadow-[0_0_45px_rgba(16,185,129,0.95)] tracking-widest"
            >
              GO!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-slate-500 text-[11px] font-mono tracking-widest mt-2">
        UNSKIPPABLE TAKEOVER • MUST COMPLETE CHALLENGE TO UNLOCK EDITOR
      </p>
    </div>
  );
};
