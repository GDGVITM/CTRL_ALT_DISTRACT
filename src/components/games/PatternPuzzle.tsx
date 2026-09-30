import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface PatternItem {
  sequence: string[];
  answer: string;
  options: string[];
  hint: string;
}

const PRESET_PATTERNS: PatternItem[] = [
  {
    sequence: ['2', '4', '8', '16'],
    answer: '32',
    options: ['24', '30', '32', '64'],
    hint: 'Powers of 2: 2^n',
  },
  {
    sequence: ['1', '1', '2', '3', '5', '8'],
    answer: '13',
    options: ['11', '12', '13', '15'],
    hint: 'Fibonacci sequence (a + b)',
  },
  {
    sequence: ['▲', '▲▲', '▲▲▲'],
    answer: '▲▲▲▲',
    options: ['▲▲', '▲▲▲▲', '▲▲▲▲▲', '◆◆◆◆'],
    hint: 'Linear increment (+1 glyph)',
  },
  {
    sequence: ['0x10', '0x20', '0x30', '0x40'],
    answer: '0x50',
    options: ['0x45', '0x50', '0x60', '0x100'],
    hint: 'Hexadecimal offset (+16 dec)',
  },
  {
    sequence: ['0001₂', '0010₂', '0100₂'],
    answer: '1000₂',
    options: ['0110₂', '1000₂', '1100₂', '0000₂'],
    hint: 'Binary left bitshift (<< 1)',
  },
  {
    sequence: ['1', '4', '9', '16', '25'],
    answer: '36',
    options: ['30', '34', '36', '49'],
    hint: 'Perfect squares (n²)',
  },
  {
    sequence: ['3', '9', '27', '81'],
    answer: '243',
    options: ['162', '216', '243', '729'],
    hint: 'Powers of 3: 3^n',
  },
];

const REQUIRED_SOLVES = 3;

export const PatternPuzzle: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [shuffledPatterns] = useState(() => [...PRESET_PATTERNS].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [feedback, setFeedback] = useState<{ selected: string; isCorrect: boolean } | null>(null);

  const pattern = shuffledPatterns[currentIndex % shuffledPatterns.length];

  const handleSelectOption = useCallback((option: string) => {
    if (feedback !== null || isPaused) return;
    playClick();

    const isCorrect = option === pattern.answer;
    setFeedback({ selected: option, isCorrect });

    if (isCorrect) {
      playCorrect();
      const nextSolved = solvedCount + 1;
      setSolvedCount(nextSolved);

      if (nextSolved >= REQUIRED_SOLVES) {
        setTimeout(() => {
          onPass({ solvedCount: nextSolved, target: REQUIRED_SOLVES });
        }, 500);
      } else {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setFeedback(null);
        }, 400);
      }
    } else {
      playWrong();
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);

      if (nextStrikes >= 3) {
        setTimeout(() => {
          onFail('3 Pattern Analysis Failures', { strikes: 3 });
        }, 600);
      } else {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setFeedback(null);
        }, 600);
      }
    }
  }, [feedback, isPaused, pattern, solvedCount, strikes, onPass, onFail]);

  // Keyboard 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (pattern.options[idx]) {
          handleSelectOption(pattern.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pattern, handleSelectOption]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Cpu className="w-4 h-4" />
          <span>PATTERNS RESOLVED: <strong className="text-slate-100">{solvedCount} / {REQUIRED_SOLVES}</strong></span>
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

      {/* Sequence Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="w-full flex flex-col items-center mb-6"
        >
          <div className="w-full py-8 px-5 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center relative">
            <div className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest mb-4">
              NEURAL SEQUENCE DETECTOR // PATTERN #{currentIndex + 1}
            </div>

            {/* Sequence Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {pattern.sequence.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 font-['Orbitron'] font-bold text-slate-100 text-lg sm:text-xl shadow-inner">
                    {item}
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-500/60" />
                </React.Fragment>
              ))}
              
              {/* Question Target */}
              <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border-2 border-dashed border-cyan-400 text-cyan-300 font-['Orbitron'] font-black text-xl animate-pulse">
                ?
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 4 Choices */}
      <div className="grid grid-cols-2 gap-3.5 w-full">
        {pattern.options.map((option, idx) => {
          const isChosen = feedback?.selected === option;
          const isAnswer = option === pattern.answer;

          let btnStyle = 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-cyan-400 hover:bg-slate-800/90';
          if (feedback) {
            if (isAnswer) {
              btnStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
            } else if (isChosen && !feedback.isCorrect) {
              btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
            } else {
              btnStyle = 'opacity-30 bg-slate-950 border-slate-800 text-slate-600';
            }
          }

          return (
            <motion.button
              key={option}
              onClick={() => handleSelectOption(option)}
              disabled={feedback !== null}
              whileHover={!feedback ? { scale: 1.02 } : {}}
              whileTap={!feedback ? { scale: 0.97 } : {}}
              className={`h-16 rounded-xl border flex items-center justify-between px-5 font-['Orbitron'] font-bold text-lg transition-all cursor-pointer ${btnStyle}`}
            >
              <span className="text-xs font-mono text-slate-500 font-normal border border-slate-700 rounded px-1.5 py-0.5">
                {idx + 1}
              </span>
              <span className="tracking-wider">{option}</span>
              <div className="w-5 flex justify-end">
                {feedback && isAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {feedback && isChosen && !feedback.isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
