import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface OddRound {
  gridSize: number; // e.g. 3 for 3x3 = 9, 4 for 4x4 = 16
  normalGlyph: string;
  oddGlyph: string;
  oddIndex: number;
  label: string;
}

const ROUNDS_DATA: OddRound[] = [
  {
    gridSize: 3, // 9 items
    normalGlyph: '⌬',
    oddGlyph: '⏣',
    oddIndex: 4,
    label: 'Identify the defective chemical molecular bond',
  },
  {
    gridSize: 4, // 16 items
    normalGlyph: '0101',
    oddGlyph: '0111',
    oddIndex: 11,
    label: 'Isolate the corrupted binary parity bit',
  },
  {
    gridSize: 4, // 16 items
    normalGlyph: 'function()',
    oddGlyph: 'funct1on()',
    oddIndex: 7,
    label: 'Spot the syntax obfuscation typo',
  },
  {
    gridSize: 4, // 16 items
    normalGlyph: '◈',
    oddGlyph: '◇',
    oddIndex: 2,
    label: 'Detect the hollow anomaly node',
  },
];

const TARGET_ROUNDS = 3;

export const OddOneOut: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [roundConfig, setRoundConfig] = useState<OddRound>(() => {
    const r = ROUNDS_DATA[0];
    const totalCells = r.gridSize * r.gridSize;
    return { ...r, oddIndex: Math.floor(Math.random() * totalCells) };
  });
  const [solvedRounds, setSolvedRounds] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const initRound = useCallback((idx: number) => {
    const template = ROUNDS_DATA[idx % ROUNDS_DATA.length];
    const totalCells = template.gridSize * template.gridSize;
    const randomOdd = Math.floor(Math.random() * totalCells);
    setRoundConfig({ ...template, oddIndex: randomOdd });
    setSelectedCell(null);
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (selectedCell !== null || isPaused) return;
    playClick();

    setSelectedCell(index);
    const isOdd = index === roundConfig.oddIndex;

    if (isOdd) {
      playCorrect();
      const nextSolved = solvedRounds + 1;
      setSolvedRounds(nextSolved);

      if (nextSolved >= TARGET_ROUNDS) {
        setTimeout(() => {
          onPass({ solvedRounds: nextSolved, target: TARGET_ROUNDS });
        }, 500);
      } else {
        setTimeout(() => {
          const nextIdx = currentRoundIdx + 1;
          setCurrentRoundIdx(nextIdx);
          initRound(nextIdx);
        }, 400);
      }
    } else {
      playWrong();
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);

      if (nextStrikes >= 3) {
        setTimeout(() => {
          onFail('3 False Anomaly Detections', { strikes: 3 });
        }, 600);
      } else {
        setTimeout(() => {
          setSelectedCell(null);
        }, 500);
      }
    }
  }, [selectedCell, isPaused, roundConfig, solvedRounds, strikes, currentRoundIdx, initRound, onPass, onFail]);

  useEffect(() => {
    initRound(0);
  }, [initRound]);

  const totalCells = roundConfig.gridSize * roundConfig.gridSize;
  const gridColsClass = roundConfig.gridSize === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between w-full mb-3 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Crosshair className="w-4 h-4" />
          <span>ROUNDS: <strong className="text-slate-100">{solvedRounds} / {TARGET_ROUNDS}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-xs">ERRORS:</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
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

      <div className="text-xs font-mono text-cyan-400/90 mb-3 text-center px-2 py-1 rounded bg-cyan-950/30 border border-cyan-500/20">
        SCANNER OBJECTIVE: {roundConfig.label}
      </div>

      {/* Grid Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentRoundIdx}-${roundConfig.oddIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`grid ${gridColsClass} gap-2.5 w-full max-w-md`}
        >
          {Array.from({ length: totalCells }).map((_, index) => {
            const isTarget = index === roundConfig.oddIndex;
            const isSelected = selectedCell === index;
            const glyph = isTarget ? roundConfig.oddGlyph : roundConfig.normalGlyph;

            let cellClass = 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-cyan-400 hover:bg-slate-800';
            if (isSelected) {
              if (isTarget) {
                cellClass = 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
              } else {
                cellClass = 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
              }
            }

            return (
              <motion.button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={selectedCell !== null}
                whileHover={selectedCell === null ? { scale: 1.05 } : {}}
                whileTap={selectedCell === null ? { scale: 0.95 } : {}}
                className={`h-16 rounded-xl border flex items-center justify-center font-mono font-bold text-base sm:text-lg transition-all cursor-pointer select-none p-2 text-center overflow-hidden ${cellClass}`}
              >
                <span className="truncate">{glyph}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
