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


# --------------------------------------------------------------------------- reference solutions


def second_largest(nums: list[int]) -> int:
    first = second = -10**18
    for x in nums:
        if x > first:
            second = first
            first = x
        elif x < first and x > second:
            second = x
    return second if second != -10**18 else -1


def remove_duplicates(nums: list[int]) -> int:
    if not nums:
        return 0
    i = 0
    for j in range(1, len(nums)):
        if nums[j] != nums[i]:
            i += 1
            nums[i] = nums[j]
    return i + 1


def majority_element(nums: list[int]) -> int:
    count = 0
    candidate = nums[0]
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate


def move_zeroes(nums: list[int]) -> list[int]:
    res = list(nums)
    insert_pos = 0
    for x in res:
        if x != 0:
            res[insert_pos] = x
            insert_pos += 1
    while insert_pos < len(res):
        res[insert_pos] = 0
        insert_pos += 1
    return res


def missing_number(nums: list[int]) -> int:
    n = len(nums)
    expected = n * (n + 1) // 2
    return expected - sum(nums)


def merge_intervals(flat: list[int]) -> list[int]:
    if not flat:
        return []
    intervals = [[flat[i], flat[i + 1]] for i in range(0, len(flat), 2)]
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for cur in intervals[1:]:
        prev = merged[-1]
        if cur[0] <= prev[1]:
            prev[1] = max(prev[1], cur[1])
        else:
            merged.append(cur)
    out: list[int] = []
    for s, e in merged:
        out.extend([s, e])
    return out


def intersection(nums1: list[int], nums2: list[int]) -> list[int]:
    res = sorted(list(set(nums1) & set(nums2)))
    return res


def middle_node(nums: list[int]) -> list[int]:
    if not nums:
        return []
    mid = len(nums) // 2
    return nums[mid:]


def has_cycle(nodes: list[int], pos: int) -> bool:
    return pos >= 0 and pos < len(nodes)


def swap_pairs(nums: list[int]) -> list[int]:
    res = list(nums)
    for i in range(0, len(res) - 1, 2):
        res[i], res[i + 1] = res[i + 1], res[i]
    return res


# --------------------------------------------------------------------------- hidden-test generators

BIG = 10_000


def _ints(r: random.Random, n: int, lo: int, hi: int) -> list[int]:
    return [r.randint(lo, hi) for _ in range(n)]


def gen_second_largest(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[12, 35, 1, 10, 34, 1]],
        [[10, 5, 10]],
        [[10, 10, 10]],
        [[1, 2]],
        [[2, 1]],
        [[5]],
        [[-1, -2, -3, -4]],
    ]
    for _ in range(8):
        n = r.randint(2, 30)
        cases.append([_ints(r, n, -100, 100)])
    cases += [[_ints(r, BIG, -10**9, 10**9)], [[i for i in range(BIG)]], [[BIG - i for i in range(BIG)]]]
    return cases


def gen_remove_duplicates(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[1, 1, 2]],
        [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]],
        [[1]],
        [[1, 1, 1, 1]],
        [[1, 2, 3, 4, 5]],
    ]
    for _ in range(8):
        n = r.randint(2, 40)
        cases.append([sorted(_ints(r, n, -50, 50))])
    cases += [[sorted(_ints(r, BIG, -10**4, 10**4))], [[1] * BIG], [list(range(BIG))]]
    return cases


def gen_majority_element(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[3, 2, 3]],
        [[2, 2, 1, 1, 1, 2, 2]],
        [[1]],
        [[5, 5, 5, 1]],
    ]
    for _ in range(8):
        maj = r.randint(-100, 100)
        other_count = r.randint(1, 20)
        maj_count = other_count + r.randint(1, 10)
        arr = [maj] * maj_count + _ints(r, other_count, -100, 100)
        r.shuffle(arr)
        cases.append([arr])
    cases += [[[7] * (BIG // 2 + 1) + _ints(r, BIG // 2 - 1, -1000, 1000)]]
    return cases


def gen_move_zeroes(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[0, 1, 0, 3, 12]],
        [[0]],
        [[1]],
        [[1, 0]],
        [[0, 0, 0, 1]],
        [[1, 2, 3, 4]],
    ]
    for _ in range(8):
        n = r.randint(2, 30)
        arr = [0 if r.random() < 0.4 else r.randint(-50, 50) for _ in range(n)]
        cases.append([arr])
    cases += [[[0 if i % 2 == 0 else i for i in range(BIG)]], [[0] * BIG], [list(range(1, BIG + 1))]]
    return cases


def gen_missing_number(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[3, 0, 1]],
        [[0, 1]],
        [[9, 6, 4, 2, 3, 5, 7, 0, 1]],
        [[0]],
        [[1]],
    ]
    for _ in range(8):
        n = r.randint(2, 50)
        missing = r.randint(0, n)
        arr = [x for x in range(n + 1) if x != missing]
        r.shuffle(arr)
        cases.append([arr])
    n = BIG
    missing = r.randint(0, n)
    arr = [x for x in range(n + 1) if x != missing]
    r.shuffle(arr)
    cases.append([arr])
    return cases


def gen_merge_intervals(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[1, 3, 2, 6, 8, 10, 15, 18]],
        [[1, 4, 4, 5]],
        [[1, 4, 2, 3]],
        [[1, 4, 0, 4]],
        [[1, 2, 3, 4, 5, 6]],
    ]
    for _ in range(8):
        k = r.randint(2, 15)
        flat = []
        for _ in range(k):
            a = r.randint(0, 50)
            b = a + r.randint(0, 20)
            flat.extend([a, b])
        cases.append([flat])
    return cases


def gen_intersection(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[1, 2, 2, 1], [2, 2]],
        [[4, 9, 5], [9, 4, 9, 8, 4]],
        [[1, 2, 3], [4, 5, 6]],
        [[1], [1]],
        [[1, 1, 1], [1, 1]],
    ]
    for _ in range(8):
        n1 = r.randint(1, 30)
        n2 = r.randint(1, 30)
        cases.append([_ints(r, n1, -30, 30), _ints(r, n2, -30, 30)])
    cases += [[_ints(r, BIG, -1000, 1000), _ints(r, BIG, -1000, 1000)]]
    return cases


def gen_middle_node(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[1, 2, 3, 4, 5]],
        [[1, 2, 3, 4, 5, 6]],
        [[1]],
        [[1, 2]],
        [[1, 2, 3]],
    ]
    for _ in range(8):
        n = r.randint(1, 40)
        cases.append([_ints(r, n, -100, 100)])
    cases += [[list(range(BIG))], [list(range(BIG + 1))]]
    return cases


def gen_has_cycle(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[3, 2, 0, -4], 1],
        [[1, 2], 0],
        [[1], -1],
        [[1, 2, 3, 4, 5], -1],
        [[1, 2, 3, 4, 5], 4],
    ]
    for _ in range(8):
        n = r.randint(1, 30)
        pos = r.choice([-1, r.randint(0, n - 1)])
        cases.append([_ints(r, n, -100, 100), pos])
    cases += [[_ints(r, BIG, -100, 100), -1], [_ints(r, BIG, -100, 100), BIG // 2]]
    return cases


def gen_swap_pairs(r: random.Random) -> list[Args]:
    cases: list[Args] = [
        [[1, 2, 3, 4]],
        [[]],
        [[1]],
        [[1, 2, 3]],
        [[1, 2, 3, 4, 5, 6]],
    ]
    for _ in range(8):
        n = r.randint(0, 30)
        cases.append([_ints(r, n, -100, 100)])
    cases += [[list(range(BIG))], [list(range(BIG - 1))]]
    return cases


# --------------------------------------------------------------------------- the ten rounds

PROBLEMS: list[ProblemSeed] = [
    ProblemSeed(
        1, "second-largest-element", "Second Largest Element", "EASY", ["Arrays"],
        [
            "Given an array of integers nums, find the second largest distinct element in the array without sorting.",
            "If no distinct second largest element exists (e.g. all elements are equal or length < 2), return -1.",
        ],
        "An array of integers nums.", "The second largest distinct integer, or -1.",
        ["1 ≤ nums.length ≤ 10^5", "-10^9 ≤ nums[i] ≤ 10^9"],
        ["Track the largest and second largest elements in a single pass.", "Update them carefully as you iterate through the array."],
        _sig("secondLargest", [("nums", "int[]")], "int"), second_largest,
        [
            ([12, 35, 1, 10, 34, 1], "The distinct elements are 12, 35, 1, 10, 34. The second largest is 34."),
            ([10, 5, 10], "The largest is 10, and second largest distinct is 5."),
            ([10, 10, 10], "All elements are equal, so there is no second largest distinct element. Return -1."),
        ],
        gen_second_largest,
    ),
    ProblemSeed(
        2, "remove-duplicates-from-sorted-array", "Remove Duplicates from Sorted Array", "EASY", ["Arrays", "Two Pointers"],
        [
            "Given an integer array nums sorted in non-decreasing order, remove duplicates in-place such that each unique element appears only once.",
            "Return the number of unique elements in nums.",
        ],
        "A sorted integer array nums.", "An integer: the number of unique elements.",
        ["1 ≤ nums.length ≤ 3 × 10^4", "-100 ≤ nums[i] ≤ 100", "nums is sorted in non-decreasing order."],
        ["Use two pointers: one slow pointer for unique elements and one fast pointer iterating through the array."],
        _sig("removeDuplicates", [("nums", "int[]")], "int"), remove_duplicates,
        [
            ([1, 1, 2], "Your function should return k = 2, with the first two elements of nums being 1 and 2."),
            ([0, 0, 1, 1, 1, 2, 2, 3, 3, 4], "Your function should return k = 5, with the first five elements being 0, 1, 2, 3, and 4."),
        ],
        gen_remove_duplicates,
    ),
    ProblemSeed(
        3, "majority-element", "Majority Element", "EASY", ["Arrays", "Hash Map"],
        [
            "Given an array nums of size n, return the majority element.",
            "The majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists in the array.",
        ],
        "An integer array nums.", "A single integer: the majority element.",
        ["1 ≤ nums.length ≤ 5 × 10^4", "-10^9 ≤ nums[i] ≤ 10^9", "A majority element is guaranteed to exist."],
        ["Boyer-Moore Voting Algorithm solves this in O(n) time and O(1) extra space."],
        _sig("majorityElement", [("nums", "int[]")], "int"), majority_element,
        [
            ([3, 2, 3], "3 appears 2 times out of 3, which is > 3/2."),
            ([2, 2, 1, 1, 1, 2, 2], "2 appears 4 times out of 7, which is > 7/2."),
        ],
        gen_majority_element,
    ),
    ProblemSeed(
        4, "move-zeroes", "Move Zeroes", "EASY", ["Arrays", "Two Pointers"],
        [
            "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
            "Return the modified array.",
        ],
        "An integer array nums.", "The array with all 0s placed at the end.",
        ["1 ≤ nums.length ≤ 10^4", "-2^31 ≤ nums[i] ≤ 2^31 - 1"],
        ["Keep a pointer for where the next non-zero element should go."],
        _sig("moveZeroes", [("nums", "int[]")], "int[]"), move_zeroes,
        [
            ([0, 1, 0, 3, 12], "After moving zeroes to the end, the result is [1, 3, 12, 0, 0]."),
            ([0], "[0] remains [0]."),
            ([1, 0], "[1, 0] remains [1, 0]."),
        ],
        gen_move_zeroes,
    ),
    ProblemSeed(
        5, "find-missing-number", "Find Missing Number", "EASY", ["Arrays", "Math", "Bit Manipulation"],
        [
            "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.",
        ],
        "An integer array nums.", "The missing integer in [0, n].",
        ["1 ≤ nums.length ≤ 10^4", "0 ≤ nums[i] ≤ nums.length", "All the numbers of nums are unique."],
        ["The sum of numbers from 0 to n is n * (n + 1) / 2. Subtract the array sum from it."],
        _sig("missingNumber", [("nums", "int[]")], "int"), missing_number,
        [
            ([3, 0, 1], "n = 3 since there are 3 numbers, so all numbers are in the range [0, 3]. 2 is the missing number."),
            ([0, 1], "n = 2. 2 is missing from [0, 2]."),
            ([9, 6, 4, 2, 3, 5, 7, 0, 1], "n = 9. 8 is missing from [0, 9]."),
        ],
        gen_missing_number,
    ),
    ProblemSeed(
        6, "merge-overlapping-intervals", "Merge Overlapping Intervals", "MEDIUM", ["Arrays", "Sorting"],
        [
            "Given a collection of intervals represented as a flattened array [start1, end1, start2, end2, ...], merge all overlapping intervals.",
            "Return the merged intervals as a flattened array sorted in ascending order of start times.",
        ],
        "A flattened array of intervals where every two consecutive numbers represent [start, end].", "A flattened array of the merged intervals.",
        ["0 ≤ intervals.length ≤ 2 × 10^4 (even length)", "0 ≤ start_i ≤ end_i ≤ 10^4"],
        ["Sort the intervals by their start time, then merge adjacent ones if cur.start <= prev.end."],
        _sig("merge", [("intervals", "int[]")], "int[]"), merge_intervals,
        [
            ([1, 3, 2, 6, 8, 10, 15, 18], "Intervals [1, 3] and [2, 6] overlap, merging into [1, 6]. Result is [1, 6, 8, 10, 15, 18]."),
            ([1, 4, 4, 5], "Intervals [1, 4] and [4, 5] touch at 4, merging into [1, 5]."),
        ],
        gen_merge_intervals,
    ),
    ProblemSeed(
        7, "intersection-of-two-arrays", "Intersection of Two Arrays", "EASY", ["Arrays", "Hash Set"],
        [
            "Given two integer arrays nums1 and nums2, return an array of their intersection in ascending sorted order.",
            "Each element in the result must be unique.",
        ],
        "Two integer arrays nums1 and nums2.", "An array containing the distinct common elements in ascending order.",
        ["1 ≤ nums1.length, nums2.length ≤ 1000", "0 ≤ nums1[i], nums2[i] ≤ 1000"],
        ["Convert nums1 into a set, and check which elements of nums2 exist in it."],
        _sig("intersection", [("nums1", "int[]"), ("nums2", "int[]")], "int[]"), intersection,
        [
            (([1, 2, 2, 1], [2, 2]), "The common distinct element is [2]."),
            (([4, 9, 5], [9, 4, 9, 8, 4]), "The common elements are [4, 9] in sorted order."),
        ],
        gen_intersection,
    ),
    ProblemSeed(
        8, "middle-of-linked-list", "Middle of Linked List", "EASY", ["Linked List", "Two Pointers"],
        [
            "Given the head values of a singly linked list represented as an array, return the sublist starting from the middle node to the end.",
            "If there are two middle nodes, return the second middle node (along with the rest of the list).",
        ],
        "An array representing values of the linked list.", "An array representing the nodes starting from the middle node.",
        ["1 ≤ nodes.length ≤ 100", "1 ≤ Node.val ≤ 100"],
        ["Use fast and slow pointers: slow moves 1 step, fast moves 2 steps."],
        _sig("middleNode", [("head", "int[]")], "int[]"), middle_node,
        [
            ([1, 2, 3, 4, 5], "The middle node is 3, returning [3, 4, 5]."),
            ([1, 2, 3, 4, 5, 6], "Since the list has two middle nodes with values 3 and 4, we return the second one: [4, 5, 6]."),
        ],
        gen_middle_node,
    ),
    ProblemSeed(
        9, "detect-cycle-in-linked-list", "Detect Cycle in Linked List", "MEDIUM", ["Linked List", "Two Pointers"],
        [
            "Given the values of a linked list and an integer pos representing the 0-indexed position where the tail connects back to, determine whether the linked list has a cycle.",
            "pos is -1 if there is no cycle.",
        ],
        "An array of integers representing nodes, and an integer pos.", "true if there is a cycle, otherwise false.",
        ["1 ≤ nodes.length ≤ 10^4", "-10^5 ≤ Node.val ≤ 10^5", "pos is -1 or a valid index in the list."],
        ["Floyd's Cycle-Finding Algorithm (Tortoise and Hare) detects cycles in O(1) space."],
        _sig("hasCycle", [("head", "int[]"), ("pos", "int")], "bool"), has_cycle,
        [
            (([3, 2, 0, -4], 1), "Tail connects to index 1, so there is a cycle: true."),
            (([1, 2], 0), "Tail connects to index 0: true."),
            (([1], -1), "There is no cycle: false."),
        ],
        gen_has_cycle,
    ),
    ProblemSeed(
        10, "reverse-nodes-in-pairs", "Reverse Nodes in Pairs", "MEDIUM", ["Linked List", "Recursion"],
        [
            "Given a linked list represented as an array of node values, swap every two adjacent nodes and return the modified list.",
            "You may not modify the values in the list's nodes, only nodes themselves may be changed.",
        ],
        "An array of node values.", "The array with adjacent pairs swapped.",
        ["0 ≤ nodes.length ≤ 100", "0 ≤ Node.val ≤ 100"],
        ["Swap node1 and node2, then recursively swap the remaining list."],
        _sig("swapPairs", [("head", "int[]")], "int[]"), swap_pairs,
        [
            ([1, 2, 3, 4], "Swapping adjacent pairs yields [2, 1, 4, 3]."),
            ([], "An empty list returns []."),
            ([1], "A single node list remains [1]."),
            ([1, 2, 3], "[1, 2] swap to [2, 1], and the leftover [3] remains at the end: [2, 1, 3]."),
        ],
        gen_swap_pairs,
    ),
]

