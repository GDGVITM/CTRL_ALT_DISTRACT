import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  tag: string;
}

const TRIVIA_POOL: TriviaQuestion[] = [
  {
    id: 1,
    question: 'Which data structure enforces a Last-In, First-Out (LIFO) order?',
    options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
    answer: 'Stack',
    explanation: 'Stacks use push/pop operations to access items in LIFO order.',
    tag: 'Data Structures',
  },
  {
    id: 2,
    question: 'What was the literal insect found in the Harvard Mark II computer in 1947?',
    options: ['Moth', 'Beetle', 'Ant', 'Cockroach'],
    answer: 'Moth',
    explanation: 'Grace Hopper and team taped a moth into the logbook, coining "debugging".',
    tag: 'CS History',
  },
  {
    id: 3,
    question: 'What is the standard port number used for secure HTTPS connections?',
    options: ['80', '22', '443', '8080'],
    answer: '443',
    explanation: 'Port 443 is universally dedicated for HTTP over TLS/SSL (HTTPS).',
    tag: 'Networking',
  },
  {
    id: 4,
    question: 'What is the average time complexity of a hash table lookup?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    answer: 'O(1)',
    explanation: 'With a uniform hash function, dictionary/hash lookups operate in O(1) constant time.',
    tag: 'Algorithms',
  },
  {
    id: 5,
    question: 'Who created the Git version control system and the Linux kernel?',
    options: ['Linus Torvalds', 'Dennis Ritchie', 'Ken Thompson', 'Bjarne Stroustrup'],
    answer: 'Linus Torvalds',
    explanation: 'Linus Torvalds created Linux in 1991 and Git in 2005.',
    tag: 'Open Source',
  },
  {
    id: 6,
    question: 'What does the HTTP status code 418 represent?',
    options: ["I'm a teapot", 'Gateway Timeout', 'Payload Too Large', 'Unprocessable Entity'],
    answer: "I'm a teapot",
    explanation: 'RFC 2324 defined 418 as an April Fools joke for the Hyper Text Coffee Pot Control Protocol.',
    tag: 'Web Protocols',
  },
];

const TOTAL_QUESTIONS = 5;
const REQUIRED_CORRECT = 4;

export const TriviaBlitz: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [questions] = useState(() => [...TRIVIA_POOL].sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<{ selected: string; isCorrect: boolean } | null>(null);

  const currentQ = questions[currentIndex];

  const handleSelectOption = useCallback((option: string) => {
    if (feedback !== null || isPaused) return;
    playClick();

    const isCorrect = option === currentQ.answer;
    setFeedback({ selected: option, isCorrect });

    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const newWrong = !isCorrect ? wrongCount + 1 : wrongCount;

    if (isCorrect) {
      playCorrect();
      setCorrectCount(newCorrect);
    } else {
      playWrong();
      setWrongCount(newWrong);
    }

    setTimeout(() => {
      if (currentIndex + 1 >= TOTAL_QUESTIONS) {
        // Finished all 5 questions
        if (newCorrect >= REQUIRED_CORRECT) {
          onPass({ score: newCorrect, total: TOTAL_QUESTIONS, accuracy: `${(newCorrect / TOTAL_QUESTIONS) * 100}%` });
        } else {
          onFail(`Score ${newCorrect}/${TOTAL_QUESTIONS} below pass threshold (${REQUIRED_CORRECT}/${TOTAL_QUESTIONS})`, {
            score: newCorrect,
            total: TOTAL_QUESTIONS,
          });
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setFeedback(null);
      }
    }, 900);
  }, [feedback, isPaused, currentQ, correctCount, wrongCount, currentIndex, onPass, onFail]);

  // Keyboard 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (currentQ.options[idx]) {
          handleSelectOption(currentQ.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, handleSelectOption]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <HelpCircle className="w-4 h-4" />
          <span>QUESTION: <strong className="text-slate-100">{currentIndex + 1} / {TOTAL_QUESTIONS}</strong></span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-emerald-400">CORRECT: <strong>{correctCount}</strong></span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">TARGET: <strong>≥ {REQUIRED_CORRECT}</strong></span>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="w-full flex flex-col items-center mb-5"
        >
          <div className="w-full py-6 px-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)] relative">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-semibold">
                {currentQ.tag}
              </span>
              <span className="text-slate-500 text-xs font-mono">Q#{currentIndex + 1}</span>
            </div>

            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 leading-snug">
              {currentQ.question}
            </h3>

            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono text-cyan-300/90"
              >
                💡 {currentQ.explanation}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 4 Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {currentQ.options.map((option, idx) => {
          const isChosen = feedback?.selected === option;
          const isAnswer = option === currentQ.answer;

          let btnClass = 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-cyan-400 hover:bg-slate-800/90';
          if (feedback) {
            if (isAnswer) {
              btnClass = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            } else if (isChosen && !feedback.isCorrect) {
              btnClass = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
            } else {
              btnClass = 'opacity-30 bg-slate-950 border-slate-800 text-slate-600';
            }
          }

          return (
            <motion.button
              key={option}
              onClick={() => handleSelectOption(option)}
              disabled={feedback !== null}
              whileHover={!feedback ? { scale: 1.02 } : {}}
              whileTap={!feedback ? { scale: 0.98 } : {}}
              className={`min-h-[3.75rem] py-3 px-4 rounded-xl border flex items-center justify-between text-left font-medium transition-all cursor-pointer ${btnClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 font-normal border border-slate-700 rounded px-1.5 py-0.5 shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm sm:text-base leading-snug">{option}</span>
              </div>
              <div className="w-5 shrink-0 flex justify-end">
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
