"""Known-correct player solutions in every language, used to validate the harnesses end to end."""

SOLUTIONS: dict[str, dict[str, str]] = {
    "second-largest-element": {
        "python": """class Solution:
    def secondLargest(self, nums):
        first = second = -float('inf')
        for x in nums:
            if x > first:
                second = first
                first = x
            elif x < first and x > second:
                second = x
        return int(second) if second != -float('inf') else -1
""",
        "cpp": """class Solution {
public:
    int secondLargest(vector<int>& nums) {
        long long first = -1e18, second = -1e18;
        for (int x : nums) {
            if (x > first) {
                second = first;
                first = x;
            } else if (x < first && x > second) {
                second = x;
            }
        }
        return second == -1e18 ? -1 : (int)second;
    }
};
""",
        "c": """int secondLargest(int* nums, int numsSize) {
    long long first = -1000000000000000LL, second = -1000000000000000LL;
    for (int i = 0; i < numsSize; i++) {
        long long x = nums[i];
        if (x > first) {
            second = first;
            first = x;
        } else if (x < first && x > second) {
            second = x;
        }
    }
    return second == -1000000000000000LL ? -1 : (int)second;
}
""",
        "java": """class Solution {
    public int secondLargest(int[] nums) {
        long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
        for (int x : nums) {
            if (x > first) {
                second = first;
                first = x;
            } else if (x < first && x > second) {
                second = x;
            }
        }
        return second == Long.MIN_VALUE ? -1 : (int) second;
    }
}
""",
    },
    "remove-duplicates-from-sorted-array": {
        "python": """class Solution:
    def removeDuplicates(self, nums):
        if not nums:
            return 0
        i = 0
        for j in range(1, len(nums)):
            if nums[j] != nums[i]:
                i += 1
                nums[i] = nums[j]
        return i + 1
""",
        "cpp": """class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) return 0;
        int i = 0;
        for (int j = 1; j < (int)nums.size(); j++) {
            if (nums[j] != nums[i]) {
                i++;
                nums[i] = nums[j];
            }
        }
        return i + 1;
    }
};
""",
        "c": """int removeDuplicates(int* nums, int numsSize) {
    if (numsSize == 0) return 0;
    int i = 0;
    for (int j = 1; j < numsSize; j++) {
        if (nums[j] != nums[i]) {
            i++;
            nums[i] = nums[j];
        }
    }
    return i + 1;
}
""",
        "java": """class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int i = 0;
        for (int j = 1; j < nums.length; j++) {
            if (nums[j] != nums[i]) {
                i++;
                nums[i] = nums[j];
            }
        }
        return i + 1;
    }
}
""",
    },
    "majority-element": {
        "python": """class Solution:
    def majorityElement(self, nums):
        count = 0
        cand = None
        for x in nums:
            if count == 0:
                cand = x
            count += 1 if x == cand else -1
        return cand
""",
        "cpp": """class Solution {
public:
    int majorityElement(vector<int>& nums) {
        int count = 0, cand = 0;
        for (int x : nums) {
            if (count == 0) cand = x;
            count += (x == cand) ? 1 : -1;
        }
        return cand;
    }
};
""",
        "c": """int majorityElement(int* nums, int numsSize) {
    int count = 0, cand = 0;
    for (int i = 0; i < numsSize; i++) {
        if (count == 0) cand = nums[i];
        count += (nums[i] == cand) ? 1 : -1;
    }
    return cand;
}
""",
        "java": """class Solution {
    public int majorityElement(int[] nums) {
        int count = 0, cand = 0;
        for (int x : nums) {
            if (count == 0) cand = x;
            count += (x == cand) ? 1 : -1;
        }
        return cand;
    }
}
""",
    },
    "move-zeroes": {
        "python": """class Solution:
    def moveZeroes(self, nums):
        res = list(nums)
        pos = 0
        for x in res:
            if x != 0:
                res[pos] = x
                pos += 1
        while pos < len(res):
            res[pos] = 0
            pos += 1
        return res
""",
        "cpp": """class Solution {
public:
    vector<int> moveZeroes(vector<int>& nums) {
        vector<int> res = nums;
        int pos = 0;
        for (int x : res) {
            if (x != 0) res[pos++] = x;
        }
        while (pos < (int)res.size()) res[pos++] = 0;
        return res;
    }
};
""",
        "c": """int* moveZeroes(int* nums, int numsSize, int* returnSize) {
    int* res = malloc(sizeof(int) * numsSize);
    int pos = 0;
    for (int i = 0; i < numsSize; i++) {
        if (nums[i] != 0) res[pos++] = nums[i];
    }
    while (pos < numsSize) res[pos++] = 0;
    *returnSize = numsSize;
    return res;
}
""",
        "java": """class Solution {
    public int[] moveZeroes(int[] nums) {
        int[] res = nums.clone();
        int pos = 0;
        for (int x : res) {
            if (x != 0) res[pos++] = x;
        }
        while (pos < res.length) res[pos++] = 0;
        return res;
    }
}
""",
    },
    "find-missing-number": {
        "python": """class Solution:
    def missingNumber(self, nums):
        n = len(nums)
        return n * (n + 1) // 2 - sum(nums)
""",
        "cpp": """class Solution {
public:
    int missingNumber(vector<int>& nums) {
        long long n = nums.size();
        long long total = n * (n + 1) / 2;
        for (int x : nums) total -= x;
        return (int)total;
    }
};
""",
        "c": """int missingNumber(int* nums, int numsSize) {
    long long n = numsSize;
    long long total = n * (n + 1) / 2;
    for (int i = 0; i < numsSize; i++) total -= nums[i];
    return (int)total;
}
""",
        "java": """class Solution {
    public int missingNumber(int[] nums) {
        long n = nums.length;
        long total = n * (n + 1) / 2;
        for (int x : nums) total -= x;
        return (int) total;
    }
}
""",
    },
    "merge-overlapping-intervals": {
        "python": """class Solution:
    def merge(self, intervals):
        if not intervals:
            return []
        pairs = [[intervals[i], intervals[i+1]] for i in range(0, len(intervals), 2)]
        pairs.sort(key=lambda x: x[0])
        res = [pairs[0]]
        for cur in pairs[1:]:
            if cur[0] <= res[-1][1]:
                res[-1][1] = max(res[-1][1], cur[1])
            else:
                res.append(cur)
        out = []
        for a, b in res:
            out.extend([a, b])
        return out
""",
        "cpp": """class Solution {
public:
    vector<int> merge(vector<int>& intervals) {
        if (intervals.empty()) return {};
        vector<pair<int, int>> pairs;
        for (size_t i = 0; i < intervals.size(); i += 2) {
            pairs.push_back({intervals[i], intervals[i+1]});
        }
        sort(pairs.begin(), pairs.end());
        vector<pair<int, int>> merged;
        merged.push_back(pairs[0]);
        for (size_t i = 1; i < pairs.size(); i++) {
            if (pairs[i].first <= merged.back().second) {
                merged.back().second = max(merged.back().second, pairs[i].second);
            } else {
                merged.push_back(pairs[i]);
            }
        }
        vector<int> out;
        for (auto& p : merged) {
            out.push_back(p.first);
            out.push_back(p.second);
        }
        return out;
    }
};
""",
        "c": """typedef struct { int s, e; } Pair;
static int cmpPair(const void* a, const void* b) {
    Pair* p1 = (Pair*)a; Pair* p2 = (Pair*)b;
    return (p1->s > p2->s) - (p1->s < p2->s);
}
int* merge(int* intervals, int intervalsSize, int* returnSize) {
    if (intervalsSize == 0) { *returnSize = 0; return malloc(0); }
    int n = intervalsSize / 2;
    Pair* pairs = malloc(sizeof(Pair) * n);
    for (int i = 0; i < n; i++) {
        pairs[i].s = intervals[2 * i];
        pairs[i].e = intervals[2 * i + 1];
    }
    qsort(pairs, n, sizeof(Pair), cmpPair);
    Pair* merged = malloc(sizeof(Pair) * n);
    int mCount = 0;
    merged[mCount++] = pairs[0];
    for (int i = 1; i < n; i++) {
        if (pairs[i].s <= merged[mCount - 1].e) {
            if (pairs[i].e > merged[mCount - 1].e) merged[mCount - 1].e = pairs[i].e;
        } else {
            merged[mCount++] = pairs[i];
        }
    }
    int* out = malloc(sizeof(int) * mCount * 2);
    for (int i = 0; i < mCount; i++) {
        out[2 * i] = merged[i].s;
        out[2 * i + 1] = merged[i].e;
    }
    *returnSize = mCount * 2;
    free(pairs);
    free(merged);
    return out;
}
""",
        "java": """class Solution {
    public int[] merge(int[] intervals) {
        if (intervals.length == 0) return new int[0];
        int n = intervals.length / 2;
        int[][] pairs = new int[n][2];
        for (int i = 0; i < n; i++) {
            pairs[i][0] = intervals[2 * i];
            pairs[i][1] = intervals[2 * i + 1];
        }
        Arrays.sort(pairs, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        merged.add(pairs[0]);
        for (int i = 1; i < n; i++) {
            int[] last = merged.get(merged.size() - 1);
            if (pairs[i][0] <= last[1]) {
                last[1] = Math.max(last[1], pairs[i][1]);
            } else {
                merged.add(pairs[i]);
            }
        }
        int[] out = new int[merged.size() * 2];
        for (int i = 0; i < merged.size(); i++) {
            out[2 * i] = merged.get(i)[0];
            out[2 * i + 1] = merged.get(i)[1];
        }
        return out;
    }
}
""",
    },
    "intersection-of-two-arrays": {
        "python": """class Solution:
    def intersection(self, nums1, nums2):
        return sorted(list(set(nums1) & set(nums2)))
""",
        "cpp": """class Solution {
public:
    vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
        unordered_set<int> s1(nums1.begin(), nums1.end());
        set<int> common;
        for (int x : nums2) {
            if (s1.count(x)) common.insert(x);
        }
        return vector<int>(common.begin(), common.end());
    }
};
""",
        "c": """static int cmpInt(const void* a, const void* b) {
    int x = *(const int*)a;
    int y = *(const int*)b;
    return (x > y) - (x < y);
}
int* intersection(int* nums1, int nums1Size, int* nums2, int nums2Size, int* returnSize) {
    if (nums1Size == 0 || nums2Size == 0) {
        *returnSize = 0;
        return malloc(0);
    }
    int* a1 = malloc(sizeof(int) * nums1Size);
    for (int i = 0; i < nums1Size; i++) a1[i] = nums1[i];
    qsort(a1, nums1Size, sizeof(int), cmpInt);

    int* a2 = malloc(sizeof(int) * nums2Size);
    for (int i = 0; i < nums2Size; i++) a2[i] = nums2[i];
    qsort(a2, nums2Size, sizeof(int), cmpInt);

    int maxLen = nums1Size < nums2Size ? nums1Size : nums2Size;
    int* res = malloc(sizeof(int) * maxLen);
    int p1 = 0, p2 = 0, count = 0;

    while (p1 < nums1Size && p2 < nums2Size) {
        if (a1[p1] == a2[p2]) {
            if (count == 0 || res[count - 1] != a1[p1]) {
                res[count++] = a1[p1];
            }
            p1++;
            p2++;
        } else if (a1[p1] < a2[p2]) {
            p1++;
        } else {
            p2++;
        }
    }
    free(a1);
    free(a2);
    *returnSize = count;
    return res;
}
""",
        "java": """class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        Set<Integer> s1 = new HashSet<>();
        for (int x : nums1) s1.add(x);
        Set<Integer> common = new TreeSet<>();
        for (int x : nums2) {
            if (s1.contains(x)) common.add(x);
        }
        int[] res = new int[common.size()];
        int idx = 0;
        for (int x : common) res[idx++] = x;
        return res;
    }
}
""",
    },
    "middle-of-linked-list": {
        "python": """class Solution:
    def middleNode(self, head):
        return head[len(head)//2:]
""",
        "cpp": """class Solution {
public:
    vector<int> middleNode(vector<int>& head) {
        int mid = head.size() / 2;
        return vector<int>(head.begin() + mid, head.end());
    }
};
""",
        "c": """int* middleNode(int* head, int headSize, int* returnSize) {
    int mid = headSize / 2;
    int len = headSize - mid;
    int* res = malloc(sizeof(int) * len);
    for (int i = 0; i < len; i++) res[i] = head[mid + i];
    *returnSize = len;
    return res;
}
""",
        "java": """class Solution {
    public int[] middleNode(int[] head) {
        int mid = head.length / 2;
        int len = head.length - mid;
        int[] res = new int[len];
        System.arraycopy(head, mid, res, 0, len);
        return res;
    }
}
""",
    },
    "detect-cycle-in-linked-list": {
        "python": """class Solution:
    def hasCycle(self, head, pos):
        return pos >= 0 and pos < len(head)
""",
        "cpp": """class Solution {
public:
    bool hasCycle(vector<int>& head, int pos) {
        return pos >= 0 && pos < (int)head.size();
    }
};
""",
        "c": """bool hasCycle(int* head, int headSize, int pos) {
    return pos >= 0 && pos < headSize;
}
""",
        "java": """class Solution {
    public boolean hasCycle(int[] head, int pos) {
        return pos >= 0 && pos < head.length;
    }
}
""",
    },
    "reverse-nodes-in-pairs": {
        "python": """class Solution:
    def swapPairs(self, head):
        res = list(head)
        for i in range(0, len(res) - 1, 2):
            res[i], res[i+1] = res[i+1], res[i]
        return res
""",
        "cpp": """class Solution {
public:
    vector<int> swapPairs(vector<int>& head) {
        vector<int> res = head;
        for (size_t i = 0; i + 1 < res.size(); i += 2) {
            swap(res[i], res[i+1]);
        }
        return res;
    }
};
""",
        "c": """int* swapPairs(int* head, int headSize, int* returnSize) {
    int* res = malloc(sizeof(int) * headSize);
    for (int i = 0; i < headSize; i++) res[i] = head[i];
    for (int i = 0; i + 1 < headSize; i += 2) {
        int t = res[i];
        res[i] = res[i+1];
        res[i+1] = t;
    }
    *returnSize = headSize;
    return res;
}
""",
        "java": """class Solution {
    public int[] swapPairs(int[] head) {
        int[] res = head.clone();
        for (int i = 0; i + 1 < res.length; i += 2) {
            int t = res[i];
            res[i] = res[i+1];
            res[i+1] = t;
        }
        return res;
    }
}
""",
    },
}

