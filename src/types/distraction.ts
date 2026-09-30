export type DistractionId =
  | 'reaction-test'
  | 'memory-match'
  | 'quick-math'
  | 'color-trap'
  | 'pattern-puzzle'
  | 'odd-one-out'
  | 'simon-says'
  | 'trivia-blitz'
  | 'typing-challenge'
  | 'catch-object';

export type DistractionResultStatus = 'passed' | 'failed' | 'timeout';

export interface DistractionMeta {
  id: DistractionId;
  index: number;
  title: string;
  codename: string;
  category: 'Reflex' | 'Memory' | 'Cognitive' | 'Logic' | 'Speed';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  description: string;
  objective: string;
  icon: string;
  targetRequirement: string;
  estimatedSeconds: number;
}

/**
 * Standard callback result payload for all distraction challenges.
 */
export interface DistractionResult {
  distractionId: DistractionId;
  result: DistractionResultStatus;
  timeTaken: number; // Duration taken in seconds
  timeTakenSeconds?: number; // Alias for backward compatibility
  score?: number;
  metrics?: Record<string, string | number | boolean>;
  timestamp?: string;
  problemId?: number;
}

export type DistractionSuccessPayload = DistractionResult & { result: 'passed' };
export type DistractionFailurePayload = DistractionResult & { result: 'failed' };
export type DistractionTimeoutPayload = DistractionResult & { result: 'timeout' };

// Backwards-compatibility alias
export type DistractionResultPayload = DistractionResult;

export interface CommonGameProps {
  onPass: (metrics?: Record<string, string | number | boolean>) => void;
  onFail: (reason?: string, metrics?: Record<string, string | number | boolean>) => void;
  timeRemaining: number;
  isPaused: boolean;
  onUpdateScore?: (score: number) => void;
}
