import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, CheckCircle2, XCircle } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface ColorDef {
  name: string;
  cssColor: string;
  twClass: string;
  borderClass: string;
}

const COLORS: ColorDef[] = [
  { name: 'RED', cssColor: '#f43f5e', twClass: 'text-rose-500 bg-rose-500/20', borderClass: 'border-rose-500/60' },
  { name: 'BLUE', cssColor: '#38bdf8', twClass: 'text-sky-400 bg-sky-500/20', borderClass: 'border-sky-500/60' },
  { name: 'GREEN', cssColor: '#10b981', twClass: 'text-emerald-400 bg-emerald-500/20', borderClass: 'border-emerald-500/60' },
  { name: 'YELLOW', cssColor: '#f59e0b', twClass: 'text-amber-400 bg-amber-500/20', borderClass: 'border-amber-500/60' },
  { name: 'PURPLE', cssColor: '#a855f7', twClass: 'text-purple-400 bg-purple-500/20', borderClass: 'border-purple-500/60' },
];

interface TrapRound {
  wordText: string;
  fontColor: ColorDef;
  mode: 'INK_COLOR' | 'WORD_TEXT';
  correctAnswer: string;
  options: ColorDef[];
}

function generateRound(roundNumber: number): TrapRound {
  // Mostly ask for INK_COLOR, occasionally switch
  const mode: 'INK_COLOR' | 'WORD_TEXT' = roundNumber > 3 && Math.random() > 0.65 ? 'WORD_TEXT' : 'INK_COLOR';

  const wordIndex = Math.floor(Math.random() * COLORS.length);
  let colorIndex = Math.floor(Math.random() * COLORS.length);
  // Ensure mismatch for genuine Stroop effect
  while (colorIndex === wordIndex) {
    colorIndex = Math.floor(Math.random() * COLORS.length);
  }

  const wordText = COLORS[wordIndex].name;
  const fontColor = COLORS[colorIndex];
  const correctAnswer = mode === 'INK_COLOR' ? fontColor.name : wordText;

  // Pick 4 options including correct
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5).slice(0, 4);
  if (!shuffled.some((c) => c.name === correctAnswer)) {
    shuffled[0] = COLORS.find((c) => c.name === correctAnswer)!;
  }
  shuffled.sort(() => Math.random() - 0.5);

  return {
    wordText,
    fontColor,
    mode,
    correctAnswer,
    options: shuffled,
  };
}

const TARGET_STRIKES = 5;

export const ColorTrap: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [round, setRound] = useState<TrapRound>(() => generateRound(1));
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [feedback, setFeedback] = useState<{ selected: string; isCorrect: boolean } | null>(null);

  const handleSelectColor = useCallback((colorName: string) => {
    if (feedback !== null || isPaused) return;
    playClick();

    const isCorrect = colorName === round.correctAnswer;
    setFeedback({ selected: colorName, isCorrect });

    if (isCorrect) {
      playCorrect();
      const nextScore = score + 1;
      setScore(nextScore);

      if (nextScore >= TARGET_STRIKES) {
        setTimeout(() => {
          onPass({ score: nextScore, target: TARGET_STRIKES });
        }, 500);
      } else {
        setTimeout(() => {
          setRound(generateRound(nextScore + 1));
          setFeedback(null);
        }, 400);
      }
    } else {
      playWrong();
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);

      if (newStrikes >= 3) {
        setTimeout(() => {
          onFail('3 Stroop Conflict Errors', { strikes: 3, score });
        }, 600);
      } else {
        setTimeout(() => {
          setRound(generateRound(score + 1));
          setFeedback(null);
        }, 600);
      }
    }
  }, [feedback, isPaused, round, score, strikes, onPass, onFail]);

  // Keyboard support 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (round.options[idx]) {
          handleSelectColor(round.options[idx].name);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [round, handleSelectColor]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-purple-400 font-mono text-xs">
          <Eye className="w-4 h-4" />
          <span>MATCHED: <strong className="text-slate-100">{score} / {TARGET_STRIKES}</strong></span>
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

      {/* Target Word Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${round.wordText}-${round.fontColor.name}-${score}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="w-full flex flex-col items-center mb-6"
        >
          {/* Directive Banner */}
          <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase mb-3 border ${
            round.mode === 'INK_COLOR' 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' 
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
          }`}>
            {round.mode === 'INK_COLOR' ? '👉 CHOOSE THE INK COLOR (Ignore Text)' : '⚠️ CHOOSE THE TEXT WORD (Ignore Ink)'}
          </div>

          <div className="w-full py-10 px-6 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border border-slate-700/80 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
            <span
              style={{ color: round.fontColor.cssColor }}
              className="text-5xl sm:text-6xl font-black font-['Orbitron'] tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {round.wordText}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Color Choices (4 options) */}
      <div className="grid grid-cols-2 gap-3.5 w-full">
        {round.options.map((option, idx) => {
          const isChosen = feedback?.selected === option.name;
          const isAnswer = option.name === round.correctAnswer;

          let cardStyle = 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-slate-500 hover:bg-slate-800/90';
          if (feedback) {
            if (isAnswer) {
              cardStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
            } else if (isChosen && !feedback.isCorrect) {
              cardStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
            } else {
              cardStyle = 'opacity-30 bg-slate-950 border-slate-800 text-slate-600';
            }
          }

          return (
            <motion.button
              key={option.name}
              onClick={() => handleSelectColor(option.name)}
              disabled={feedback !== null}
              whileHover={!feedback ? { scale: 1.02 } : {}}
              whileTap={!feedback ? { scale: 0.97 } : {}}
              className={`h-16 rounded-xl border flex items-center justify-between px-5 font-['Orbitron'] font-bold transition-all cursor-pointer ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 font-normal border border-slate-700 rounded px-1.5 py-0.5">
                  {idx + 1}
                </span>
                <div
                  style={{ backgroundColor: option.cssColor }}
                  className="w-4 h-4 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                />
                <span className="text-lg tracking-wider">{option.name}</span>
              </div>
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
