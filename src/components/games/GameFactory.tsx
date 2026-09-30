import React from 'react';
import type { DistractionId, CommonGameProps } from '../../types/distraction';
import { ReactionTest } from './ReactionTest';
import { MemoryMatch } from './MemoryMatch';
import { QuickMath } from './QuickMath';
import { ColorTrap } from './ColorTrap';
import { PatternPuzzle } from './PatternPuzzle';
import { OddOneOut } from './OddOneOut';
import { SimonSays } from './SimonSays';
import { TriviaBlitz } from './TriviaBlitz';
import { TypingChallenge } from './TypingChallenge';
import { CatchObject } from './CatchObject';

interface GameFactoryProps extends CommonGameProps {
  distractionId: DistractionId;
}

export const GameFactory: React.FC<GameFactoryProps> = ({ distractionId, ...gameProps }) => {
  switch (distractionId) {
    case 'reaction-test':
      return <ReactionTest {...gameProps} />;
    case 'memory-match':
      return <MemoryMatch {...gameProps} />;
    case 'quick-math':
      return <QuickMath {...gameProps} />;
    case 'color-trap':
      return <ColorTrap {...gameProps} />;
    case 'pattern-puzzle':
      return <PatternPuzzle {...gameProps} />;
    case 'odd-one-out':
      return <OddOneOut {...gameProps} />;
    case 'simon-says':
      return <SimonSays {...gameProps} />;
    case 'trivia-blitz':
      return <TriviaBlitz {...gameProps} />;
    case 'typing-challenge':
      return <TypingChallenge {...gameProps} />;
    case 'catch-object':
      return <CatchObject {...gameProps} />;
    default:
      return (
        <div className="p-8 text-center text-rose-400 font-mono">
          Unknown distraction game module: {distractionId}
        </div>
      );
  }
};
