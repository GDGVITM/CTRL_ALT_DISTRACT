import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playCorrect, playWrong, playTone } from '../../utils/sound';

type Stage = 'idle' | 'waiting' | 'ready' | 'clicked' | 'early' | 'failed';

export const ReactionTest: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [stage, setStage] = useState<Stage>('waiting');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startWaitingRound = () => {
    setStage('waiting');
    const delay = 1800 + Math.random() * 2500; // 1.8s to 4.3s random delay
    
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setStage('ready');
      playTone(900, 'sine', 0.15, 0.2);
    }, delay);
  };

  useEffect(() => {
    if (!isPaused) {
      startWaitingRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPaused]);

  const handleClickArea = () => {
    if (stage === 'waiting') {
      // False start
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      playWrong();
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      
      if (newStrikes >= 3) {
        setStage('failed');
        setTimeout(() => {
          onFail('3 False Starts Exceeded', { strikes: 3 });
        }, 1200);
      } else {
        setStage('early');
        setTimeout(() => {
          startWaitingRound();
        }, 1400);
      }
    } else if (stage === 'ready') {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(elapsed);
      setStage('clicked');

      if (elapsed <= 550) {
        playCorrect();
        setTimeout(() => {
          onPass({ reactionTimeMs: elapsed, grade: elapsed < 250 ? 'S+' : elapsed < 350 ? 'A' : 'B' });
        }, 1200);
      } else {
        playWrong();
        setTimeout(() => {
          onFail(`Reaction Too Slow (${elapsed}ms > 550ms)`, { reactionTimeMs: elapsed });
        }, 1400);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-4">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full mb-6 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400">
          <Zap className="w-4 h-4" />
          <span className="font-mono font-semibold uppercase tracking-wider">Reflex Benchmark</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs uppercase">Strikes:</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  s <= strikes ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Target Box */}
      <AnimatePresence mode="wait">
        {stage === 'waiting' && (
          <motion.button
            key="waiting"
            onClick={handleClickArea}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-72 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900/80 to-slate-950 shadow-[0_0_35px_-10px_rgba(245,158,11,0.25)] transition-all group"
          >
            <div className="absolute inset-0 radar-sweep opacity-30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent opacity-50" />
            
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/50 flex items-center justify-center mb-4 text-amber-400"
            >
              <AlertTriangle className="w-10 h-10" />
            </motion.div>
            
            <h3 className="text-2xl font-black font-['Orbitron'] tracking-widest text-amber-400 mb-2 uppercase text-glow-amber">
              WAIT FOR SIGNAL...
            </h3>
            <p className="text-slate-400 text-xs font-mono tracking-wider">
              DO NOT CLICK YET // RANDOM INTERCEPT PENDING
            </p>
          </motion.button>
        )}

        {stage === 'ready' && (
          <motion.button
            key="ready"
            onClick={handleClickArea}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: [0.95, 1.02, 1], opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="w-full h-72 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer border-2 border-emerald-400 bg-gradient-to-b from-emerald-950/80 via-emerald-900/40 to-slate-950 shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all animate-pulse"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 via-cyan-500/30 to-emerald-500/30 blur-xl opacity-60 pointer-events-none"
            />
            
            <div className="w-24 h-24 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center mb-4 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.8)]">
              <Zap className="w-12 h-12 fill-current animate-bounce" />
            </div>
            
            <h3 className="text-4xl font-black font-['Orbitron'] tracking-widest text-white mb-2 uppercase text-glow-emerald">
              CLICK NOW!
            </h3>
            <p className="text-emerald-300 font-mono text-sm tracking-wider font-bold">
              TAP AS FAST AS POSSIBLE!
            </p>
          </motion.button>
        )}

        {stage === 'early' && (
          <motion.div
            key="early"
            initial={{ x: -15, opacity: 0 }}
            animate={{ x: [0, -10, 10, -5, 5, 0], opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-72 rounded-2xl flex flex-col items-center justify-center border-2 border-rose-500/60 bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 shadow-[0_0_30px_rgba(244,63,94,0.3)] text-center px-6"
          >
            <ShieldAlert className="w-16 h-16 text-rose-500 mb-3" />
            <h3 className="text-2xl font-bold font-['Orbitron'] text-rose-400 mb-2">
              TOO EARLY! FALSE START
            </h3>
            <p className="text-slate-400 font-mono text-xs">
              Strike {strikes}/3. Recalibrating signal in 1s...
            </p>
          </motion.div>
        )}

        {stage === 'clicked' && reactionTime !== null && (
          <motion.div
            key="clicked"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-72 rounded-2xl flex flex-col items-center justify-center border-2 border-cyan-400/60 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.35)] text-center px-6"
          >
            <CheckCircle2 className="w-14 h-14 text-cyan-400 mb-2" />
            <span className="text-slate-400 font-mono text-xs uppercase tracking-widest">Reaction Velocity</span>
            <div className="text-5xl font-black font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 my-2">
              {reactionTime} <span className="text-2xl font-mono font-normal text-cyan-300">ms</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
              {reactionTime < 250 ? '⚡ GODLIKE (S-TIER)' : reactionTime < 350 ? '🎯 SHARP REFLEXES (A-TIER)' : '✅ PASSING GRADE'}
            </div>
          </motion.div>
        )}

        {stage === 'failed' && (
          <motion.div
            key="failed"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-72 rounded-2xl flex flex-col items-center justify-center border-2 border-rose-500 bg-rose-950/40 text-center px-6"
          >
            <AlertTriangle className="w-16 h-16 text-rose-500 mb-3" />
            <h3 className="text-2xl font-bold font-['Orbitron'] text-rose-400 mb-1">
              FALSE START LIMIT EXCEEDED
            </h3>
            <p className="text-slate-400 font-mono text-xs">Terminating disruption challenge...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
