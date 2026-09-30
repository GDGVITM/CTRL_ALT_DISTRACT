import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { playTone } from '../../utils/sound';

interface DistractionTimerProps {
  totalSeconds: number;
  timeRemaining: number;
  isPaused: boolean;
}

export const DistractionTimer: React.FC<DistractionTimerProps> = ({
  totalSeconds,
  timeRemaining,
  isPaused,
}) => {
  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  // Beep on urgent seconds (10, 9, 8, ...)
  useEffect(() => {
    if (!isPaused && isUrgent && timeRemaining > 0) {
      playTone(isCritical ? 880 : 660, 'sine', 0.08, 0.08);
    }
  }, [timeRemaining, isUrgent, isCritical, isPaused]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = Math.max(0, Math.min(100, (timeRemaining / totalSeconds) * 100));

  return (
    <div className="flex flex-col items-center">
      {/* Timer Container Badge */}
      <motion.div
        animate={
          isCritical
            ? { scale: [1, 1.08, 1] }
            : isUrgent
            ? { scale: [1, 1.03, 1] }
            : {}
        }
        transition={{ repeat: Infinity, duration: isCritical ? 0.5 : 1 }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono transition-all duration-300 ${
          isCritical
            ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
            : isUrgent
            ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
            : 'bg-slate-900/90 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
        }`}
      >
        {isUrgent ? (
          <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
        ) : (
          <Clock className="w-4 h-4 text-cyan-400" />
        )}
        
        <span className="text-base sm:text-lg font-black font-['Orbitron'] tracking-wider">
          {formattedTime}
        </span>
      </motion.div>

      {/* Progress Bar Underneath */}
      <div className="w-full max-w-[120px] h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
        <motion.div
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-teal-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
