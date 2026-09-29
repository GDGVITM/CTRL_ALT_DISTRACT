import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Sparkles, Zap } from 'lucide-react';
import type { CommonGameProps } from '../../types/distraction';
import { playClick, playCorrect, playWrong, playTone } from '../../utils/sound';

interface TargetNode {
  id: number;
  x: number; // percentage 10% - 85%
  y: number; // percentage 15% - 80%
  size: number;
  type: 'standard' | 'golden';
  points: number;
  durationMs: number;
}

const TARGET_GOAL = 8;

export const CatchObject: React.FC<CommonGameProps> = ({ onPass, isPaused }) => {
  const [caughtCount, setCaughtCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [activeNodes, setActiveNodes] = useState<TargetNode[]>([]);
  const nextIdRef = useRef(1);
  const missedCountRef = useRef(0);
  const [missedState, setMissedState] = useState(0);

  const spawnNode = useCallback(() => {
    if (isPaused) return;

    const id = nextIdRef.current++;
    const isGolden = Math.random() < 0.25;
    const x = Math.floor(Math.random() * 75) + 10;
    const y = Math.floor(Math.random() * 65) + 15;
    const durationMs = isGolden ? 1300 : 1800;

    const newNode: TargetNode = {
      id,
      x,
      y,
      size: isGolden ? 56 : 64,
      type: isGolden ? 'golden' : 'standard',
      points: isGolden ? 2 : 1,
      durationMs,
    };

    setActiveNodes((prev) => [...prev.slice(-3), newNode]);

    // Timer to expire node if not clicked
    setTimeout(() => {
      setActiveNodes((current) => {
        const found = current.find((n) => n.id === id);
        if (found) {
          missedCountRef.current++;
          setMissedState(missedCountRef.current);
          setCombo(0);
          return current.filter((n) => n.id !== id);
        }
        return current;
      });
    }, durationMs);
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) return;

    spawnNode();
    const interval = setInterval(() => {
      spawnNode();
    }, 1100);

    return () => clearInterval(interval);
  }, [isPaused, spawnNode]);

  const handleNodeClick = (node: TargetNode, e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    playTone(node.type === 'golden' ? 987 : 784, 'sine', 0.1, 0.15);

    setActiveNodes((prev) => prev.filter((n) => n.id !== node.id));

    const nextCaught = caughtCount + node.points;
    setCaughtCount(nextCaught);
    setCombo((c) => c + 1);

    if (nextCaught >= TARGET_GOAL) {
      playCorrect();
      setTimeout(() => {
        onPass({ caught: nextCaught, goal: TARGET_GOAL, maxCombo: combo + 1 });
      }, 500);
    }
  };

  const handleMissClick = () => {
    if (isPaused) return;
    playWrong();
    setCombo(0);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full mb-3 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
          <Radio className="w-4 h-4" />
          <span>INTERCEPTED: <strong className="text-slate-100">{caughtCount} / {TARGET_GOAL}</strong></span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          {combo > 1 && (
            <span className="text-amber-400 font-bold animate-bounce">
              🔥 {combo}x COMBO
            </span>
          )}
          <span className="text-slate-400">EXPIRED: <span className="text-slate-200">{missedState}</span></span>
        </div>
      </div>

      {/* Interactive Radar Arena */}
      <div
        onClick={handleMissClick}
        className="w-full h-80 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border border-cyan-500/30 relative overflow-hidden cursor-crosshair shadow-[0_0_30px_rgba(6,182,212,0.15)] select-none"
      >
        {/* Radar Background Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-64 h-64 rounded-full border border-cyan-400" />
          <div className="w-44 h-44 rounded-full border border-cyan-400 absolute" />
          <div className="w-24 h-24 rounded-full border border-cyan-400 absolute" />
          <div className="w-full h-[1px] bg-cyan-400 absolute" />
          <div className="h-full w-[1px] bg-cyan-400 absolute" />
        </div>

        {/* Active Catch Nodes */}
        <AnimatePresence>
          {activeNodes.map((node) => {
            const isGolden = node.type === 'golden';

            return (
              <motion.button
                key={node.id}
                onClick={(e) => handleNodeClick(node, e)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: `${node.size}px`,
                  height: `${node.size}px`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer transition-transform active:scale-90 ${
                  isGolden
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.8)] text-slate-950'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.8)] text-white'
                }`}
              >
                {/* Expiring circular countdown ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="44%"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    className="opacity-40"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="44%"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 100 }}
                    transition={{ duration: node.durationMs / 1000, ease: 'linear' }}
                  />
                </svg>

                {isGolden ? <Sparkles className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 animate-pulse" />}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="text-slate-400 text-xs font-mono mt-2 tracking-wider">
        TAP NODES BEFORE TIMEOUT // GOLDEN NODES = +2 POINTS
      </p>
    </div>
  );
};
