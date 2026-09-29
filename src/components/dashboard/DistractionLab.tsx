import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Play, 
  Volume2, 
  VolumeX, 
  Code2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  RotateCcw, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import { DEMO_PROBLEMS } from '../../utils/demoProblems';
import { DISTRACTIONS } from '../../utils/distractionRegistry';
import type { 
  DistractionId, 
  DistractionResult,
  DistractionSuccessPayload,
  DistractionFailurePayload,
  DistractionTimeoutPayload
} from '../../types/distraction';
import { Distraction } from '../distractions/Distraction';
import { setSoundMuted, getSoundMuted, playClick } from '../../utils/sound';

export const DistractionLab: React.FC = () => {
  // Current active problem index (1-based, 1 to 10)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(1);
  const [isDistractionActive, setIsDistractionActive] = useState(false);
  const [activeDistractionId, setActiveDistractionId] = useState<DistractionId>('reaction-test');

  const [isMuted, setIsMutedState] = useState(getSoundMuted());
  const [showApiModal, setShowApiModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Track results history for all 10 challenges
  const [historyResults, setHistoryResults] = useState<Record<number, DistractionResult | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
    8: null,
    9: null,
    10: null,
  });

  const [payloadLogs, setPayloadLogs] = useState<DistractionResult[]>([]);

  const currentProblem = DEMO_PROBLEMS[currentProblemIndex - 1] || DEMO_PROBLEMS[0];
  const [editorCode, setEditorCode] = useState(currentProblem.starterCode);

  // When problem index changes, update editor starter code
  const handleSelectProblem = (idx: number) => {
    playClick();
    setCurrentProblemIndex(idx);
    const prob = DEMO_PROBLEMS[idx - 1] || DEMO_PROBLEMS[0];
    setEditorCode(prob.starterCode);
  };

  // Submit Solution -> Triggers Distraction Takeover
  const handleSubmitSolution = () => {
    playClick();
    setActiveDistractionId(currentProblem.distractionId);
    setIsDistractionActive(true);
  };

  const handleSoundToggle = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setSoundMuted(next);
  };

  // Callbacks conforming to integration contract
  const handleSuccess = (payload: DistractionSuccessPayload) => {
    console.log('[DistractionModule] onSuccess:', payload);
    setHistoryResults((prev) => ({
      ...prev,
      [currentProblemIndex]: payload,
    }));
    setPayloadLogs((prev) => [payload, ...prev].slice(0, 30));
  };

  const handleFailure = (payload: DistractionFailurePayload) => {
    console.log('[DistractionModule] onFailure:', payload);
    setHistoryResults((prev) => ({
      ...prev,
      [currentProblemIndex]: payload,
    }));
    setPayloadLogs((prev) => [payload, ...prev].slice(0, 30));
  };

  const handleTimeout = (payload: DistractionTimeoutPayload) => {
    console.log('[DistractionModule] onTimeout:', payload);
    setHistoryResults((prev) => ({
      ...prev,
      [currentProblemIndex]: payload,
    }));
    setPayloadLogs((prev) => [payload, ...prev].slice(0, 30));
  };

  // When participant closes result screen -> Advance to next problem!
  const handleCloseDistraction = () => {
    setIsDistractionActive(false);
    if (currentProblemIndex < 10) {
      const nextIdx = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIdx);
      setEditorCode(DEMO_PROBLEMS[nextIdx - 1].starterCode);
    }
  };

  const handleResetTournament = () => {
    playClick();
    setCurrentProblemIndex(1);
    setIsDistractionActive(false);
    setEditorCode(DEMO_PROBLEMS[0].starterCode);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Stats
  const totalAttempted = Object.values(historyResults).filter(Boolean).length;
  const passedCount = Object.values(historyResults).filter((r) => r?.result === 'passed').length;
  const isTournamentCompleted = totalAttempted === 10 && !isDistractionActive;

  const nextProblemIndex = currentProblemIndex < 10 ? currentProblemIndex + 1 : undefined;

  const reactIntegrationCode = `import React, { useState } from 'react';
import { DistractionOverlay } from './components/distractions';
import type { 
  DistractionId, 
  DistractionSuccessPayload, 
  DistractionFailurePayload, 
  DistractionTimeoutPayload 
} from './types/distraction';

export function CodingMatchScreen() {
  const [activeDistraction, setActiveDistraction] = useState<DistractionId | null>(null);

  // Triggered when participant submits or during random ambush
  const handleProblemSubmitted = (distractionId: DistractionId) => {
    setActiveDistraction(distractionId);
  };

  return (
    <div>
      {/* 1. Main Competitive Coding Platform (Parent Frontend) */}
      <CodingWorkspace onSubmit={() => handleProblemSubmitted('reaction-test')} />

      {/* 2. Reusable Distraction Takeover Overlay */}
      {activeDistraction && (
        <DistractionOverlay
          distractionId={activeDistraction}
          timeLimit={120} // 2-minute countdown
          onSuccess={({ distractionId, result, timeTaken }) => {
            console.log(\`✅ \${distractionId} PASSED in \${timeTaken}s\`);
            // Resume candidate's coding workspace & award tournament points
          }}
          onFailure={({ distractionId, result, timeTaken }) => {
            console.log(\`❌ \${distractionId} FAILED in \${timeTaken}s\`);
            // Void problem points or apply penalty
          }}
          onTimeout={({ distractionId, result, timeTaken }) => {
            console.log(\`⏱️ \${distractionId} TIMED OUT after \${timeTaken}s\`);
            // 0 points awarded for coding problem
          }}
          onClose={() => setActiveDistraction(null)}
        />
      )}
    </div>
  );
}`;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Top Tournament Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#070a12]/95 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-8 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Orbitron'] font-black text-lg sm:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-teal-300">
                  CTRL ALT ONE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                  EVENT DEMO FLOW
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                Coding Problem → Submit Solution → Unskippable Distraction → Next Problem
              </p>
            </div>
          </div>

          {/* Sequential Progress Indicators & Jump Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Problem Progress Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs">
              <span className="text-slate-400 uppercase text-[10px]">CURRENT:</span>
              <span className="text-cyan-400 font-bold font-['Orbitron']">
                PROBLEM {String(currentProblemIndex).padStart(2, '0')} / 10
              </span>
            </div>

            {/* Distraction Mapping Tag */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>AMBUSH: <strong>{currentProblem.distractionName}</strong></span>
            </div>

            {/* Quick Problem Jumper Selector */}
            <select
              value={currentProblemIndex}
              onChange={(e) => handleSelectProblem(Number(e.target.value))}
              className="bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer hover:border-cyan-400"
              title="Jump directly to any of the 10 problems to test specific distractions"
            >
              {DEMO_PROBLEMS.map((prob) => (
                <option key={prob.id} value={prob.id} className="bg-slate-950 text-slate-200">
                  P#{prob.id}: {prob.distractionName}
                </option>
              ))}
            </select>

            {/* Sound Toggle */}
            <button
              onClick={handleSoundToggle}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              }`}
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Integration API Inspector */}
            <button
              onClick={() => setShowApiModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Integration Contract ({payloadLogs.length})</span>
            </button>

            {/* Games Catalog Quick Reference */}
            <button
              onClick={() => setShowCatalogModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>All 10 Games</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tournament Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 flex flex-col space-y-4">
        {/* Environment Notice Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>EVENT SIMULATION:</strong> You are currently on <strong>Problem #{currentProblemIndex}</strong>. Click <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">[ SUBMIT SOLUTION ]</strong> to trigger the unskippable distraction takeover!
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Tournament Score: <strong className="text-emerald-400">{passedCount * 100} PTS</strong> ({passedCount}/{totalAttempted} Passed)
            </span>
          </div>
        </div>

        {/* 10 Problem Sequential Progress Bar */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {DEMO_PROBLEMS.map((prob) => {
            const isCurrent = prob.id === currentProblemIndex;
            const res = historyResults[prob.id];
            const isPassed = res?.result === 'passed';
            const isFailed = res?.result === 'failed' || res?.result === 'timeout';

            let pillStyle = 'bg-slate-900/80 border-slate-800 text-slate-500';
            if (isCurrent) {
              pillStyle = 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-bold';
            } else if (isPassed) {
              pillStyle = 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400';
            } else if (isFailed) {
              pillStyle = 'bg-rose-950/60 border-rose-500/60 text-rose-400';
            }

            return (
              <button
                key={prob.id}
                onClick={() => handleSelectProblem(prob.id)}
                className={`py-2 px-1 rounded-xl border text-center font-mono text-xs transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${pillStyle}`}
                title={`Problem #${prob.id}: ${prob.title} (Triggers: ${prob.distractionName})`}
              >
                <div className="flex items-center gap-1">
                  <span>P#{prob.id}</span>
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isFailed && <XCircle className="w-3 h-3 text-rose-400" />}
                </div>
                <span className="text-[9px] truncate max-w-full opacity-70">
                  {prob.distractionName.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tournament Completed Banner if all 10 done */}
        {isTournamentCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)] flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-['Orbitron'] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>ALL 10 TOURNAMENT PROBLEMS & DISTRACTIONS COMPLETED!</span>
              </div>
              <p className="text-slate-300 text-xs font-mono mt-1">
                You tested all 10 challenges. Score: {passedCount} / 10 Passed ({passedCount * 100} Total Tournament Points).
              </p>
            </div>

            <button
              onClick={handleResetTournament}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-['Orbitron'] font-bold text-xs tracking-wider flex items-center gap-2 hover:brightness-110 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART EVENT DEMO</span>
            </button>
          </motion.div>
        )}

        {/* Coding Workspace Container (DEMO BACKGROUND) */}
        {/* Notice: When isDistractionActive is true, this entire section is dimmed, blurred, and pointer-events-none */}
        <div
          className={`flex-1 rounded-2xl border border-slate-800 bg-[#080b12] shadow-2xl flex flex-col overflow-hidden transition-all duration-500 min-h-[520px] ${
            isDistractionActive ? 'filter blur-[3px] opacity-40 scale-[0.99] pointer-events-none select-none' : ''
          }`}
        >
          {/* Workspace Top Bar */}
          <div className="px-4 py-2.5 bg-[#06080e] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                solution.ts — Problem {currentProblemIndex} of 10
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Round Clock: <strong>42:18</strong></span>
              </div>

              {/* Primary Submit Button */}
              <button
                onClick={handleSubmitSolution}
                disabled={isDistractionActive}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-slate-950 font-['Orbitron'] font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition cursor-pointer animate-pulse"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>SUBMIT SOLUTION</span>
              </button>
            </div>
          </div>

          {/* 2-Column Problem Statement & Code Editor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
            {/* Left Column: Problem Brief */}
            <div className="md:col-span-5 p-5 border-r border-slate-800/80 bg-[#070910] text-xs font-sans text-slate-300 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
                    PROBLEM #{currentProblemIndex}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    currentProblem.difficulty === 'EASY' 
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : currentProblem.difficulty === 'MEDIUM'
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {currentProblem.difficulty}
                  </span>
                </div>
                <span className="text-amber-400 font-mono text-xs font-bold">{currentProblem.points} PTS</span>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold font-['Orbitron'] text-slate-100 mb-1">
                  {currentProblem.title}
                </h2>
                <span className="text-[11px] font-mono text-slate-500">Category: {currentProblem.category}</span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">
                {currentProblem.description}
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-[11px] space-y-1">
                  <div className="text-slate-500">Input: <span className="text-cyan-300">{currentProblem.inputExample}</span></div>
                  <div className="text-slate-500">Output: <span className="text-emerald-400">{currentProblem.outputExample}</span></div>
                  <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-800/60">
                    Explanation: {currentProblem.explanation}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400 animate-pulse" />
                <span>
                  <strong>DISRUPTION DETECTOR ACTIVE:</strong> Submitting solution will trigger unscheduled <strong className="text-white">Challenge #{currentProblemIndex}: {currentProblem.distractionName}</strong>.
                </span>
              </div>
            </div>

            {/* Right Column: Code Editor */}
            <div className="md:col-span-7 p-4 bg-[#080b12] flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-500">
                <span className="text-cyan-400 font-semibold">TypeScript (ES2022)</span>
                <span>Auto-saved • UTF-8</span>
              </div>

              <textarea
                value={editorCode}
                onChange={(e) => setEditorCode(e.target.value)}
                disabled={isDistractionActive}
                spellCheck={false}
                className="w-full flex-1 bg-transparent text-cyan-200 outline-none resize-none font-mono leading-relaxed selection:bg-cyan-500/30 min-h-[300px]"
              />

              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-emerald-400 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3 / 3 Test Cases Passed Locally</span>
                </div>

                <button
                  onClick={handleSubmitSolution}
                  disabled={isDistractionActive}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Submit & Advance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* UNSKIPPABLE DISTRACTION TAKEOVER OVERLAY */}
      {isDistractionActive && (
        <Distraction
          isOpen={isDistractionActive}
          distractionId={activeDistractionId}
          timeLimit={120} // 2-minute countdown
          onSuccess={handleSuccess}
          onFailure={handleFailure}
          onTimeout={handleTimeout}
          onClose={handleCloseDistraction}
          nextProblemIndex={nextProblemIndex}
          problemId={currentProblemIndex}
          showDevControls={true}
        />
      )}

      {/* Integration API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#090d16] border border-cyan-500/40 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-cyan-400 font-['Orbitron'] font-bold text-sm">
                <Code2 className="w-5 h-5" />
                <span>FRONTEND INTEGRATION CONTRACT & LIVE LOGS</span>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 font-mono text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold">Reusable Component Snippet:</span>
                  <button
                    onClick={() => handleCopyCode(reactIntegrationCode)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-cyan-200 text-[11px] overflow-x-auto leading-relaxed">
                  <pre>{reactIntegrationCode}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-slate-300 font-bold block">Live Dispatched Callbacks in this Session ({payloadLogs.length}):</span>
                {payloadLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 text-center">
                    No callbacks recorded yet. Submit any problem to trigger the distraction and record live callback payloads!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {payloadLogs.map((log, index) => (
                      <div key={index} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-cyan-400">{log.distractionId}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.result === 'passed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {log.result} ({log.timeTaken}s)
                          </span>
                        </div>
                        <pre className="text-slate-300 text-[10.5px] overflow-x-auto">
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All 10 Games Quick Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#090d16] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-cyan-400 font-['Orbitron'] font-bold text-sm">
                <Layers className="w-5 h-5" />
                <span>THE 10 SEQUENTIAL DISTRACTION CHALLENGES</span>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {DISTRACTIONS.map((game) => (
                <div
                  key={game.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        PROBLEM #{game.index} → CHALLENGE #{game.index}
                      </span>
                      <h4 className="text-sm font-bold font-['Orbitron'] text-slate-100">
                        {game.title}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                      {game.category}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs line-clamp-2 mb-3">
                    {game.description}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">Target: {game.targetRequirement}</span>
                    <button
                      onClick={() => {
                        setShowCatalogModal(false);
                        handleSelectProblem(game.index);
                        setActiveDistractionId(game.id);
                        setIsDistractionActive(true);
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Test Game</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
