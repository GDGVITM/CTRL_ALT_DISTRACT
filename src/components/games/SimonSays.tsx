import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playTone, playCorrect, playWrong } from '../../utils/sound';

interface PadConfig {
  id: number;
  label: string;
  code: string;
  freq: number;
  colorName: string;
  activeClass: string;
  idleClass: string;
  borderClass: string;
}

const PADS: PadConfig[] = [
  {
    id: 0,
    label: 'ALPHA',
    code: 'α',
    freq: 523.25,
    colorName: 'Cyan',
    activeClass: 'bg-cyan-400 text-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.9)] scale-105',
    idleClass: 'bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/50',
    borderClass: 'border-cyan-500/50',
  },
  {
    id: 1,
    label: 'BETA',
    code: 'β',
    freq: 659.25,
    colorName: 'Purple',
    activeClass: 'bg-purple-400 text-slate-950 shadow-[0_0_35px_rgba(168,85,247,0.9)] scale-105',
    idleClass: 'bg-purple-950/40 text-purple-400 hover:bg-purple-900/50',
    borderClass: 'border-purple-500/50',
  },
  {
    id: 2,
    label: 'GAMMA',
    code: 'γ',
    freq: 783.99,
    colorName: 'Emerald',
    activeClass: 'bg-emerald-400 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.9)] scale-105',
    idleClass: 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50',
    borderClass: 'border-emerald-500/50',
  },
  {
    id: 3,
    label: 'DELTA',
    code: 'δ',
    freq: 1046.5,
    colorName: 'Amber',
    activeClass: 'bg-amber-400 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.9)] scale-105',
    idleClass: 'bg-amber-950/40 text-amber-400 hover:bg-amber-900/50',
    borderClass: 'border-amber-500/50',
  },
];

const LEVEL_LENGTHS = [3, 4, 5]; // 3 levels

export const SimonSays: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [level, setLevel] = useState(0); // 0, 1, 2
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isPlayingSeq, setIsPlayingSeq] = useState(true);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const isPlayingRef = useRef(false);

  // Generate sequence for current level
  const startLevel = useCallback((lvlIndex: number) => {
    const length = LEVEL_LENGTHS[lvlIndex];
    const newSeq: number[] = [];
    for (let i = 0; i < length; i++) {
      newSeq.push(Math.floor(Math.random() * 4));
    }
    setSequence(newSeq);
    setPlayerIndex(0);
    setIsPlayingSeq(true);
    isPlayingRef.current = true;

    // Playback sequence
    let step = 0;
    const interval = setInterval(() => {
      if (step >= newSeq.length) {
        clearInterval(interval);
        setActivePad(null);
        setIsPlayingSeq(false);
        isPlayingRef.current = false;
        return;
      }

      const padId = newSeq[step];
      setActivePad(padId);
      playTone(PADS[padId].freq, 'triangle', 0.28, 0.15);

      setTimeout(() => {
        setActivePad(null);
      }, 350);

      step++;
    }, 600);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      const timer = setTimeout(() => {
        startLevel(level);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [level, isPaused, startLevel]);

  const handlePadPress = useCallback((padId: number) => {
    if (isPlayingSeq || isPaused) return;

    // Trigger visual + sound
    setActivePad(padId);
    playTone(PADS[padId].freq, 'triangle', 0.2, 0.15);
    setTimeout(() => setActivePad(null), 200);

    // Check match
    if (padId === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      setPlayerIndex(nextIndex);

      if (nextIndex === sequence.length) {
        // Level Complete!
        playCorrect();
        if (level + 1 >= LEVEL_LENGTHS.length) {
          // All levels done!
          setTimeout(() => {
            onPass({ levelsCompleted: 3, finalSequenceLength: 5 });
          }, 600);
        } else {
          // Next Level
          setTimeout(() => {
            setLevel((prev) => prev + 1);
          }, 800);
        }
      }
    } else {
      // Wrong note
      playWrong();
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);

      if (nextStrikes >= 2) {
        setTimeout(() => {
          onFail('Neural Desynchronization (Strike Limit Reached)', { strikes: 2 });
        }, 700);
      } else {
        // Replay current level
        setTimeout(() => {
          startLevel(level);
        }, 800);
      }
    }
  }, [isPlayingSeq, isPaused, sequence, playerIndex, level, strikes, startLevel, onPass, onFail]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Activity className="w-4 h-4" />
          <span>LEVEL: <strong className="text-slate-100">{level + 1} / {LEVEL_LENGTHS.length}</strong></span>
          <span className="text-slate-500">({LEVEL_LENGTHS[level]} Notes)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-xs">STRIKES:</span>
          <div className="flex gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s <= strikes ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* State Banner */}
      <div className="mb-4">
        {isPlayingSeq ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs animate-pulse font-bold">
            📡 MEMORIZE THE IMPULSE SEQUENCE...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
            ⚡ REPEAT THE SEQUENCE ({playerIndex}/{sequence.length})
          </span>
        )}
      </div>

      {/* 2x2 Simon Quad Nodes */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {PADS.map((pad) => {
          const isActive = activePad === pad.id;

          return (
            <motion.button
              key={pad.id}
              onClick={() => handlePadPress(pad.id)}
              disabled={isPlayingSeq}
              whileHover={!isPlayingSeq ? { scale: 1.03 } : {}}
              whileTap={!isPlayingSeq ? { scale: 0.95 } : {}}
              className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none ${pad.borderClass} ${
                isActive ? pad.activeClass : pad.idleClass
              }`}
            >
              <span className="text-3xl font-black font-['Orbitron']">{pad.code}</span>
              <span className="text-xs font-mono font-semibold tracking-wider mt-1">{pad.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
