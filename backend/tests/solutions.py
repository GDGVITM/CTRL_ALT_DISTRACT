"""Known-correct player solutions in every language, used to validate the harnesses end to end."""

SOLUTIONS: dict[str, dict[str, str]] = {
    "pair-sum-window": {
        "python": """class Solution:
    def solve(self, nums, k):
        seen = {}
        for j, x in enumerate(nums):
            if k - x in seen:
                return [seen[k - x], j]
            seen[x] = j
""",
        "cpp": """class Solution {
public:
    vector<int> solve(vector<int>& nums, int k) {
        unordered_map<int, int> seen;
        for (int j = 0; j < (int)nums.size(); ++j) {
            auto it = seen.find(k - nums[j]);
            if (it != seen.end()) return {it->second, j};
            seen[nums[j]] = j;
        }
        return {};
    }
};
""",
        "c": """static int* _g;
static int cmp(const void* a, const void* b) {
    int x = *(const int*)a, y = *(const int*)b;
    return (_g[x] > _g[y]) - (_g[x] < _g[y]);
}
int* solve(int* nums, int numsSize, int k, int* returnSize) {
    int* idx = malloc(sizeof(int) * numsSize);
    for (int i = 0; i < numsSize; i++) idx[i] = i;
    _g = nums;
    qsort(idx, numsSize, sizeof(int), cmp);
    int l = 0, r = numsSize - 1;
    int* res = malloc(sizeof(int) * 2);
    while (l < r) {
        long long s = (long long)nums[idx[l]] + nums[idx[r]];
        if (s == k) {
            int a = idx[l], b = idx[r];
            res[0] = a < b ? a : b;
            res[1] = a < b ? b : a;
            *returnSize = 2;
            return res;
        }
        if (s < k) l++; else r--;
    }
    *returnSize = 0;
    return res;
}
""",
        "java": """class Solution {
    public int[] solve(int[] nums, int k) {
        HashMap<Integer, Integer> seen = new HashMap<>();
        for (int j = 0; j < nums.length; j++) {
            Integer i = seen.get(k - nums[j]);
            if (i != null) return new int[]{i, j};
            seen.put(nums[j], j);
        }
        return new int[0];
    }
}
""",
    },
    "balanced-brackets": {
        "python": """class Solution:
    def isValid(self, s):
        pairs = {')': '(', ']': '[', '}': '{'}
        st = []
        for ch in s:
            if ch in '([{':
                st.append(ch)
            elif not st or st.pop() != pairs[ch]:
                return False
        return not st
""",
        "cpp": """class Solution {
public:
    bool isValid(string s) {
        vector<char> st;
        for (char ch : s) {
            if (ch == '(' || ch == '[' || ch == '{') st.push_back(ch);
            else {
                if (st.empty()) return false;
                char o = st.back(); st.pop_back();
                if ((ch == ')' && o != '(') || (ch == ']' && o != '[') || (ch == '}' && o != '{')) return false;
            }
        }
        return st.empty();
    }
};
""",
        "c": """bool isValid(char* s) {
    int n = (int)strlen(s), top = 0;
    char* st = malloc(n + 1);
    for (int i = 0; i < n; i++) {
        char ch = s[i];
        if (ch == '(' || ch == '[' || ch == '{') st[top++] = ch;
        else {
            if (top == 0) return false;
            char o = st[--top];
            if ((ch == ')' && o != '(') || (ch == ']' && o != '[') || (ch == '}' && o != '{')) return false;
        }
    }
    return top == 0;
}
""",
        "java": """class Solution {
    public boolean isValid(String s) {
        ArrayDeque<Character> st = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') st.push(ch);
            else {
                if (st.isEmpty()) return false;
                char o = st.pop();
                if ((ch == ')' && o != '(') || (ch == ']' && o != '[') || (ch == '}' && o != '{')) return false;
            }
        }
        return st.isEmpty();
    }
}
""",
    },
    "climbing-stairs": {
        "python": """class Solution:
    def climbStairs(self, n):
        a, b = 1, 1
        for _ in range(n - 1):
            a, b = b, a + b
        return b
""",
        "cpp": """class Solution {
public:
    int climbStairs(int n) {
        long long a = 1, b = 1;
        for (int i = 1; i < n; i++) { long long t = a + b; a = b; b = t; }
        return (int)b;
    }
};
""",
        "c": """int climbStairs(int n) {
    long long a = 1, b = 1;
    for (int i = 1; i < n; i++) { long long t = a + b; a = b; b = t; }
    return (int)b;
}
""",
        "java": """class Solution {
    public int climbStairs(int n) {
        long a = 1, b = 1;
        for (int i = 1; i < n; i++) { long t = a + b; a = b; b = t; }
        return (int) b;
    }
}
""",
    },
    "max-subarray-sum": {
        "python": """class Solution:
    def maxSubArray(self, nums):
        best = cur = nums[0]
        for x in nums[1:]:
            cur = max(x, cur + x)
            best = max(best, cur)
        return best
""",
        "cpp": """class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = nums[0], cur = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            cur = max(nums[i], cur + nums[i]);
            best = max(best, cur);
        }
        return best;
    }
};
""",
        "c": """int maxSubArray(int* nums, int numsSize) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < numsSize; i++) {
        cur = nums[i] > cur + nums[i] ? nums[i] : cur + nums[i];
        if (cur > best) best = cur;
    }
    return best;
}
""",
        "java": """class Solution {
    public int maxSubArray(int[] nums) {
        int best = nums[0], cur = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            best = Math.max(best, cur);
        }
        return best;
    }
}
""",
    },
    "longest-unique-substring": {
        "python": """class Solution:
    def lengthOfLongestSubstring(self, s):
        last = {}
        best = start = 0
        for i, ch in enumerate(s):
            if ch in last and last[ch] >= start:
                start = last[ch] + 1
            last[ch] = i
            best = max(best, i - start + 1)
        return best
""",
        "cpp": """class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(128, -1);
        int best = 0, start = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            if (last[(int)s[i]] >= start) start = last[(int)s[i]] + 1;
            last[(int)s[i]] = i;
            best = max(best, i - start + 1);
        }
        return best;
    }
};
""",
        "c": """int lengthOfLongestSubstring(char* s) {
    int last[128];
    for (int i = 0; i < 128; i++) last[i] = -1;
    int best = 0, start = 0, n = (int)strlen(s);
    for (int i = 0; i < n; i++) {
        if (last[(int)s[i]] >= start) start = last[(int)s[i]] + 1;
        last[(int)s[i]] = i;
        if (i - start + 1 > best) best = i - start + 1;
    }
    return best;
}
""",
        "java": """class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        Arrays.fill(last, -1);
        int best = 0, start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (last[c] >= start) start = last[c] + 1;
            last[c] = i;
            best = Math.max(best, i - start + 1);
        }
        return best;
    }
}
""",
    },
    "rotate-array": {
        "python": """class Solution:
    def rotate(self, nums, k):
        k %= len(nums)
        return nums[len(nums) - k:] + nums[:len(nums) - k]
""",
        "cpp": """class Solution {
public:
    vector<int> rotate(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> res(n);
        for (int i = 0; i < n; i++) res[(int)(((long long)i + k) % n)] = nums[i];
        return res;
    }
};
""",
        "c": """int* rotate(int* nums, int numsSize, int k, int* returnSize) {
    int* res = malloc(sizeof(int) * numsSize);
    for (int i = 0; i < numsSize; i++) res[(int)(((long long)i + k) % numsSize)] = nums[i];
    *returnSize = numsSize;
    return res;
}
""",
        "java": """class Solution {
    public int[] rotate(int[] nums, int k) {
        int n = nums.length;
        int[] res = new int[n];
        for (int i = 0; i < n; i++) res[(int) (((long) i + k) % n)] = nums[i];
        return res;
    }
}
""",
    },
}

SOLUTIONS["coin-change"] = {
    "python": """class Solution:
    def coinChange(self, coins, amount):
        inf = amount + 1
        dp = [0] + [inf] * amount
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a and dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
        return dp[amount] if dp[amount] != inf else -1
""",
}
SOLUTIONS["longest-increasing-subsequence"] = {
    "python": """import bisect

class Solution:
    def lengthOfLIS(self, nums):
        tails = []
        for x in nums:
            i = bisect.bisect_left(tails, x)
            if i == len(tails):
                tails.append(x)
            else:
                tails[i] = x
        return len(tails)
""",
}
SOLUTIONS["trapping-rain-water"] = {
    "python": """class Solution:
    def trap(self, height):
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
""",
}
SOLUTIONS["subarray-sum-equals-k"] = {
    "python": """from collections import Counter

class Solution:
    def subarraySum(self, nums, k):
        seen = Counter({0: 1})
        prefix = count = 0
        for x in nums:
            prefix += x
            count += seen[prefix - k]
            seen[prefix] += 1
        return count
""",
}
