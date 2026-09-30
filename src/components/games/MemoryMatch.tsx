import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  ShieldCheck, 
  KeyRound, 
  Terminal, 
  Radio, 
  Binary, 
  Sparkles,
  Eye
} from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong } from '../../utils/sound';

interface CardItem {
  id: number;
  pairId: number;
  label: string;
  iconName: string;
  color: string;
}

const ICONS_CONFIG = [
  { pairId: 1, label: 'Quantum Chip', iconName: 'Cpu', color: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10' },
  { pairId: 2, label: 'Firewall', iconName: 'ShieldCheck', color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' },
  { pairId: 3, label: 'Cyber Key', iconName: 'KeyRound', color: 'text-amber-400 border-amber-500/50 bg-amber-500/10' },
  { pairId: 4, label: 'Terminal Node', iconName: 'Terminal', color: 'text-purple-400 border-purple-500/50 bg-purple-500/10' },
  { pairId: 5, label: 'Radar Beacon', iconName: 'Radio', color: 'text-rose-400 border-rose-500/50 bg-rose-500/10' },
  { pairId: 6, label: 'Binary Core', iconName: 'Binary', color: 'text-blue-400 border-blue-500/50 bg-blue-500/10' },
];

function renderCardIcon(iconName: string, className = 'w-7 h-7') {
  switch (iconName) {
    case 'Cpu': return <Cpu className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'KeyRound': return <KeyRound className={className} />;
    case 'Terminal': return <Terminal className={className} />;
    case 'Radio': return <Radio className={className} />;
    case 'Binary': return <Binary className={className} />;
    default: return <Sparkles className={className} />;
  }
}

export const MemoryMatch: React.FC<CommonGameProps> = ({ onPass, isPaused }) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isPeeking, setIsPeeking] = useState(true);
  const [lockBoard, setLockBoard] = useState(false);

  // Initialize and shuffle cards
  useEffect(() => {
    const rawList: CardItem[] = [];
    let idCounter = 1;
    
    ICONS_CONFIG.forEach((config) => {
      // Create 2 of each
      rawList.push({
        id: idCounter++,
        pairId: config.pairId,
        label: config.label,
        iconName: config.iconName,
        color: config.color,
      });
      rawList.push({
        id: idCounter++,
        pairId: config.pairId,
        label: config.label,
        iconName: config.iconName,
        color: config.color,
      });
    });

    // Fisher-Yates shuffle
    for (let i = rawList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawList[i], rawList[j]] = [rawList[j], rawList[i]];
    }

    setCards(rawList);
    setIsPeeking(true);

    // Initial peek time: 1.5s
    const timer = setTimeout(() => {
      setIsPeeking(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleCardClick = useCallback((clickedCard: CardItem) => {
    if (lockBoard || isPeeking || isPaused) return;
    if (flippedIds.includes(clickedCard.id)) return;
    if (matchedPairIds.includes(clickedCard.pairId)) return;

    playClick();

    if (flippedIds.length === 0) {
      setFlippedIds([clickedCard.id]);
    } else if (flippedIds.length === 1) {
      const firstId = flippedIds[0];
      const firstCard = cards.find((c) => c.id === firstId);
      
      setFlippedIds([firstId, clickedCard.id]);
      setMoves((prev) => prev + 1);

      if (firstCard && firstCard.pairId === clickedCard.pairId) {
        // MATCH!
        playCorrect();
        const newMatched = [...matchedPairIds, clickedCard.pairId];
        setMatchedPairIds(newMatched);
        setFlippedIds([]);

        if (newMatched.length === ICONS_CONFIG.length) {
          setTimeout(() => {
            onPass({ moves: moves + 1, matchedPairs: 6 });
          }, 800);
        }
      } else {
        // MISMATCH
        playWrong();
        setLockBoard(true);
        setTimeout(() => {
          setFlippedIds([]);
          setLockBoard(false);
        }, 850);
      }
    }
  }, [lockBoard, isPeeking, isPaused, flippedIds, matchedPairIds, cards, moves, onPass]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Game Bar */}
      <div className="flex items-center justify-between w-full mb-4 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2">
          {isPeeking ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-mono text-xs animate-pulse">
              <Eye className="w-3.5 h-3.5" /> MEMORY PEEK (MEMORIZE POSITIONS)...
            </span>
          ) : (
            <span className="text-slate-400 font-mono text-xs">
              MATCHED: <strong className="text-cyan-400 font-bold">{matchedPairIds.length} / 6</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-slate-400">MOVES: <span className="text-slate-200 font-semibold">{moves}</span></span>
        </div>
      </div>

      {/* 3x4 Card Grid */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {cards.map((card) => {
          const isFlipped = isPeeking || flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId);
          const isMatched = matchedPairIds.includes(card.pairId);

          return (
            <motion.div
              key={card.id}
              whileHover={!isFlipped ? { scale: 1.04 } : {}}
              whileTap={!isFlipped ? { scale: 0.96 } : {}}
              onClick={() => handleCardClick(card)}
              className="h-24 sm:h-28 rounded-xl cursor-pointer perspective-1000 relative select-none"
            >
              <div
                className={`w-full h-full rounded-xl transition-transform duration-500 transform-style-preserve-3d relative ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front (Hidden Face) */}
                <div className="absolute inset-0 backface-hidden rounded-xl bg-slate-900/90 border border-slate-700/60 hover:border-cyan-500/50 flex flex-col items-center justify-center shadow-lg transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">?</span>
                </div>

                {/* Back (Revealed Face) */}
                <div
                  className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl flex flex-col items-center justify-center p-2 border transition-all ${
                    isMatched
                      ? 'bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-800/90 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${card.color} mb-1`}>
                    {renderCardIcon(card.iconName, 'w-6 h-6')}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-300 text-center truncate w-full px-1">
                    {card.label}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
