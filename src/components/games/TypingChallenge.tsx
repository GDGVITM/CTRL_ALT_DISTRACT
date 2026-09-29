import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

const CODE_PROMPTS = [
  'const bypassFirewall = async (token: string) => await verifyAuth(token);',
  'git commit -m "hotfix: override system disruption protocol" --no-verify',
  'export default function resolveCircuit(payload: Buffer): boolean;',
  'npm run build -- --filter=@ctrl-alt-one/core --production',
];

export const TypingChallenge: React.FC<CommonGameProps> = ({ onPass, onFail, isPaused }) => {
  const [targetText] = useState(() => CODE_PROMPTS[Math.floor(Math.random() * CODE_PROMPTS.length)]);
  const [typedText, setTypedText] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPaused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPaused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaused) return;
    const value = e.target.value;

    if (startTime === null) {
      setStartTime(performance.now());
    }

    // Only allow typing up to length of target
    if (value.length > targetText.length) return;

    // Check last character typed
    if (value.length > typedText.length) {
      const lastCharIndex = value.length - 1;
      if (value[lastCharIndex] === targetText[lastCharIndex]) {
        playClick();
      } else {
        playWrong();
        setMistakes((prev) => prev + 1);
      }
    }

    setTypedText(value);

    // Check if completed
    if (value.length === targetText.length) {
      const totalChars = targetText.length;
      let accurateChars = 0;
      for (let i = 0; i < totalChars; i++) {
        if (value[i] === targetText[i]) accurateChars++;
      }
      const accuracy = Math.round((accurateChars / totalChars) * 100);
      const elapsedSeconds = startTime ? (performance.now() - startTime) / 1000 : 5;
      const wpm = Math.round((totalChars / 5) / (elapsedSeconds / 60));

      if (accuracy >= 85) {
        playCorrect();
        setTimeout(() => {
          onPass({ accuracy: `${accuracy}%`, wpm, timeSeconds: Math.round(elapsedSeconds) });
        }, 600);
      } else {
        playWrong();
        setTimeout(() => {
          onFail(`Accuracy ${accuracy}% below required threshold (85%)`, { accuracy, wpm });
        }, 700);
      }
    }
  };

  // Metrics calculation
  const totalLength = targetText.length;
  const typedLength = typedText.length;
  const progressPercent = Math.round((typedLength / totalLength) * 100);
  
  let accurateCount = 0;
  for (let i = 0; i < typedLength; i++) {
    if (typedText[i] === targetText[i]) accurateCount++;
  }
  const currentAccuracy = typedLength > 0 ? Math.round((accurateCount / typedLength) * 100) : 100;

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2 cursor-text"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Terminal className="w-4 h-4" />
          <span>INJECTION PROGRESS: <strong className="text-slate-100">{progressPercent}%</strong></span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-emerald-400">ACCURACY: <strong>{currentAccuracy}%</strong></span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400">MISTAKES: <strong>{mistakes}</strong></span>
        </div>
      </div>

      {/* Terminal Code Box */}
      <div className="w-full p-6 rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden mb-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-500 ml-2">bash ~ injection-terminal</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/80">TARGET: ≥ 85% ACCURACY</span>
        </div>

        {/* Real-time Visual Character Stream */}
        <div className="font-mono text-base sm:text-lg leading-relaxed tracking-wide select-none min-h-[4.5rem]">
          {targetText.split('').map((char, index) => {
            const isTyped = index < typedLength;
            const isCurrent = index === typedLength;
            const isCorrect = isTyped && typedText[index] === char;
            const isWrong = isTyped && typedText[index] !== char;

            let charColor = 'text-slate-600';
            if (isCorrect) charColor = 'text-emerald-400 font-semibold bg-emerald-950/40 rounded-xs';
            if (isWrong) charColor = 'text-rose-400 bg-rose-950/80 underline font-bold rounded-xs';

            return (
              <span key={index} className={`relative ${charColor}`}>
                {isCurrent && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]"
                  />
                )}
                {char}
              </span>
            );
          })}
        </div>

        {/* Hidden Input for capturing actual typing */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleChange}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          className="opacity-0 absolute inset-0 cursor-default pointer-events-auto"
        />
      </div>

      <div className="w-full flex items-center justify-between text-slate-400 text-xs font-mono px-2">
        <span>Click anywhere to focus terminal</span>
        <span>{typedLength} / {totalLength} characters</span>
      </div>
    </div>
  );
};
