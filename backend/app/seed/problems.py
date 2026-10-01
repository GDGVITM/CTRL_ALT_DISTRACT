"""The ten round problems.

Each problem carries a function signature, a reference solution and test generators. Expected
outputs are *computed* from the reference solution when seeding, so test data cannot drift from it.
Answers are always unique (no "return in any order"), which keeps exact comparison honest.
"""

from __future__ import annotations

import random
import string
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Callable

Args = list[Any]


@dataclass
class ProblemSeed:
    round_no: int
    slug: str
    title: str
    difficulty: str
    tags: list[str]
    description: list[str]
    input_format: str
    output_format: str
    constraints: list[str]
    hints: list[str]
    signature: dict
    ref: Callable[..., Any]
    samples: list[tuple[Args, str]]  # (args, explanation shown in the problem statement)
    hidden: Callable[[random.Random], list[Args]]
    time_limit_ms: int = 1500
    examples_count: int = 2  # how many samples are also listed as statement examples
    extra: dict = field(default_factory=dict)


def _sig(function: str, params: list[tuple[str, str]], returns: str) -> dict:
    return {"function": function, "params": [{"name": n, "type": t} for n, t in params], "returns": returns}


# --------------------------------------------------------------------------- reference solutions


def max_subarray(nums: list[int]) -> int:
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best


def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif not stack or stack.pop() != pairs[ch]:
            return False
    return not stack


def climb_stairs(n: int) -> int:
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


def pair_sum(nums: list[int], k: int) -> list[int]:
    seen: dict[int, int] = {}
    for j, x in enumerate(nums):
        if k - x in seen:
            return [seen[k - x], j]
        seen[x] = j
    raise ValueError("no pair")


def longest_unique(s: str) -> int:
    last: dict[str, int] = {}
    best = start = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best


def rotate_right(nums: list[int], k: int) -> list[int]:
    k %= len(nums)
    return nums[-k:] + nums[:-k] if k else list(nums)


def coin_change(coins: list[int], amount: int) -> int:
    inf = amount + 1
    dp = [0] + [inf] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != inf else -1


def lis(nums: list[int]) -> int:
    import bisect

    tails: list[int] = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)


def trap(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    lmax = rmax = water = 0
    while left < right:
        if height[left] < height[right]:
            lmax = max(lmax, height[left])
            water += lmax - height[left]
            left += 1
        else:
            rmax = max(rmax, height[right])
            water += rmax - height[right]
            right -= 1
    return water


def subarray_sum(nums: list[int], k: int) -> int:
    seen: Counter[int] = Counter({0: 1})
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen[prefix - k]
        seen[prefix] += 1
    return count


# --------------------------------------------------------------------------- hidden-test generators

BIG = 20_000


def _ints(r: random.Random, n: int, lo: int, hi: int) -> list[int]:
    return [r.randint(lo, hi) for _ in range(n)]


def _balanced(r: random.Random, pairs: int) -> str:
    out: list[str] = []
    stack: list[str] = []
    closer = {"(": ")", "[": "]", "{": "}"}
    opened = 0
    while opened < pairs or stack:
        if opened < pairs and (not stack or r.random() < 0.55):
            ch = r.choice("([{")
            out.append(ch)
            stack.append(ch)
            opened += 1
        else:
            out.append(closer[stack.pop()])
    return "".join(out)


def gen_max_subarray(r: random.Random) -> list[Args]:
    cases: list[Args] = [[[-1]], [[-3, -2, -5]], [[0, 0, 0]], [[7]], [[-2, -1]], [[1, 2, 3, 4, 5]], [[5, -9, 6, -2, 3]]]
    cases += [[_ints(r, r.randint(2, 40), -50, 50)] for _ in range(6)]
    cases += [[_ints(r, BIG, -10_000, 10_000)], [[-r.randint(1, 10_000) for _ in range(BIG)]], [[10_000] * BIG]]
    return cases


def gen_is_valid(r: random.Random) -> list[Args]:
    cases: list[Args] = [["("], [")"], ["()"], ["(("], ["((()))"], ["([)]"], ["{[]}"], ["]["], ["{[()]}[]"], ["(()"]]
    cases += [[_balanced(r, r.randint(1, 15))] for _ in range(6)]
    for _ in range(4):
        s = list(_balanced(r, r.randint(2, 15)))
        i = r.randrange(len(s))
        s[i] = r.choice("()[]{}")
        cases.append(["".join(s)])
    cases += [[_balanced(r, 5_000)], ["(" * 5_000 + ")" * 4_999 + "]"]]
    return cases


def gen_climb(r: random.Random) -> list[Args]:
    return [[n] for n in [1, 4, 5, 6, 10, 20, 30, 40, 44, 45]] + [[r.randint(1, 45)] for _ in range(4)]


def gen_pair_sum(r: random.Random) -> list[Args]:
    def unique_case(n: int, lo: int, hi: int, distinct: bool) -> Args:
        while True:
            nums = r.sample(range(lo, hi + 1), n) if distinct else _ints(r, n, lo, hi)
            i, j = sorted(r.sample(range(n), 2))
            k = nums[i] + nums[j]
            counts = Counter(nums)
            pairs = 0
            for v, c in counts.items():
                w = k - v
                if w == v:
                    pairs += c * (c - 1) // 2
                elif w in counts and v < w:
                    pairs += c * counts[w]
            if pairs == 1:
                return [nums, k]

    cases: list[Args] = [[[0, 4, 3, 0], 0], [[-1, -2, -3, -4, -5], -8], [[1, 5], 6]]
    cases += [unique_case(r.randint(3, 12), -30, 30, True) for _ in range(5)]
    cases += [unique_case(r.randint(30, 200), -1000, 1000, True) for _ in range(3)]
    cases += [unique_case(BIG, -5 * 10**8, 5 * 10**8, True), unique_case(BIG, -5 * 10**8, 5 * 10**8, True)]
    return cases


def gen_longest_unique(r: random.Random) -> list[Args]:
    alphabet = string.ascii_lowercase + string.digits
    cases: list[Args] = [["a"], ["au"], ["dvdf"], ["abba"], ["tmmzuxt"], ["aab"], ["abcdefg"], ["ababababab"]]
    cases += [["".join(r.choice(alphabet[: r.randint(2, 36)]) for _ in range(r.randint(5, 60)))] for _ in range(5)]
    cases += [["a" * BIG], [(alphabet * (BIG // len(alphabet) + 1))[:BIG]], ["".join(r.choice(alphabet) for _ in range(BIG))]]
    return cases


def gen_rotate(r: random.Random) -> list[Args]:
    cases: list[Args] = [[[1], 0], [[1], 10], [[1, 2, 3], 0], [[1, 2, 3], 3], [[1, 2, 3], 4], [[9, 8, 7, 6], 1_000_000_000]]
    for _ in range(6):
        n = r.randint(2, 30)
        cases.append([_ints(r, n, -100, 100), r.randint(0, 3 * n)])
    cases += [[_ints(r, BIG, -10**9, 10**9), r.randint(0, 10**9)], [_ints(r, BIG, -10**9, 10**9), BIG - 1]]
    return cases


def gen_coin_change(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[186, 419, 83, 408], 6249],
        [[2], 1],
        [[1], 1],
        [[5, 10], 3],
        [[3, 7], 11],
        [[1, 5, 10, 25], 99],
        [[2, 5, 10, 1], 27],
        [[7, 13, 29], 10_000],
    ]
    for _ in range(10):
        coins = r.sample(range(1, 60), r.randint(1, 6))
        cases.append([coins, r.randint(0, 500)])
    cases += [[r.sample(range(1, 10_000), r.randint(8, 12)), r.randint(5_000, 10_000)] for _ in range(3)]
    return cases


def gen_lis(r: random.Random) -> list[Args]:
    cases: list[Args] = [[[5]], [[1, 2, 3, 4, 5]], [[5, 4, 3, 2, 1]], [[2, 2]], [[4, 10, 4, 3, 8, 9]], [[1, 3, 6, 7, 9, 4, 10, 5, 6]]]
    cases += [[_ints(r, r.randint(2, 40), -20, 20)] for _ in range(6)]
    cases += [
        [_ints(r, BIG, -10**9, 10**9)],
        [sorted(r.sample(range(-10**9, 10**9), BIG))],
        [sorted(r.sample(range(-10**9, 10**9), BIG), reverse=True)],
    ]
    return cases


def gen_trap(r: random.Random) -> list[Args]:
    cases: list[Args] = [[[5]], [[1, 2, 3]], [[3, 2, 1]], [[2, 0, 2]], [[5, 0, 0, 0, 5]], [[0, 0, 0]], [[1, 0, 1, 0, 1]]]
    cases += [[_ints(r, r.randint(3, 40), 0, 12)] for _ in range(6)]
    cases += [[_ints(r, BIG, 0, 1000)], [[1000] + [0] * (BIG - 2) + [1000]], [[i % 1000 for i in range(BIG)]]]
    return cases


def gen_subarray_sum(r: random.Random) -> list[Args]:
    cases: list[Args] = [[[1], 0], [[1], 1], [[0, 0, 0], 0], [[-1, -1, 1], 0], [[3, 4, 7, 2, -3, 1, 4, 2], 7], [[1, 2, 1, 2, 1], 3]]
    cases += [[_ints(r, r.randint(2, 40), -5, 5), r.randint(-6, 6)] for _ in range(6)]
    cases += [[[0] * BIG, 0], [_ints(r, BIG, -1000, 1000), r.randint(-500, 500)], [_ints(r, BIG, -2, 2), 0]]
    return cases


# --------------------------------------------------------------------------- the ten rounds

PROBLEMS: list[ProblemSeed] = [
    ProblemSeed(
        1, "max-subarray-sum", "Max Subarray Sum", "EASY", ["Arrays", "Dynamic programming"],
        [
            "You are given an integer array nums. Find the contiguous, non-empty subarray with the largest sum and return that sum.",
            "A subarray is a run of elements that sit next to each other in the array.",
        ],
        "An array of integers nums.", "A single integer: the largest subarray sum.",
        ["1 ≤ nums.length ≤ 2 × 10^4", "-10^4 ≤ nums[i] ≤ 10^4"],
        ["If you extend a running sum and it drops below zero, it can only hurt you.", "One pass is enough: track the best sum ending at each index."],
        _sig("maxSubArray", [("nums", "int[]")], "int"), max_subarray,
        [
            ([-2, 1, -3, 4, -1, 2, 1, -5, 4], "The subarray [4, -1, 2, 1] has the largest sum, 6."),
            ([1], "The only element is the answer."),
            ([5, 4, -1, 7, 8], "The whole array sums to 23."),
        ],
        gen_max_subarray,
    ),
    ProblemSeed(
        2, "balanced-brackets", "Balanced Brackets", "EASY", ["Stack", "Strings"],
        [
            "Given a string s made only of the characters ( ) [ ] { }, decide whether the brackets are balanced.",
            "Every opening bracket must be closed by the same type of bracket, and closing brackets must come in the right order.",
        ],
        "A string s of bracket characters.", "true if s is balanced, otherwise false.",
        ["1 ≤ s.length ≤ 10^4", "s contains only ( ) [ ] { }"],
        ["The most recently opened bracket must be the first one closed.", "A stack models that exactly."],
        _sig("isValid", [("s", "string")], "bool"), is_valid,
        [
            ("()[]{}", "Every bracket is closed by its own type, in order."),
            ("(]", "A square bracket cannot close a round one."),
            ("([{}])", "Nested brackets close from the inside out."),
        ],
        gen_is_valid,
    ),
    ProblemSeed(
        3, "climbing-stairs", "Climbing Stairs", "EASY", ["Dynamic programming", "Math"],
        [
            "You are climbing a staircase with n steps. Each move you can climb either 1 or 2 steps.",
            "Return the number of distinct ways to reach the top.",
        ],
        "An integer n.", "A single integer: the number of distinct ways.",
        ["1 ≤ n ≤ 45"],
        ["To reach step n you came from step n-1 or step n-2.", "That is the Fibonacci recurrence."],
        _sig("climbStairs", [("n", "int")], "int"), climb_stairs,
        [
            (2, "Two ways: 1+1 and 2."),
            (3, "Three ways: 1+1+1, 1+2 and 2+1."),
            (4, "Five ways in total."),
        ],
        gen_climb,
    ),
    ProblemSeed(
        4, "pair-sum-window", "Pair Sum Window", "MEDIUM", ["Arrays", "Hash map"],
        [
            "You are given an integer array nums and an integer target k. Return the indices of the two numbers such that they add up to k.",
            "Each input has exactly one solution, and you may not use the same element twice. Return the two indices in ascending order.",
        ],
        "An array of integers nums, and an integer k.", "Two indices i < j such that nums[i] + nums[j] == k.",
        ["2 ≤ nums.length ≤ 2 × 10^4", "-10^9 ≤ nums[i] ≤ 10^9", "-10^9 ≤ k ≤ 10^9", "Exactly one valid pair exists"],
        ["Consider a hash map from value to index as you scan once.", "You only need one pass to find the complement."],
        _sig("solve", [("nums", "int[]"), ("k", "int")], "int[]"), pair_sum,
        [
            (([2, 7, 11, 15], 9), "nums[0] + nums[1] == 9, so we return [0, 1]."),
            (([3, 2, 4], 6), "nums[1] + nums[2] == 6."),
            (([3, 3], 6), "The two threes add up to 6."),
        ],
        gen_pair_sum,
    ),
    ProblemSeed(
        5, "longest-unique-substring", "Longest Unique Substring", "MEDIUM", ["Strings", "Sliding window"],
        [
            "Given a string s, find the length of the longest substring that contains no repeated characters.",
            "A substring is a contiguous run of characters.",
        ],
        "A string s.", "A single integer: the length of the longest substring without repeats.",
        ["1 ≤ s.length ≤ 2 × 10^4", "s contains only lowercase letters and digits"],
        ["Keep a window [start, i] with no duplicates.", "When you meet a repeat, jump start past its previous position."],
        _sig("lengthOfLongestSubstring", [("s", "string")], "int"), longest_unique,
        [
            ("abcabcbb", "The longest unique run is \"abc\", length 3."),
            ("bbbbb", "Every character repeats, so the answer is 1."),
            ("pwwkew", "\"wke\" has length 3."),
        ],
        gen_longest_unique,
    ),
    ProblemSeed(
        6, "rotate-array", "Rotate Array", "MEDIUM", ["Arrays", "Math"],
        [
            "Given an integer array nums and a non-negative integer k, rotate the array to the right by k steps and return the result.",
            "Rotating right by one step moves the last element to the front.",
        ],
        "An array of integers nums, and an integer k.", "The rotated array.",
        ["1 ≤ nums.length ≤ 2 × 10^4", "-10^9 ≤ nums[i] ≤ 10^9", "0 ≤ k ≤ 10^9"],
        ["Rotating by the array length changes nothing.", "Only k modulo n matters."],
        _sig("rotate", [("nums", "int[]"), ("k", "int")], "int[]"), rotate_right,
        [
            (([1, 2, 3, 4, 5, 6, 7], 3), "Rotate right 3 steps: [5, 6, 7, 1, 2, 3, 4]."),
            (([-1, -100, 3, 99], 2), "Rotate right 2 steps: [3, 99, -1, -100]."),
            (([1, 2], 5), "k = 5 acts like k = 1 on two elements."),
        ],
        gen_rotate,
    ),
    ProblemSeed(
        7, "coin-change", "Coin Change", "MEDIUM", ["Dynamic programming"],
        [
            "You are given an array coins of distinct coin denominations and an integer amount.",
            "Return the fewest coins needed to make up exactly that amount, or -1 if it cannot be done. You have an unlimited supply of each coin.",
        ],
        "An array of integers coins, and an integer amount.", "The minimum number of coins, or -1.",
        ["1 ≤ coins.length ≤ 12", "1 ≤ coins[i] ≤ 10^4", "0 ≤ amount ≤ 10^4"],
        ["Build the answer for every amount from 0 up to the target.", "dp[a] = 1 + min(dp[a - c]) over the coins c that fit."],
        _sig("coinChange", [("coins", "int[]"), ("amount", "int")], "int"), coin_change,
        [
            (([1, 2, 5], 11), "11 = 5 + 5 + 1."),
            (([2], 3), "An odd amount cannot be built from 2s."),
            (([1], 0), "Zero coins make an amount of 0."),
        ],
        gen_coin_change,
    ),
    ProblemSeed(
        8, "longest-increasing-subsequence", "Longest Increasing Subsequence", "HARD", ["Binary search", "Dynamic programming"],
        [
            "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
            "A subsequence keeps the original order but may skip elements.",
        ],
        "An array of integers nums.", "A single integer: the length of the longest strictly increasing subsequence.",
        ["1 ≤ nums.length ≤ 2 × 10^4", "-10^9 ≤ nums[i] ≤ 10^9"],
        ["An O(n²) table works for small inputs but not the largest ones.", "Keep the smallest possible tail for every subsequence length, and binary-search it."],
        _sig("lengthOfLIS", [("nums", "int[]")], "int"), lis,
        [
            (([10, 9, 2, 5, 3, 7, 101, 18], ), "One longest subsequence is [2, 3, 7, 101]."),
            (([0, 1, 0, 3, 2, 3], ), "One longest subsequence is [0, 1, 2, 3]."),
            (([7, 7, 7, 7, 7, 7, 7], ), "Strictly increasing, so only one element can be used."),
        ],
        gen_lis, time_limit_ms=2000,
    ),
    ProblemSeed(
        9, "trapping-rain-water", "Trapping Rain Water", "HARD", ["Two pointers", "Arrays"],
        [
            "You are given an array height where height[i] is the height of a bar of width 1.",
            "After it rains, water collects between the bars. Return how many units of water are trapped.",
        ],
        "An array of non-negative integers height.", "A single integer: the units of trapped water.",
        ["1 ≤ height.length ≤ 2 × 10^4", "0 ≤ height[i] ≤ 1000"],
        ["The water above a bar is limited by the shorter of the tallest bars on its left and right.", "Two pointers moving inward avoid the extra arrays."],
        _sig("trap", [("height", "int[]")], "int"), trap,
        [
            (([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], ), "6 units of water are trapped between the bars."),
            (([4, 2, 0, 3, 2, 5], ), "9 units fill the valley between the two tall bars."),
            (([3, 0, 2], ), "2 units sit above the gap in the middle."),
        ],
        gen_trap, time_limit_ms=2000,
    ),
    ProblemSeed(
        10, "subarray-sum-equals-k", "Subarray Sum Equals K", "HARD", ["Prefix sums", "Hash map"],
        [
            "Given an integer array nums and an integer k, return the total number of contiguous subarrays whose elements sum to k.",
            "The array may contain negative numbers and zeros.",
        ],
        "An array of integers nums, and an integer k.", "A single integer: the number of subarrays that sum to k.",
        ["1 ≤ nums.length ≤ 2 × 10^4", "-1000 ≤ nums[i] ≤ 1000", "-10^7 ≤ k ≤ 10^7"],
        ["With prefix sums, a subarray sums to k when two prefixes differ by k.", "Count how many earlier prefixes equal (current prefix - k)."],
        _sig("subarraySum", [("nums", "int[]"), ("k", "int")], "int"), subarray_sum,
        [
            (([1, 1, 1], 2), "[1, 1] appears twice."),
            (([1, 2, 3], 3), "[1, 2] and [3] both sum to 3."),
            (([1, -1, 0], 0), "[1, -1], [0] and [1, -1, 0] all sum to 0."),
        ],
        gen_subarray_sum, time_limit_ms=2000,
    ),
]
