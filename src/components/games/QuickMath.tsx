import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, CheckCircle2, XCircle } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface Question {
  expression: string;
  answer: number;
  options: number[];
}

function generateMathQuestion(): Question {
  const types = ['mul_sub', 'div_add', 'mul_add', 'sub_add', 'div_mul'];
  const chosenType = types[Math.floor(Math.random() * types.length)];
  let expr = '';
  let ans = 0;

  switch (chosenType) {
    case 'mul_sub': {
      const a = Math.floor(Math.random() * 12) + 6; // 6 to 17
      const b = Math.floor(Math.random() * 5) + 2;  // 2 to 6
      const c = Math.floor(Math.random() * 15) + 3; // 3 to 17
      expr = `${a} × ${b} − ${c}`;
      ans = a * b - c;
      break;
    }
    case 'div_add': {
      const div = Math.floor(Math.random() * 7) + 3; // 3 to 9
      const quotient = Math.floor(Math.random() * 8) + 4; // 4 to 11
      const a = div * quotient;
      const b = Math.floor(Math.random() * 25) + 8;
      expr = `${a} ÷ ${div} + ${b}`;
      ans = quotient + b;
      break;
    }
    case 'mul_add': {
      const a = Math.floor(Math.random() * 9) + 4;
      const b = Math.floor(Math.random() * 7) + 3;
      const c = Math.floor(Math.random() * 20) + 5;
      expr = `${a} × ${b} + ${c}`;
      ans = a * b + c;
      break;
    }
    case 'sub_add': {
      const a = Math.floor(Math.random() * 40) + 40; // 40-80
      const b = Math.floor(Math.random() * 25) + 10;
      const c = Math.floor(Math.random() * 20) + 5;
      expr = `${a} − ${b} + ${c}`;
      ans = a - b + c;
      break;
    }
    default: {
      const div = Math.floor(Math.random() * 6) + 4;
      const quotient = Math.floor(Math.random() * 6) + 3;
      const a = div * quotient;
      const b = Math.floor(Math.random() * 5) + 2;
      expr = `${a} ÷ ${div} × ${b}`;
      ans = quotient * b;
      break;
    }
  }

  // Generate 3 unique distractors
  const distractors = new Set<number>();
  const deltas = [-3, 3, -10, 10, -2, 2, -5, 5, 1];
  for (const delta of deltas) {
    if (distractors.size >= 3) break;
    const fake = ans + delta;
    if (fake !== ans && fake >= 0) {
      distractors.add(fake);
    }
  }
  while (distractors.size < 3) {
    const fake = ans + Math.floor(Math.random() * 20) - 10;
    if (fake !== ans) distractors.add(fake);
  }

  const options = Array.from(distractors);
  options.push(ans);
  options.sort(() => Math.random() - 0.5);

  return { expression: expr, answer: ans, options };
}

const TARGET_SOLVED = 4;

export const QuickMath: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question>(generateMathQuestion);
  const [solvedCount, setSolvedCount] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [feedback, setFeedback] = useState<{ selected: number; isCorrect: boolean } | null>(null);

  const handleSelectOption = useCallback((option: number) => {
    if (feedback !== null || isPaused) return;
    playClick();

    const isCorrect = option === currentQuestion.answer;
    setFeedback({ selected: option, isCorrect });

    if (isCorrect) {
      playCorrect();
      const nextCount = solvedCount + 1;
      setSolvedCount(nextCount);

      if (nextCount >= TARGET_SOLVED) {
        setTimeout(() => {
          onPass({ solvedCount: nextCount, accuracy: '100%' });
        }, 600);
      } else {
        setTimeout(() => {
          setCurrentQuestion(generateMathQuestion());
          setFeedback(null);
        }, 500);
      }
    } else {
      playWrong();
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);

      if (newStrikes >= 3) {
        setTimeout(() => {
          onFail('3 Incorrect Solutions', { strikes: 3, solvedCount });
        }, 700);
      } else {
        setTimeout(() => {
          setCurrentQuestion(generateMathQuestion());
          setFeedback(null);
        }, 700);
      }
    }
  }, [feedback, isPaused, currentQuestion, solvedCount, strikes, onPass, onFail]);

  // Keyboard shortcut listener (1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion.options[idx] !== undefined) {
          handleSelectOption(currentQuestion.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, handleSelectOption]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Status */}
      <div className="flex items-center justify-between w-full mb-5 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Calculator className="w-4 h-4" />
          <span>PROGRESS: <strong className="text-slate-100">{solvedCount} / {TARGET_SOLVED}</strong></span>
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

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.expression}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="w-full flex flex-col items-center"
        >
          <div className="w-full py-8 px-6 mb-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-cyan-500/30 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-cyan-500/70 tracking-widest uppercase">
              COMPUTE KERNEL //
            </div>
            
            <span className="text-4xl sm:text-5xl font-black font-['Orbitron'] text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-200 to-teal-300 tracking-wider">
              {currentQuestion.expression} = ?
            </span>
          </div>

          {/* 4 Choices (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {currentQuestion.options.map((option, idx) => {
              const isChosen = feedback?.selected === option;
              const isAnswer = option === currentQuestion.answer;
              
              let btnStyle = 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-cyan-400 hover:bg-slate-800/90';
              if (feedback) {
                if (isAnswer) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
                } else if (isChosen && !feedback.isCorrect) {
                  btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-shake';
                } else {
                  btnStyle = 'opacity-40 bg-slate-950 border-slate-800 text-slate-500';
                }
              }

              return (
                <motion.button
                  key={option}
                  onClick={() => handleSelectOption(option)}
                  disabled={feedback !== null}
                  whileHover={!feedback ? { scale: 1.02 } : {}}
                  whileTap={!feedback ? { scale: 0.97 } : {}}
                  className={`h-16 rounded-xl border flex items-center justify-between px-5 font-['Orbitron'] text-xl font-bold transition-all relative cursor-pointer ${btnStyle}`}
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
