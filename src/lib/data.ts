export const EVENT = {
  organizerName: "GDG on Campus Your College",
  collegeName: "Your College",
  eventDate: "18 OCT 2026",
  eventTime: "10:00 IST",
  dsaPoints: 100,
  bonusPoints: 50,
  roundMinutes: 10,
  distractionSeconds: 30,
  totalRounds: 10,
};

export const PLAYER = {
  firstName: "Player",
  fullName: "Player One",
  initials: "P1",
  playerId: "CAO-0142",
};

export const PROBLEM = {
  index: 4,
  title: "Pair Sum Window",
  difficulty: "MEDIUM" as const,
  points: EVENT.dsaPoints,
  tags: ["Arrays", "Two pointers"],
  description: [
    "You are given an integer array nums and an integer target k. Return the indices of the two numbers such that they add up to k.",
    "You may assume that each input has exactly one solution, and you may not use the same element twice. Return the answer in any order.",
  ],
  inputFormat: "An array of integers nums, and an integer k.",
  outputFormat: "Two indices i, j such that nums[i] + nums[j] == k.",
  examples: [
    {
      input: "nums = [2, 7, 11, 15], k = 9",
      output: "[0, 1]",
      explanation: "nums[0] + nums[1] == 9, so we return [0, 1].",
    },
    {
      input: "nums = [3, 2, 4], k = 6",
      output: "[1, 2]",
      explanation: "nums[1] + nums[2] == 6.",
    },
  ],
  constraints: ["2 ≤ nums.length ≤ 10^5", "-10^9 ≤ nums[i] ≤ 10^9", "-10^9 ≤ k ≤ 10^9"],
  hints: ["Consider a hash map from value to index as you scan once.", "You only need one pass to find the complement."],
  starterCode: {
    python: "class Solution:\n    def solve(self, nums, k):\n        pass\n",
    cpp: "class Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int k) {\n        \n    }\n};\n",
    c: "int* solve(int* nums, int numsSize, int k, int* returnSize) {\n    \n}\n",
    java: "class Solution {\n    public int[] solve(int[] nums, int k) {\n        \n    }\n}\n",
  },
};

export const PLAYERS = Array.from({ length: 126 }, (_, i) => ({
  id: `P${i + 2}`,
  name: `PLAYER_${(i + 2).toString().padStart(2, "0")}`,
}));

export interface LeaderboardEntry {
  id: string;
  name: string;
  roundPts: number;
  bonus: number;
  time: string;
  self?: boolean;
}

const RAW_LEADERBOARD: LeaderboardEntry[] = [
  { id: "P2", name: "PLAYER_02", roundPts: 900, bonus: 200, time: "01:31:07" },
  { id: "P7", name: "PLAYER_07", roundPts: 850, bonus: 200, time: "01:35:52" },
  { id: "P3", name: "PLAYER_03", roundPts: 800, bonus: 200, time: "01:22:19" },
  { id: "P9", name: "PLAYER_09", roundPts: 800, bonus: 150, time: "01:40:03" },
  { id: "P4", name: "PLAYER_04", roundPts: 750, bonus: 150, time: "01:28:41" },
  { id: "P11", name: "PLAYER_11", roundPts: 700, bonus: 150, time: "01:19:55" },
  { id: "P5", name: "PLAYER_05", roundPts: 700, bonus: 100, time: "01:44:12" },
  { id: "P15", name: "PLAYER_15", roundPts: 650, bonus: 150, time: "01:33:30" },
  { id: "P6", name: "PLAYER_06", roundPts: 650, bonus: 100, time: "01:26:08" },
  { id: "P22", name: "PLAYER_22", roundPts: 600, bonus: 150, time: "01:47:44" },
  { id: "P8", name: "PLAYER_08", roundPts: 600, bonus: 100, time: "01:38:20" },
  { id: "P30", name: "PLAYER_30", roundPts: 600, bonus: 50, time: "01:29:17" },
  { id: "P12", name: "PLAYER_12", roundPts: 550, bonus: 50, time: "01:52:03" },
  { id: "P1", name: "Player One", roundPts: 720, bonus: 150, time: "01:12:44", self: true },
  { id: "P18", name: "PLAYER_18", roundPts: 500, bonus: 50, time: "01:41:29" },
];

const FILLER_LEADERBOARD: LeaderboardEntry[] = Array.from({ length: 47 }, (_, i) => {
  const n = i + 40;
  const bonus = [150, 100, 50, 0][i % 4];
  const roundPts = 500 - Math.floor(i / 2) * 10 + (i % 3) * 10;
  const mins = 78 + ((i * 7) % 40);
  const secs = (i * 13) % 60;
  return {
    id: `P${n}`,
    name: `PLAYER_${n}`,
    roundPts,
    bonus,
    time: `01:${mins - 60 < 10 ? "0" : ""}${mins - 60}:${secs.toString().padStart(2, "0")}`,
  };
});

export const LEADERBOARD = [...RAW_LEADERBOARD, ...FILLER_LEADERBOARD].map((p) => ({ ...p, total: p.roundPts + p.bonus }))
  .sort((a, b) => b.total - a.total || a.time.localeCompare(b.time))
  .map((p, i) => ({ rank: i + 1, ...p }));
