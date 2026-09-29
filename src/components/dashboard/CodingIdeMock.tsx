import React, { useState } from 'react';
import { Play, Code2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CodingIdeMockProps {
  onTriggerDistraction: (problemIndex: number) => void;
  activeProblemIndex: number;
}

const SAMPLE_CODE = `function findLongestSubstring(s: string): number {
  let maxLength = 0;
  let left = 0;
  const charMap = new Map<string, number>();

  for (let right = 0; right < s.length; right++) {
    const currentChar = s[right];
    if (charMap.has(currentChar) && charMap.get(currentChar)! >= left) {
      left = charMap.get(currentChar)! + 1;
    }
    charMap.set(currentChar, right);
    maxLength = Math.max(maxLength, right - left + 1);
  }

  return maxLength;
}

// Running test harness...
console.log(findLongestSubstring("abcabcbb")); // Expected: 3`;

export const CodingIdeMock: React.FC<CodingIdeMockProps> = ({
  onTriggerDistraction,
  activeProblemIndex,
}) => {
  const [codeText, setCodeText] = useState(SAMPLE_CODE);

  return (
    <div className="w-full bg-[#0a0d16] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[460px]">
      {/* IDE Topbar */}
      <div className="px-4 py-2.5 bg-[#070a10] border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            solution.ts — Problem {activeProblemIndex} / 10
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTriggerDistraction(activeProblemIndex)}
            className="px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/50 text-rose-400 hover:bg-rose-500/25 flex items-center gap-1.5 transition font-bold cursor-pointer animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>TRIGGER DISRUPTION AMBUSH</span>
          </button>

          <button className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Tests</span>
          </button>
        </div>
      </div>

      {/* Editor & Problem Statement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
        {/* Left Column: Problem Brief */}
        <div className="md:col-span-5 p-5 border-r border-slate-800/80 bg-[#080b12] text-xs font-sans text-slate-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold">
              ROUND 1
            </span>
            <span className="text-slate-500 font-mono text-[11px]">100 PTS</span>
          </div>

          <h3 className="text-base font-bold font-['Orbitron'] text-slate-100 mb-2">
            Problem #{activeProblemIndex}: Longest Substring Without Repeating Characters
          </h3>

          <p className="text-slate-400 mb-3 leading-relaxed">
            Given a string <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">s</code>, find the length of the longest substring without duplicate characters.
          </p>

          <div className="space-y-2 mb-4">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-500 block">Input: s = "abcabcbb"</span>
              <span className="text-emerald-400">Output: 3</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>ATTENTION PARTICIPANT:</strong> Unscheduled disruption protocols will intercept this terminal at random intervals.
            </span>
          </div>
        </div>

        {/* Right Column: Code Editor */}
        <div className="md:col-span-7 p-4 bg-[#090d16] flex flex-col font-mono text-xs">
          <textarea
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            spellCheck={false}
            className="w-full flex-1 bg-transparent text-cyan-200 outline-none resize-none font-mono leading-relaxed selection:bg-cyan-500/30"
          />

          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>TypeScript 5.3 • UTF-8</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Test Cases: 3/3 Passing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
