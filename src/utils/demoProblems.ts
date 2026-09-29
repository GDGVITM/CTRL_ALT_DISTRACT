import type { DistractionId } from '../types/distraction';

export interface DemoCodingProblem {
  id: number;
  title: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  description: string;
  inputExample: string;
  outputExample: string;
  explanation: string;
  starterCode: string;
  distractionId: DistractionId;
  distractionName: string;
}

export const DEMO_PROBLEMS: DemoCodingProblem[] = [
  {
    id: 1,
    title: 'Two Sum Array Intercept',
    category: 'Array & Hash Map',
    difficulty: 'EASY',
    points: 100,
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    inputExample: 'nums = [2, 7, 11, 15], target = 9',
    outputExample: '[0, 1]',
    explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    distractionId: 'reaction-test',
    distractionName: 'Reaction Test',
    starterCode: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
  },
  {
    id: 2,
    title: 'Longest Substring Without Repeating Characters',
    category: 'Sliding Window',
    difficulty: 'MEDIUM',
    points: 150,
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    inputExample: 's = "abcabcbb"',
    outputExample: '3',
    explanation: 'The answer is "abc", with the length of 3.',
    distractionId: 'memory-match',
    distractionName: 'Memory Match',
    starterCode: `function lengthOfLongestSubstring(s: string): number {
  let maxLength = 0;
  let left = 0;
  const seen = new Map<string, number>();

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (seen.has(char) && seen.get(char)! >= left) {
      left = seen.get(char)! + 1;
    }
    seen.set(char, right);
    maxLength = Math.max(maxLength, right - left + 1);
  }
  return maxLength;
}`,
  },
  {
    id: 3,
    title: 'Evaluate Reverse Polish Notation',
    category: 'Stack & Arithmetic',
    difficulty: 'MEDIUM',
    points: 150,
    description: 'Evaluate the value of an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, *, and /.',
    inputExample: 'tokens = ["2", "1", "+", "3", "*"]',
    outputExample: '9',
    explanation: '((2 + 1) * 3) = 9',
    distractionId: 'quick-math',
    distractionName: 'Quick Math',
    starterCode: `function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
  for (const token of tokens) {
    if (['+', '-', '*', '/'].includes(token)) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      if (token === '+') stack.push(a + b);
      else if (token === '-') stack.push(a - b);
      else if (token === '*') stack.push(a * b);
      else if (token === '/') stack.push(Math.trunc(a / b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack.pop()!;
}`,
  },
  {
    id: 4,
    title: 'Word Break & Syntax Tokenization',
    category: 'Dynamic Programming',
    difficulty: 'HARD',
    points: 200,
    description: 'Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of dictionary words.',
    inputExample: 's = "leetcode", wordDict = ["leet", "code"]',
    outputExample: 'true',
    explanation: 'Return true because "leetcode" can be segmented as "leet code".',
    distractionId: 'color-trap',
    distractionName: 'Color Trap',
    starterCode: `function wordBreak(s: string, wordDict: string[]): boolean {
  const words = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.substring(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[s.length];
}`,
  },
  {
    id: 5,
    title: 'Fibonacci Matrix Exponentiation',
    category: 'Matrix & Math Logic',
    difficulty: 'MEDIUM',
    points: 150,
    description: 'Compute the nth Fibonacci number modulo 1,000,000,007 using 2x2 matrix binary exponentiation in O(log n) time.',
    inputExample: 'n = 10',
    outputExample: '55',
    explanation: 'F(10) = 55 in standard sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55.',
    distractionId: 'pattern-puzzle',
    distractionName: 'Pattern Puzzle',
    starterCode: `function fibMatrix(n: number): number {
  if (n <= 1) return n;
  let M = [[1, 1], [1, 0]];
  let res = [[1, 0], [0, 1]];
  
  function multiply(A: number[][], B: number[][]) {
    return [
      [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
      [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]]
    ];
  }

  let power = n - 1;
  while (power > 0) {
    if (power % 2 === 1) res = multiply(res, M);
    M = multiply(M, M);
    power = Math.floor(power / 2);
  }
  return res[0][0];
}`,
  },
  {
    id: 6,
    title: 'Single Number Anomaly Bit Isolation',
    category: 'Bit Manipulation',
    difficulty: 'EASY',
    points: 100,
    description: 'Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single anomaly element.',
    inputExample: 'nums = [4, 1, 2, 1, 2]',
    outputExample: '4',
    explanation: '4 is the only number that appears exactly once in the stream.',
    distractionId: 'odd-one-out',
    distractionName: 'Odd One Out',
    starterCode: `function singleNumber(nums: number[]): number {
  let anomaly = 0;
  for (const n of nums) {
    anomaly ^= n; // XOR cancel duplicate bit signatures
  }
  return anomaly;
}`,
  },
  {
    id: 7,
    title: 'Course Schedule Dependency Sequence',
    category: 'Graph & Topological Sort',
    difficulty: 'HARD',
    points: 200,
    description: 'There are a total of `numCourses` you have to take. Determine if you can finish all courses given the prerequisite pairs.',
    inputExample: 'numCourses = 2, prerequisites = [[1, 0]]',
    outputExample: 'true',
    explanation: 'To take course 1 you must have finished course 0. So it is possible.',
    distractionId: 'simon-says',
    distractionName: 'Simon Says',
    starterCode: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const inDegree = new Array(numCourses).fill(0);
  const adj = Array.from({ length: numCourses }, () => [] as number[]);

  for (const [course, pre] of prerequisites) {
    adj[pre].push(course);
    inDegree[course]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let count = 0;
  while (queue.length) {
    const node = queue.shift()!;
    count++;
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }
  return count === numCourses;
}`,
  },
  {
    id: 8,
    title: 'LRU Cache Design & Telemetry Storage',
    category: 'System Design & Linked List',
    difficulty: 'HARD',
    points: 200,
    description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) get and put operations.',
    inputExample: 'LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2);',
    outputExample: '[null, null, null, 1, null, -1]',
    explanation: 'Key 2 was evicted when key 3 was inserted because key 2 was least recently used.',
    distractionId: 'trivia-blitz',
    distractionName: 'Trivia Blitz',
    starterCode: `class LRUCache {
  private capacity: number;
  private cache = new Map<number, number>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value!;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}`,
  },
  {
    id: 9,
    title: 'Terminal CLI Command Injection Parser',
    category: 'String Parsing & DFA',
    difficulty: 'MEDIUM',
    points: 150,
    description: 'Parse and validate standard POSIX bash command strings, escaping quoted parameters and verifying argument syntax.',
    inputExample: 'command = "git commit -m \\"hotfix: override\\" --no-verify"',
    outputExample: '["git", "commit", "-m", "hotfix: override", "--no-verify"]',
    explanation: 'Properly preserves nested quote strings as single continuous arguments.',
    distractionId: 'typing-challenge',
    distractionName: 'Typing Challenge',
    starterCode: `function parseCliCommand(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) args.push(current);
  return args;
}`,
  },
  {
    id: 10,
    title: 'Network Packet Interception & Sliding Max Window',
    category: 'Monotonic Queue',
    difficulty: 'HARD',
    points: 200,
    description: 'Given an array `packets` and a sliding window size `k`, find the maximum throughput packet in each sliding window.',
    inputExample: 'packets = [1, 3, -1, -3, 5, 3, 6, 7], k = 3',
    outputExample: '[3, 3, 5, 5, 6, 7]',
    explanation: 'Window moves right from start to finish, recording the max packet throughput.',
    distractionId: 'catch-object',
    distractionName: 'Catch The Object',
    starterCode: `function maxSlidingWindow(packets: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = []; // store indices

  for (let i = 0; i < packets.length; i++) {
    // Remove elements outside current window
    if (deque.length && deque[0] < i - k + 1) deque.shift();
    // Remove smaller elements
    while (deque.length && packets[deque[deque.length - 1]] < packets[i]) {
      deque.pop();
    }
    deque.push(i);
    if (i >= k - 1) result.push(packets[deque[0]]);
  }
  return result;
}`,
  },
];
