import { useState } from 'react';
import { DistractionModal } from './components/distractions/DistractionModal';
import type { DistractionId, DistractionResult } from './types/distraction';
import { DISTRACTIONS } from './utils/distractionRegistry';

export function App() {
  // Ordered list of distraction IDs
  const distractionOrder: DistractionId[] = [
    'reaction-test',
    'memory-match',
    'quick-math',
    'color-trap',
    'pattern-puzzle',
    'odd-one-out',
    'simon-says',
    'trivia-blitz',
    'typing-challenge',
    'catch-object',
  ];

  // Determine initial index from URL param or default to first
  const getInitialIndex = (): number => {
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('distraction') as DistractionId;
    const idx = distractionOrder.findIndex((id) => id === paramId);
    return idx >= 0 ? idx : 0;
  };

  const [currentIdx, setCurrentIdx] = useState<number>(getInitialIndex());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);

  const distractionId = distractionOrder[currentIdx];
  const hasNextChallenge = currentIdx < distractionOrder.length - 1;

  const handleComplete = (result: DistractionResult) => {
    console.log('[Distraction Complete]:', result);
  };

  const handleClose = () => {
    if (hasNextChallenge) {
      // Move to next distraction and keep modal open
      setCurrentIdx((prev) => prev + 1);
    } else {
      // No more challenges – close modal
      setIsModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex items-center justify-center relative overflow-hidden">
      {/* Ambient background atmosphere */}
      <div className="fixed inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Centered distraction modal */}
      <DistractionModal
        distractionId={distractionId}
        isOpen={isModalOpen}
        onComplete={handleComplete}
        onClose={handleClose}
        hasNextChallenge={hasNextChallenge}
      />
    </div>
  );
}

export default App;
