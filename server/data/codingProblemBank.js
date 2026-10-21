/**
 * Initial Bank of 30 Original Coding Problems
 * Organized by Topic (10 topics) and Difficulty (10 Easy, 15 Medium, 5 Hard).
 * Each problem includes original description, constraints, starter templates,
 * trusted reference solution, sample tests, and hidden edge cases.
 */

const CODING_PROBLEMS_BANK = [
  // ==========================================
  // TOPIC 1: Arrays & Strings (1 Easy, 1 Medium, 1 Hard)
  // ==========================================
  {
    slug: 'palindrome-phrase-validator',
    title: 'Palindrome Phrase Validator',
    topic: 'Arrays & Strings',
    difficulty: 'Easy',
    description: `A phrase is considered a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    constraints: ['1 <= s.length <= 2 * 10^5', 's consists of printable ASCII characters.'],
    hints: ['Filter out non-alphanumeric characters first, or use two pointers from both ends.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `// Read input from standard input\nconst s = readline() || '';\n\nfunction isPalindrome(str) {\n  // Write your solution here\n  return false;\n}\n\nconsole.log(isPalindrome(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\n\ndef is_palindrome(s: str) -> bool:\n    # Write your solution here\n    return False\n\nprint(str(is_palindrome(s)).lower())`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nbool isPalindrome(string s) {\n    // Write your solution here\n    return false;\n}\n\nint main() {\n    string s;\n    getline(cin, s);\n    cout << (isPalindrome(s) ? "true" : "false") << endl;\n    return 0;\n}`,
      java: `import java.util.Scanner;\n\npublic class Solution {\n    public static boolean isPalindrome(String s) {\n        // Write your solution here\n        return false;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : "";\n        System.out.println(isPalindrome(s));\n    }\n}`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = readline() || '';
const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
let l = 0, r = cleaned.length - 1;
let isPal = true;
while (l < r) {
  if (cleaned[l] !== cleaned[r]) {
    isPal = false;
    break;
  }
  l++;
  r--;
}
console.log(isPal ? 'true' : 'false');`
    },
    testCases: [
      {
        input: 'A man, a plan, a canal: Panama',
        expectedOutput: 'true',
        isHidden: false,
        explanation: '"amanaplanacanalpanama" is a palindrome.'
      },
      {
        input: 'race a car',
        expectedOutput: 'false',
        isHidden: false,
        explanation: '"raceacar" is not a palindrome.'
      },
      {
        input: ' ',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty string after removing non-alphanumeric chars is a valid palindrome.'
      },
      {
        input: '0P',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Letters and numbers mixed.'
      },
      {
        input: '12321',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: 'No lemon, no melon',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'run-length-compression-decoder',
    title: 'Run-Length Compression Decoder',
    topic: 'Arrays & Strings',
    difficulty: 'Medium',
    description: `Given an encoded string where repetitions are written in the format \`k[encoded_string]\`, decode the string and output the result. 

The encoding rule is: \`k[encoded_string]\` where the \`encoded_string\` inside the square brackets is being repeated exactly \`k\` times. Note that \`k\` is guaranteed to be a positive integer.

You may assume that the input string is always valid and well-formed. Digits are only used for repeating counts \`k\`. Nested patterns like \`2[3[a]b]\` are supported.`,
    constraints: ['1 <= s.length <= 1000', 's consists of lowercase English letters, digits, and square brackets [].', '1 <= k <= 300'],
    hints: ['Use a stack to keep track of previous strings and repetition multipliers.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const s = readline() || '';\n\nfunction decodeString(str) {\n  // Write your solution here\n  return '';\n}\n\nconsole.log(decodeString(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\n\ndef decode_string(s: str) -> str:\n    # Write your solution here\n    return ""\n\nprint(decode_string(s))`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nstring decodeString(string s) {\n    return "";\n}\n\nint main() {\n    string s;\n    cin >> s;\n    cout << decodeString(s) << endl;\n    return 0;\n}`,
      java: `import java.util.Scanner;\n\npublic class Solution {\n    public static String decodeString(String s) {\n        return "";\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next() : "";\n        System.out.println(decodeString(s));\n    }\n}`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = readline() || '';
const countStack = [];
const strStack = [];
let currStr = '';
let currNum = 0;

for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch >= '0' && ch <= '9') {
    currNum = currNum * 10 + parseInt(ch, 10);
  } else if (ch === '[') {
    countStack.push(currNum);
    strStack.push(currStr);
    currStr = '';
    currNum = 0;
  } else if (ch === ']') {
    const repeatCount = countStack.pop();
    const prevStr = strStack.pop();
    currStr = prevStr + currStr.repeat(repeatCount);
  } else {
    currStr += ch;
  }
}
console.log(currStr);`
    },
    testCases: [
      {
        input: '3[a]2[bc]',
        expectedOutput: 'aaabcbc',
        isHidden: false,
        explanation: '3 times "a" followed by 2 times "bc"'
      },
      {
        input: '3[a2[c]]',
        expectedOutput: 'accaccacc',
        isHidden: false,
        explanation: 'Nested: a followed by 2 c produces acc, repeated 3 times'
      },
      {
        input: '2[abc]3[cd]ef',
        expectedOutput: 'abcabccdcdcdef',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: '10[a]',
        expectedOutput: 'aaaaaaaaaa',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Multi-digit count'
      },
      {
        input: 'xyz',
        expectedOutput: 'xyz',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'String without brackets'
      }
    ]
  },
  {
    slug: 'longest-valid-bracket-span',
    title: 'Longest Valid Bracket Span',
    topic: 'Arrays & Strings',
    difficulty: 'Hard',
    description: `Given a string containing just the characters \`'('\` and \`')'\`, return the length of the longest valid (well-formed and continuous) parentheses substring.`,
    constraints: ['0 <= s.length <= 3 * 10^4', 's[i] is either ( or )'],
    hints: ['You can use a stack initialized with -1, or compute counts with two passes (left-to-right and right-to-left).'],
    timeLimitMs: 2000,
    maxScore: 50,
    starterCode: {
      javascript: `const s = readline() || '';\n\nfunction longestValidParentheses(str) {\n  return 0;\n}\n\nconsole.log(longestValidParentheses(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\ndef longest_valid(s: str) -> int:\n    return 0\nprint(longest_valid(s))`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint longestValid(string s) { return 0; }\nint main() { string s; cin >> s; cout << longestValid(s) << endl; return 0; }`,
      java: `import java.util.Scanner;\npublic class Solution {\n    public static int longestValid(String s) { return 0; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next() : "";\n        System.out.println(longestValid(s));\n    }\n}`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = (readline() || '').trim();
const stack = [-1];
let maxLen = 0;

for (let i = 0; i < s.length; i++) {
  if (s[i] === '(') {
    stack.push(i);
  } else {
    stack.pop();
    if (stack.length === 0) {
      stack.push(i);
    } else {
      maxLen = Math.max(maxLen, i - stack[stack.length - 1]);
    }
  }
}
console.log(maxLen);`
    },
    testCases: [
      {
        input: '(()',
        expectedOutput: '2',
        isHidden: false,
        explanation: 'The longest valid parentheses substring is "()"'
      },
      {
        input: ')()())',
        expectedOutput: '4',
        isHidden: false,
        explanation: 'The longest valid parentheses substring is "()()"'
      },
      {
        input: '',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty string has length 0'
      },
      {
        input: '(((((((',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'No closing brackets'
      },
      {
        input: '()(()))))',
        expectedOutput: '6',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },

  // ==========================================
  // TOPIC 2: Hashing (1 Easy, 1 Medium, 1 Hard)
  // ==========================================
  {
    slug: 'first-unique-character-index',
    title: 'First Unique Character Index',
    topic: 'Hashing',
    difficulty: 'Easy',
    description: `Given a string \`s\`, find the first non-repeating character in it and print its 0-based index. If it does not exist, return \`-1\`.`,
    constraints: ['1 <= s.length <= 10^5', 's consists of only lowercase English letters.'],
    hints: ['Count frequency of each character using a hash map or frequency array, then find first character with frequency 1.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const s = readline() || '';\nfunction firstUniqChar(str) {\n  return -1;\n}\nconsole.log(firstUniqChar(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\ndef first_uniq(s: str) -> int:\n    return -1\nprint(first_uniq(s))`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint firstUniq(string s) { return -1; }\nint main() { string s; cin >> s; cout << firstUniq(s) << endl; return 0; }`,
      java: `import java.util.Scanner;\npublic class Solution {\n    public static int firstUniq(String s) { return -1; }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNext() ? sc.next() : "";\n        System.out.println(firstUniq(s));\n    }\n}`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = (readline() || '').trim();
const freq = {};
for (let i = 0; i < s.length; i++) {
  freq[s[i]] = (freq[s[i]] || 0) + 1;
}
let ans = -1;
for (let i = 0; i < s.length; i++) {
  if (freq[s[i]] === 1) {
    ans = i;
    break;
  }
}
console.log(ans);`
    },
    testCases: [
      {
        input: 'copilot',
        expectedOutput: '0',
        isHidden: false,
        explanation: 'Character "c" at index 0 is non-repeating.'
      },
      {
        input: 'loveplacement',
        expectedOutput: '1',
        isHidden: false,
        explanation: 'Character "o" at index 1 is the first unique character.'
      },
      {
        input: 'aabbcc',
        expectedOutput: '-1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'All characters repeat.'
      },
      {
        input: 'z',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single character string.'
      },
      {
        input: 'dddccdbba',
        expectedOutput: '8',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'grouped-anagram-vault',
    title: 'Grouped Anagram Vault',
    topic: 'Hashing',
    difficulty: 'Medium',
    description: `Given an array of strings \`strs\`, group the anagrams together. 

Print the groups sorted lexicographically. Inside each group, words should be sorted alphabetically, and the output format should be one group per line joined by commas, or separated by brackets.

Input format: A single line with space-separated words.
Output format: Each group sorted alphabetically joined by a space, with groups sorted by their first word.`,
    constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'strs[i] consists of lowercase English letters.'],
    hints: ['Sort each word to create a canonical hash key.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const input = readline() || '';\nconst words = input.trim().split(/\\s+/).filter(Boolean);\nfunction groupAnagrams(list) { return []; }\n// Print formatted groups`,
      python: `import sys\nwords = sys.stdin.read().split()\ndef group_anagrams(words):\n    return []`,
      cpp: `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const input = readline() || '';
const words = input.trim().split(/\\s+/).filter(Boolean);
if (words.length === 0) {
  console.log('');
} else {
  const map = new Map();
  for (const w of words) {
    const key = w.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  }
  const groups = Array.from(map.values()).map((g) => g.sort());
  groups.sort((a, b) => a[0].localeCompare(b[0]));
  const output = groups.map((g) => g.join(' ')).join(' | ');
  console.log(output);
}`
    },
    testCases: [
      {
        input: 'eat tea tan ate nat bat',
        expectedOutput: 'ate eat tea | bat | nat tan',
        isHidden: false,
        explanation: 'Three anagram groups sorted by their first member.'
      },
      {
        input: 'listen silent enlist google',
        expectedOutput: 'enlist listen silent | google',
        isHidden: false
      },
      {
        input: 'a',
        expectedOutput: 'a',
        isHidden: true,
        isEdgeCase: true
      },
      {
        input: 'rat tar art star rats',
        expectedOutput: 'art rat tar | rats star',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'maximum-subarray-sum-zero',
    title: 'Maximum Subarray Sum Zero',
    topic: 'Hashing',
    difficulty: 'Hard',
    description: `Given an array of integers \`arr\`, find the length of the longest contiguous subarray whose sum is equal to \`0\`. If no such subarray exists, return \`0\`.

Input: A single line of space-separated integers.
Output: An integer representing the maximum length.`,
    constraints: ['1 <= arr.length <= 10^5', '-10^5 <= arr[i] <= 10^5'],
    hints: ['Use prefix sum and a hash map to store the first occurrence of each prefix sum.'],
    timeLimitMs: 2000,
    maxScore: 50,
    starterCode: {
      javascript: `const line = readline() || '';\nconst arr = line.trim().split(/\\s+/).map(Number);\nfunction maxLenZeroSum(nums) {\n  return 0;\n}\nconsole.log(maxLenZeroSum(arr));`,
      python: `import sys\nnums = list(map(int, sys.stdin.read().split()))\ndef max_len(nums):\n    return 0\nprint(max_len(nums))`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const line = readline() || '';
const arr = line.trim().split(/\\s+/).filter(Boolean).map(Number);
const map = new Map();
map.set(0, -1);
let sum = 0;
let maxLen = 0;

for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
  if (map.has(sum)) {
    maxLen = Math.max(maxLen, i - map.get(sum));
  } else {
    map.set(sum, i);
  }
}
console.log(maxLen);`
    },
    testCases: [
      {
        input: '15 -2 2 -8 1 7 10 23',
        expectedOutput: '5',
        isHidden: false,
        explanation: 'Subarray [-2, 2, -8, 1, 7] has sum 0 and length 5.'
      },
      {
        input: '1 2 3',
        expectedOutput: '0',
        isHidden: false,
        explanation: 'No subarray sums to 0.'
      },
      {
        input: '0 0 0 0',
        expectedOutput: '4',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'All zeroes has maximum length 4.'
      },
      {
        input: '1 -1 1 -1 1 -1',
        expectedOutput: '6',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: '-5',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true
      }
    ]
  },

  // ==========================================
  // TOPIC 3: Sorting & Searching (1 Easy, 2 Medium)
  // ==========================================
  {
    slug: 'find-insertion-index',
    title: 'Find Insertion Index',
    topic: 'Sorting & Searching',
    difficulty: 'Easy',
    description: `Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.

You must write an algorithm with \`O(log n)\` runtime complexity.

Input:
Line 1: Space-separated sorted integers
Line 2: Target integer`,
    constraints: ['1 <= nums.length <= 10^4', '-10^4 <= nums[i] <= 10^4', 'nums contains distinct values sorted in ascending order.'],
    hints: ['Standard binary search. Return the left pointer if not found.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nconst target = parseInt(readline() || '0', 10);\nfunction searchInsert(arr, val) { return 0; }\nconsole.log(searchInsert(nums, target));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\nnums = list(map(int, lines[0].split()))\ntarget = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const target = parseInt((readline() || '0').trim(), 10);
let l = 0, r = nums.length - 1;
while (l <= r) {
  const mid = Math.floor((l + r) / 2);
  if (nums[mid] === target) {
    console.log(mid);
    process.exit(0);
  } else if (nums[mid] < target) {
    l = mid + 1;
  } else {
    r = mid - 1;
  }
}
console.log(l);`
    },
    testCases: [
      {
        input: '1 3 5 6\n5',
        expectedOutput: '2',
        isHidden: false,
        explanation: '5 is at index 2.'
      },
      {
        input: '1 3 5 6\n2',
        expectedOutput: '1',
        isHidden: false,
        explanation: '2 should be inserted at index 1.'
      },
      {
        input: '1 3 5 6\n7',
        expectedOutput: '4',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Inserted at end.'
      },
      {
        input: '1 3 5 6\n0',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Inserted at start.'
      },
      {
        input: '10\n10',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true
      }
    ]
  },
  {
    slug: 'search-rotated-ascending-array',
    title: 'Search in Rotated Ascending Array',
    topic: 'Sorting & Searching',
    difficulty: 'Medium',
    description: `There is an integer array \`nums\` sorted in ascending order (with distinct values) that was rotated at an unknown pivot index. 

Given the array \`nums\` and an integer \`target\`, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

Runtime complexity must be \`O(log n)\`.

Input:
Line 1: Space-separated integers
Line 2: Target integer`,
    constraints: ['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4', 'All values of nums are unique.'],
    hints: ['One half of the rotated array is always strictly sorted.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nconst target = parseInt(readline() || '0', 10);\nfunction search(arr, val) { return -1; }\nconsole.log(search(nums, target));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\nnums = list(map(int, lines[0].split()))\ntarget = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const target = parseInt((readline() || '0').trim(), 10);
let l = 0, r = nums.length - 1;
let ans = -1;

while (l <= r) {
  const mid = Math.floor((l + r) / 2);
  if (nums[mid] === target) {
    ans = mid;
    break;
  }
  // Check if left half is sorted
  if (nums[l] <= nums[mid]) {
    if (nums[l] <= target && target < nums[mid]) {
      r = mid - 1;
    } else {
      l = mid + 1;
    }
  } else {
    // Right half is sorted
    if (nums[mid] < target && target <= nums[r]) {
      l = mid + 1;
    } else {
      r = mid - 1;
    }
  }
}
console.log(ans);`
    },
    testCases: [
      {
        input: '4 5 6 7 0 1 2\n0',
        expectedOutput: '4',
        isHidden: false,
        explanation: '0 is found at index 4.'
      },
      {
        input: '4 5 6 7 0 1 2\n3',
        expectedOutput: '-1',
        isHidden: false,
        explanation: '3 is not in array.'
      },
      {
        input: '1\n0',
        expectedOutput: '-1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single element array.'
      },
      {
        input: '1\n1',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true
      },
      {
        input: '5 1 3\n5',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'kth-largest-stream-element',
    title: 'Kth Largest Array Element',
    topic: 'Sorting & Searching',
    difficulty: 'Medium',
    description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\`th largest element in the array.

Note that it is the \`k\`th largest element in sorted order, not the \`k\`th distinct element.

Input:
Line 1: Space-separated integers
Line 2: Integer k`,
    constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    hints: ['Sort the array or use Quickselect for O(N) average time.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nconst k = parseInt(readline() || '1', 10);\nfunction findKthLargest(arr, kVal) { return 0; }\nconsole.log(findKthLargest(nums, k));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\nnums = list(map(int, lines[0].split()))\nk = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const k = parseInt((readline() || '1').trim(), 10);
nums.sort((a, b) => b - a);
console.log(nums[k - 1]);`
    },
    testCases: [
      {
        input: '3 2 1 5 6 4\n2',
        expectedOutput: '5',
        isHidden: false,
        explanation: 'Sorted: [6, 5, 4, 3, 2, 1]. 2nd largest is 5.'
      },
      {
        input: '3 2 3 1 2 4 5 5 6\n4',
        expectedOutput: '4',
        isHidden: false,
        explanation: 'Duplicates are counted.'
      },
      {
        input: '-1 -2 -3 -4\n1',
        expectedOutput: '-1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Negative numbers with k=1.'
      },
      {
        input: '100\n1',
        expectedOutput: '100',
        isHidden: true,
        isEdgeCase: true
      },
      {
        input: '7 10 4 3 20 15\n3',
        expectedOutput: '10',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },

  // ==========================================
  // TOPIC 4: Two Pointers (1 Easy, 2 Medium)
  // ==========================================
  {
    slug: 'pair-sum-sorted-target',
    title: 'Pair Sum in Sorted Array',
    topic: 'Two Pointers',
    difficulty: 'Easy',
    description: `Given a 1-indexed array of integers \`numbers\` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific \`target\` number.

Return the indices of the two numbers, \`index1\` and \`index2\`, added by one as two space-separated integers \`index1 index2\`.

Input:
Line 1: Space-separated sorted integers
Line 2: Target integer`,
    constraints: ['2 <= numbers.length <= 3 * 10^4', '-1000 <= numbers[i] <= 1000', 'numbers is sorted in non-decreasing order.', 'Exactly one solution exists.'],
    hints: ['Place one pointer at start and one pointer at end.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nconst target = parseInt(readline() || '0', 10);\n// Two pointer logic`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\nnums = list(map(int, lines[0].split()))\ntarget = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const target = parseInt((readline() || '0').trim(), 10);
let l = 0, r = nums.length - 1;
while (l < r) {
  const sum = nums[l] + nums[r];
  if (sum === target) {
    console.log((l + 1) + ' ' + (r + 1));
    break;
  } else if (sum < target) {
    l++;
  } else {
    r--;
  }
}`
    },
    testCases: [
      {
        input: '2 7 11 15\n9',
        expectedOutput: '1 2',
        isHidden: false,
        explanation: '2 + 7 = 9. 1-indexed positions 1 and 2.'
      },
      {
        input: '2 3 4\n6',
        expectedOutput: '1 3',
        isHidden: false,
        explanation: '2 + 4 = 6. Indices 1 and 3.'
      },
      {
        input: '-1 0\n-1',
        expectedOutput: '1 2',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Negative numbers.'
      },
      {
        input: '-5 -3 1 4 9\n-2',
        expectedOutput: '2 3',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'container-most-water-reservoir',
    title: 'Container With Most Water',
    topic: 'Two Pointers',
    difficulty: 'Medium',
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i\`th line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.

Input: Space-separated integers representing heights.`,
    constraints: ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
    hints: ['Always move the pointer pointing to the shorter vertical bar inward.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const height = (readline() || '').trim().split(/\\s+/).map(Number);\nfunction maxArea(h) { return 0; }\nconsole.log(maxArea(height));`,
      python: `import sys\nh = list(map(int, sys.stdin.read().split()))\ndef max_area(height):\n    return 0\nprint(max_area(h))`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const h = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
let l = 0, r = h.length - 1;
let maxWater = 0;
while (l < r) {
  const width = r - l;
  const currentArea = Math.min(h[l], h[r]) * width;
  maxWater = Math.max(maxWater, currentArea);
  if (h[l] < h[r]) {
    l++;
  } else {
    r--;
  }
}
console.log(maxWater);`
    },
    testCases: [
      {
        input: '1 8 6 2 5 4 8 3 7',
        expectedOutput: '49',
        isHidden: false,
        explanation: 'Between heights 8 and 7, distance is 7, min height 7, area 49.'
      },
      {
        input: '1 1',
        expectedOutput: '1',
        isHidden: false,
        explanation: 'Min height 1, distance 1, area 1.'
      },
      {
        input: '4 3 2 1 4',
        expectedOutput: '16',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Boundary bars of height 4.'
      },
      {
        input: '1 2 1',
        expectedOutput: '2',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'three-sum-target-zero',
    title: 'Three Sum Zero Count',
    topic: 'Two Pointers',
    difficulty: 'Medium',
    description: `Given an integer array \`nums\`, return the total count of distinct triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.

Input: Space-separated integers.`,
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    hints: ['Sort the array, then iterate through each element and use two pointers for the remaining pair.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nfunction threeSumCount(arr) { return 0; }\nconsole.log(threeSumCount(nums));`,
      python: `import sys\nnums = list(map(int, sys.stdin.read().split()))\ndef three_sum(nums):\n    return 0\nprint(three_sum(nums))`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
nums.sort((a, b) => a - b);
let count = 0;

for (let i = 0; i < nums.length - 2; i++) {
  if (i > 0 && nums[i] === nums[i - 1]) continue;
  let l = i + 1;
  let r = nums.length - 1;
  while (l < r) {
    const sum = nums[i] + nums[l] + nums[r];
    if (sum === 0) {
      count++;
      while (l < r && nums[l] === nums[l + 1]) l++;
      while (l < r && nums[r] === nums[r - 1]) r--;
      l++;
      r--;
    } else if (sum < 0) {
      l++;
    } else {
      r--;
    }
  }
}
console.log(count);`
    },
    testCases: [
      {
        input: '-1 0 1 2 -1 -4',
        expectedOutput: '2',
        isHidden: false,
        explanation: 'Triplets are [-1, -1, 2] and [-1, 0, 1]. Count is 2.'
      },
      {
        input: '0 1 1',
        expectedOutput: '0',
        isHidden: false,
        explanation: 'No triplets sum to 0.'
      },
      {
        input: '0 0 0 0',
        expectedOutput: '1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Unique triplet [0, 0, 0].'
      },
      {
        input: '-2 0 1 1 2',
        expectedOutput: '2',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },

  // ==========================================
  // TOPIC 5: Sliding Window (1 Easy, 1 Medium, 1 Hard)
  // ==========================================
  {
    slug: 'maximum-average-subarray-k',
    title: 'Maximum Average Subarray',
    topic: 'Sliding Window',
    difficulty: 'Easy',
    description: `You are given an integer array \`nums\` consisting of \`n\` elements, and an integer \`k\`.

Find a contiguous subarray whose length is equal to \`k\` that has the maximum average value and return this value formatted to 2 decimal places.

Input:
Line 1: Space-separated integers
Line 2: Integer k`,
    constraints: ['n == nums.length', '1 <= k <= n <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    hints: ['Compute the sum of the first k elements, then slide the window by adding the next and subtracting the first.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const nums = (readline() || '').trim().split(/\\s+/).map(Number);\nconst k = parseInt(readline() || '1', 10);\nfunction findMaxAverage(arr, kVal) { return '0.00'; }\nconsole.log(findMaxAverage(nums, k));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\nnums = list(map(int, lines[0].split()))\nk = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const nums = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const k = parseInt((readline() || '1').trim(), 10);
let currentSum = 0;
for (let i = 0; i < k; i++) {
  currentSum += nums[i];
}
let maxSum = currentSum;
for (let i = k; i < nums.length; i++) {
  currentSum += nums[i] - nums[i - k];
  maxSum = Math.max(maxSum, currentSum);
}
const avg = maxSum / k;
console.log(avg.toFixed(2));`
    },
    testCases: [
      {
        input: '1 12 -5 -6 50 3\n4',
        expectedOutput: '12.75',
        isHidden: false,
        explanation: 'Subarray [12, -5, -6, 50] has sum 51, average 51 / 4 = 12.75.'
      },
      {
        input: '5\n1',
        expectedOutput: '5.00',
        isHidden: false
      },
      {
        input: '-1 -2 -3 -4\n2',
        expectedOutput: '-1.50',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'All negative numbers.'
      },
      {
        input: '0 4 0 3 2\n1',
        expectedOutput: '4.00',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'longest-unique-substring-length',
    title: 'Longest Substring Without Repeating Characters',
    topic: 'Sliding Window',
    difficulty: 'Medium',
    description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

Input: Single line string.`,
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
    hints: ['Maintain a sliding window [l, r] and a set of visited characters.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const s = readline() || '';\nfunction lengthOfLongestSubstring(str) { return 0; }\nconsole.log(lengthOfLongestSubstring(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\ndef length_of_longest(s):\n    return 0\nprint(length_of_longest(s))`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = readline() || '';
const seen = new Map();
let maxLen = 0;
let l = 0;

for (let r = 0; r < s.length; r++) {
  const ch = s[r];
  if (seen.has(ch) && seen.get(ch) >= l) {
    l = seen.get(ch) + 1;
  }
  seen.set(ch, r);
  maxLen = Math.max(maxLen, r - l + 1);
}
console.log(maxLen);`
    },
    testCases: [
      {
        input: 'abcabcbb',
        expectedOutput: '3',
        isHidden: false,
        explanation: 'Longest substring is "abc" with length 3.'
      },
      {
        input: 'bbbbb',
        expectedOutput: '1',
        isHidden: false,
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 'pwwkew',
        expectedOutput: '3',
        isHidden: false,
        explanation: 'The answer is "wke", with length 3.'
      },
      {
        input: '',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty string has length 0.'
      },
      {
        input: 'a b-c',
        expectedOutput: '5',
        isHidden: true,
        isEdgeCase: false,
        explanation: 'Spaces and punctuation symbols.'
      }
    ]
  },
  {
    slug: 'minimum-window-substring-cover',
    title: 'Minimum Window Substring Cover',
    topic: 'Sliding Window',
    difficulty: 'Hard',
    description: `Given two strings \`s\` and \`t\` of lengths \`m\` and \`n\` respectively, return the minimum window substring of \`s\` such that every character in \`t\` (including duplicates) is included in the window. If there is no such substring, return the empty string \`""\`.

Input:
Line 1: String s
Line 2: String t`,
    constraints: ['m == s.length', 'n == t.length', '1 <= m, n <= 10^5', 's and t consist of uppercase and lowercase English letters.'],
    hints: ['Count characters required from t, expand right pointer until valid, then shrink left pointer.'],
    timeLimitMs: 2000,
    maxScore: 50,
    starterCode: {
      javascript: `const s = readline() || '';\nconst t = readline() || '';\nfunction minWindow(sStr, tStr) { return ''; }\nconsole.log(minWindow(s, t));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\ns = lines[0] if len(lines) > 0 else ""\nt = lines[1] if len(lines) > 1 else ""`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = (readline() || '').trim();
const t = (readline() || '').trim();

if (!s || !t || s.length < t.length) {
  console.log('');
  process.exit(0);
}

const reqMap = {};
for (const ch of t) {
  reqMap[ch] = (reqMap[ch] || 0) + 1;
}

let required = Object.keys(reqMap).length;
let l = 0, r = 0;
let formed = 0;
const windowCounts = {};
let minLen = Infinity;
let ansL = 0, ansR = 0;

while (r < s.length) {
  const c = s[r];
  windowCounts[c] = (windowCounts[c] || 0) + 1;

  if (reqMap[c] && windowCounts[c] === reqMap[c]) {
    formed++;
  }

  while (l <= r && formed === required) {
    if (r - l + 1 < minLen) {
      minLen = r - l + 1;
      ansL = l;
      ansR = r;
    }

    const leftChar = s[l];
    windowCounts[leftChar]--;
    if (reqMap[leftChar] && windowCounts[leftChar] < reqMap[leftChar]) {
      formed--;
    }
    l++;
  }
  r++;
}

console.log(minLen === Infinity ? '' : s.substring(ansL, ansR + 1));`
    },
    testCases: [
      {
        input: 'ADOBECODEBANC\nABC',
        expectedOutput: 'BANC',
        isHidden: false,
        explanation: 'Minimum substring containing A, B, C is "BANC".'
      },
      {
        input: 'a\na',
        expectedOutput: 'a',
        isHidden: false
      },
      {
        input: 'a\naa',
        expectedOutput: '',
        isHidden: true,
        isEdgeCase: true,
        explanation: 't requires two "a"s, but s only has one.'
      },
      {
        input: 'aa\naa',
        expectedOutput: 'aa',
        isHidden: true,
        isEdgeCase: true
      }
    ]
  },

  // ==========================================
  // TOPIC 6: Recursion (1 Easy, 2 Medium)
  // ==========================================
  {
    slug: 'integer-power-exponentiation',
    title: 'Fast Modular Exponentiation',
    topic: 'Recursion',
    difficulty: 'Easy',
    description: `Implement integer power \`pow(base, exp) % MOD\` where \`MOD = 1000000007\`. 

Compute the result in \`O(log exp)\` recursive steps.

Input: Space-separated integers \`base\` and \`exp\` on a single line.`,
    constraints: ['0 <= base <= 10^9', '0 <= exp <= 10^9'],
    hints: ['Use binary exponentiation: if exp is even, pow(b, e) = pow(b, e/2)^2.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const [base, exp] = (readline() || '').trim().split(/\\s+/).map(Number);\nfunction modPow(b, e) { return 0; }\nconsole.log(modPow(base, exp));`,
      python: `import sys\nb, e = map(int, sys.stdin.read().split())`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const [baseStr, expStr] = (readline() || '').trim().split(/\\s+/).filter(Boolean);
const MOD = 1000000007n;
let b = BigInt(baseStr || '0') % MOD;
let e = BigInt(expStr || '0');

function fastPow(base, exp) {
  if (exp === 0n) return 1n;
  let half = fastPow(base, exp / 2n);
  half = (half * half) % MOD;
  if (exp % 2n === 1n) {
    half = (half * base) % MOD;
  }
  return half;
}

console.log(fastPow(b, e).toString());`
    },
    testCases: [
      {
        input: '2 10',
        expectedOutput: '1024',
        isHidden: false,
        explanation: '2^10 = 1024'
      },
      {
        input: '2 0',
        expectedOutput: '1',
        isHidden: false,
        explanation: 'Any number to power 0 is 1.'
      },
      {
        input: '3 5',
        expectedOutput: '243',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: '10 9',
        expectedOutput: '1000000000',
        isHidden: true,
        isEdgeCase: true
      }
    ]
  },
  {
    slug: 'string-permutations-generator',
    title: 'Lexicographical String Permutations',
    topic: 'Recursion',
    difficulty: 'Medium',
    description: `Given a string \`s\` containing unique lowercase characters, generate all distinct permutations of the string and output them sorted in lexicographical order, separated by spaces.

Input: Single line string.`,
    constraints: ['1 <= s.length <= 7', 'All characters in s are unique.'],
    hints: ['Backtracking recursion: swap characters or build substrings recursively.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const s = (readline() || '').trim();\nfunction getPermutations(str) { return []; }\n// Print space-separated permutations`,
      python: `import sys\ns = sys.stdin.read().strip()\ndef permute(s):\n    return []`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = (readline() || '').trim();
const chars = s.split('').sort();
const results = [];
const used = new Array(chars.length).fill(false);

function backtrack(curr) {
  if (curr.length === chars.length) {
    results.push(curr.join(''));
    return;
  }
  for (let i = 0; i < chars.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    curr.push(chars[i]);
    backtrack(curr);
    curr.pop();
    used[i] = false;
  }
}

backtrack([]);
console.log(results.join(' '));`
    },
    testCases: [
      {
        input: 'abc',
        expectedOutput: 'abc acb bac bca cab cba',
        isHidden: false,
        explanation: 'All 6 permutations of "abc" in lexicographical order.'
      },
      {
        input: 'ab',
        expectedOutput: 'ab ba',
        isHidden: false
      },
      {
        input: 'z',
        expectedOutput: 'z',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single character string.'
      }
    ]
  },
  {
    slug: 'target-sum-combinations',
    title: 'Combination Sum Ways',
    topic: 'Recursion',
    difficulty: 'Medium',
    description: `Given an array of distinct integers \`candidates\` and a target integer \`target\`, return the total number of unique combinations where the chosen numbers sum to \`target\`.

The same number may be chosen from \`candidates\` an unlimited number of times.

Input:
Line 1: Space-separated distinct integers
Line 2: Target integer`,
    constraints: ['1 <= candidates.length <= 30', '2 <= candidates[i] <= 40', 'All elements of candidates are distinct.', '1 <= target <= 40'],
    hints: ['Use recursive backtracking, maintaining the current candidate index to avoid duplicate combinations.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const candidates = (readline() || '').trim().split(/\\s+/).map(Number);\nconst target = parseInt(readline() || '0', 10);\nfunction combinationCount(arr, t) { return 0; }\nconsole.log(combinationCount(candidates, target));`,
      python: `import sys\nlines = sys.stdin.read().splitlines()\ncandidates = list(map(int, lines[0].split()))\ntarget = int(lines[1])`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const candidates = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const target = parseInt((readline() || '0').trim(), 10);
let count = 0;

function backtrack(remaining, startIdx) {
  if (remaining === 0) {
    count++;
    return;
  }
  for (let i = startIdx; i < candidates.length; i++) {
    if (remaining >= candidates[i]) {
      backtrack(remaining - candidates[i], i);
    }
  }
}

backtrack(target, 0);
console.log(count);`
    },
    testCases: [
      {
        input: '2 3 6 7\n7',
        expectedOutput: '2',
        isHidden: false,
        explanation: 'Two combinations: [2, 2, 3] and [7].'
      },
      {
        input: '2 3 5\n8',
        expectedOutput: '3',
        isHidden: false,
        explanation: '[2, 2, 2, 2], [2, 3, 3], [3, 5].'
      },
      {
        input: '2\n1',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Target cannot be formed.'
      },
      {
        input: '1\n5',
        expectedOutput: '1',
        isHidden: true,
        isEdgeCase: true
      }
    ]
  },

  // ==========================================
  // TOPIC 7: Linked Lists (1 Easy, 2 Medium)
  // ==========================================
  {
    slug: 'reverse-singly-linked-list',
    title: 'Reverse Singly Linked List',
    topic: 'Linked Lists',
    difficulty: 'Easy',
    description: `Given the head elements of a singly linked list as space-separated integers, reverse the list and return the values space-separated. If the list is empty, return \`EMPTY\`.

Input: Single line with space-separated integers (or blank line for empty).`,
    constraints: ['0 <= node count <= 5000', '-5000 <= node.val <= 5000'],
    hints: ['Iteratively change next pointers with prev, curr, and next.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const input = (readline() || '').trim();\nconst values = input ? input.split(/\\s+/).map(Number) : [];\n// Build list, reverse, and print`,
      python: `import sys\nvals = sys.stdin.read().split()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const input = (readline() || '').trim();
if (!input) {
  console.log('EMPTY');
  process.exit(0);
}
const vals = input.split(/\\s+/).filter(Boolean).map(Number);
vals.reverse();
console.log(vals.join(' '));`
    },
    testCases: [
      {
        input: '1 2 3 4 5',
        expectedOutput: '5 4 3 2 1',
        isHidden: false,
        explanation: 'Reversed list is 5 4 3 2 1.'
      },
      {
        input: '1 2',
        expectedOutput: '2 1',
        isHidden: false
      },
      {
        input: '',
        expectedOutput: 'EMPTY',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty list returns EMPTY.'
      },
      {
        input: '42',
        expectedOutput: '42',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single element list.'
      }
    ]
  },
  {
    slug: 'merge-two-sorted-linked-lists',
    title: 'Merge Two Sorted Linked Lists',
    topic: 'Linked Lists',
    difficulty: 'Medium',
    description: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one sorted list. Return the elements of the merged linked list space-separated. If both lists are empty, return \`EMPTY\`.

Input:
Line 1: Space-separated integers for list1 (or EMPTY)
Line 2: Space-separated integers for list2 (or EMPTY)`,
    constraints: ['The number of nodes in both lists is in the range [0, 50].', '-100 <= Node.val <= 100', 'Both list1 and list2 are sorted in non-decreasing order.'],
    hints: ['Compare head values and advance the pointer with smaller value.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const l1Str = (readline() || '').trim();\nconst l2Str = (readline() || '').trim();\n// Merge sorted values`,
      python: `import sys\nlines = sys.stdin.read().splitlines()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const parseList = (str) => {
  if (!str || str === 'EMPTY') return [];
  return str.split(/\\s+/).filter(Boolean).map(Number);
};

const l1 = parseList(readline() || '');
const l2 = parseList(readline() || '');

const merged = [];
let i = 0, j = 0;
while (i < l1.length && j < l2.length) {
  if (l1[i] <= l2[j]) {
    merged.push(l1[i++]);
  } else {
    merged.push(l2[j++]);
  }
}
while (i < l1.length) merged.push(l1[i++]);
while (j < l2.length) merged.push(l2[j++]);

console.log(merged.length === 0 ? 'EMPTY' : merged.join(' '));`
    },
    testCases: [
      {
        input: '1 2 4\n1 3 4',
        expectedOutput: '1 1 2 3 4 4',
        isHidden: false,
        explanation: 'Merged in non-decreasing order.'
      },
      {
        input: 'EMPTY\n0',
        expectedOutput: '0',
        isHidden: false
      },
      {
        input: 'EMPTY\nEMPTY',
        expectedOutput: 'EMPTY',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Both empty.'
      },
      {
        input: '5 10 15\n1 2 3',
        expectedOutput: '1 2 3 5 10 15',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'remove-nth-node-from-end',
    title: 'Remove Nth Node From End of List',
    topic: 'Linked Lists',
    difficulty: 'Medium',
    description: `Given the head of a linked list, remove the \`n\`th node from the end of the list and return its elements. If the resulting list is empty, return \`EMPTY\`.

Input:
Line 1: Space-separated integers representing list nodes
Line 2: Integer n`,
    constraints: ['The number of nodes in the list is sz.', '1 <= sz <= 30', '0 <= Node.val <= 100', '1 <= n <= sz'],
    hints: ['Use two pointers separated by n steps.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const listStr = (readline() || '').trim();\nconst n = parseInt(readline() || '1', 10);\n// Logic here`,
      python: `import sys\nlines = sys.stdin.read().splitlines()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const listStr = (readline() || '').trim();
const n = parseInt((readline() || '1').trim(), 10);
const vals = listStr.split(/\\s+/).filter(Boolean).map(Number);
const removeIdx = vals.length - n;
vals.splice(removeIdx, 1);
console.log(vals.length === 0 ? 'EMPTY' : vals.join(' '));`
    },
    testCases: [
      {
        input: '1 2 3 4 5\n2',
        expectedOutput: '1 2 3 5',
        isHidden: false,
        explanation: '2nd node from end (4) is removed.'
      },
      {
        input: '1\n1',
        expectedOutput: 'EMPTY',
        isHidden: false,
        explanation: 'Single node removed leaves EMPTY list.'
      },
      {
        input: '1 2\n1',
        expectedOutput: '1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Remove tail node.'
      },
      {
        input: '1 2\n2',
        expectedOutput: '2',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Remove head node.'
      }
    ]
  },

  // ==========================================
  // TOPIC 8: Stacks & Queues (1 Easy, 1 Medium, 1 Hard)
  // ==========================================
  {
    slug: 'valid-bracket-pairs-validator',
    title: 'Valid Bracket Pairs Validator',
    topic: 'Stacks & Queues',
    difficulty: 'Easy',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Output \`true\` or \`false\`.`,
    constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only ()[]{}.'],
    hints: ['Push opening brackets onto a stack and match them when a closing bracket is found.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const s = readline() || '';\nfunction isValid(str) { return false; }\nconsole.log(isValid(s));`,
      python: `import sys\ns = sys.stdin.read().strip()\ndef is_valid(s):\n    return False\nprint(str(is_valid(s)).lower())`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const s = (readline() || '').trim();
const stack = [];
const match = { ')': '(', '}': '{', ']': '[' };
let valid = true;

for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '(' || ch === '{' || ch === '[') {
    stack.push(ch);
  } else {
    if (stack.length === 0 || stack.pop() !== match[ch]) {
      valid = false;
      break;
    }
  }
}
if (stack.length > 0) valid = false;
console.log(valid ? 'true' : 'false');`
    },
    testCases: [
      {
        input: '()',
        expectedOutput: 'true',
        isHidden: false
      },
      {
        input: '()[]{}',
        expectedOutput: 'true',
        isHidden: false
      },
      {
        input: '(]',
        expectedOutput: 'false',
        isHidden: false
      },
      {
        input: '([)]',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Mismatched order.'
      },
      {
        input: '{[]}',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: '[',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Unclosed bracket.'
      }
    ]
  },
  {
    slug: 'daily-temperatures-wait-days',
    title: 'Daily Temperatures Wait Days',
    topic: 'Stacks & Queues',
    difficulty: 'Medium',
    description: `Given an array of integers \`temperatures\` representing the daily temperatures, return an array \`answer\` such that \`answer[i]\` is the number of days you have to wait after the \`i\`th day to get a warmer temperature. If there is no future day for which this is possible, keep \`answer[i] == 0\` instead.

Input: Space-separated integers representing temperatures.
Output: Space-separated integers representing wait days.`,
    constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
    hints: ['Monotonic decreasing stack holding indices.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const temps = (readline() || '').trim().split(/\\s+/).map(Number);\nfunction dailyTemperatures(t) { return []; }\n// Print space-separated`,
      python: `import sys\ntemps = list(map(int, sys.stdin.read().split()))`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const temps = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const n = temps.length;
const ans = new Array(n).fill(0);
const stack = []; // Stores indices

for (let i = 0; i < n; i++) {
  while (stack.length > 0 && temps[i] > temps[stack[stack.length - 1]]) {
    const prevIdx = stack.pop();
    ans[prevIdx] = i - prevIdx;
  }
  stack.push(i);
}
console.log(ans.join(' '));`
    },
    testCases: [
      {
        input: '73 74 75 71 69 72 76 73',
        expectedOutput: '1 1 4 2 1 1 0 0',
        isHidden: false,
        explanation: 'Standard wait day calculations.'
      },
      {
        input: '30 40 50 60',
        expectedOutput: '1 1 1 0',
        isHidden: false
      },
      {
        input: '30 60 90',
        expectedOutput: '1 1 0',
        isHidden: true,
        isEdgeCase: false
      },
      {
        input: '90 80 70',
        expectedOutput: '0 0 0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Strictly decreasing temperatures.'
      }
    ]
  },
  {
    slug: 'largest-histogram-rectangle-area',
    title: 'Largest Histogram Rectangle Area',
    topic: 'Stacks & Queues',
    difficulty: 'Hard',
    description: `Given an array of integers \`heights\` representing the histogram's bar height where the width of each bar is \`1\`, return the area of the largest rectangle in the histogram.

Input: Space-separated integers representing heights.`,
    constraints: ['1 <= heights.length <= 10^5', '0 <= heights[i] <= 10^4'],
    hints: ['Monotonic increasing stack holding indices. When a smaller bar appears, calculate area for bars popped.'],
    timeLimitMs: 2000,
    maxScore: 50,
    starterCode: {
      javascript: `const heights = (readline() || '').trim().split(/\\s+/).map(Number);\nfunction largestRectangleArea(h) { return 0; }\nconsole.log(largestRectangleArea(heights));`,
      python: `import sys\nh = list(map(int, sys.stdin.read().split()))\ndef largest_rect(h):\n    return 0\nprint(largest_rect(h))`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const heights = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const stack = [];
let maxArea = 0;
const n = heights.length;

for (let i = 0; i <= n; i++) {
  const currentHeight = i === n ? 0 : heights[i];
  while (stack.length > 0 && currentHeight < heights[stack[stack.length - 1]]) {
    const h = heights[stack.pop()];
    const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
    maxArea = Math.max(maxArea, h * width);
  }
  stack.push(i);
}
console.log(maxArea);`
    },
    testCases: [
      {
        input: '2 1 5 6 2 3',
        expectedOutput: '10',
        isHidden: false,
        explanation: 'Bars 5 and 6 form a rectangle of area 5 * 2 = 10.'
      },
      {
        input: '2 4',
        expectedOutput: '4',
        isHidden: false
      },
      {
        input: '1',
        expectedOutput: '1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single bar.'
      },
      {
        input: '0 0 0',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Zero heights.'
      },
      {
        input: '6 6 6 6',
        expectedOutput: '24',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },

  // ==========================================
  // TOPIC 9: Binary Trees (1 Easy, 2 Medium)
  // ==========================================
  {
    slug: 'maximum-depth-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    topic: 'Binary Trees',
    difficulty: 'Easy',
    description: `Given the root of a binary tree represented in level-order traversal (with \`null\` representing empty child positions), return its maximum depth.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

Input: Space-separated tokens representing level-order nodes (e.g. \`3 9 20 null null 15 7\`). If empty or \`null\`, output \`0\`.`,
    constraints: ['The number of nodes in the tree is in the range [0, 10^4].', '-100 <= Node.val <= 100'],
    hints: ['Construct the tree or compute depth from the array representation directly.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `const tokens = (readline() || '').trim().split(/\\s+/);\nfunction maxDepth(arr) { return 0; }\nconsole.log(maxDepth(tokens));`,
      python: `import sys\ntokens = sys.stdin.read().split()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const tokens = (readline() || '').trim().split(/\\s+/).filter(Boolean);
if (tokens.length === 0 || tokens[0] === 'null' || tokens[0] === 'EMPTY') {
  console.log(0);
  process.exit(0);
}

// Build tree nodes
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

const root = new TreeNode(Number(tokens[0]));
const queue = [root];
let i = 1;

while (queue.length > 0 && i < tokens.length) {
  const curr = queue.shift();
  if (i < tokens.length && tokens[i] !== 'null') {
    curr.left = new TreeNode(Number(tokens[i]));
    queue.push(curr.left);
  }
  i++;
  if (i < tokens.length && tokens[i] !== 'null') {
    curr.right = new TreeNode(Number(tokens[i]));
    queue.push(curr.right);
  }
  i++;
}

function getDepth(node) {
  if (!node) return 0;
  return 1 + Math.max(getDepth(node.left), getDepth(node.right));
}

console.log(getDepth(root));`
    },
    testCases: [
      {
        input: '3 9 20 null null 15 7',
        expectedOutput: '3',
        isHidden: false,
        explanation: 'Longest path 3 -> 20 -> 15 has 3 nodes.'
      },
      {
        input: '1 null 2',
        expectedOutput: '2',
        isHidden: false
      },
      {
        input: 'null',
        expectedOutput: '0',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty tree.'
      },
      {
        input: '10',
        expectedOutput: '1',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single root node.'
      }
    ]
  },
  {
    slug: 'binary-tree-level-order-traversal',
    title: 'Binary Tree Level Order Traversal',
    topic: 'Binary Trees',
    difficulty: 'Medium',
    description: `Given the root of a binary tree in level-order serialized format, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

Format each level as bracketed comma-separated values: \`[val1,val2]\`. Print levels separated by space. If empty, print \`EMPTY\`.

Input: Space-separated tokens (e.g. \`3 9 20 null null 15 7\`).`,
    constraints: ['The number of nodes in the tree is in the range [0, 2000].', '-1000 <= Node.val <= 1000'],
    hints: ['Breadth-First Search (BFS) using a queue.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const tokens = (readline() || '').trim().split(/\\s+/);\nfunction levelOrder(arr) { return ''; }\nconsole.log(levelOrder(tokens));`,
      python: `import sys\ntokens = sys.stdin.read().split()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const tokens = (readline() || '').trim().split(/\\s+/).filter(Boolean);
if (tokens.length === 0 || tokens[0] === 'null' || tokens[0] === 'EMPTY') {
  console.log('EMPTY');
  process.exit(0);
}

class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

const root = new TreeNode(Number(tokens[0]));
const q = [root];
let idx = 1;
while (q.length > 0 && idx < tokens.length) {
  const curr = q.shift();
  if (idx < tokens.length && tokens[idx] !== 'null') {
    curr.left = new TreeNode(Number(tokens[idx]));
    q.push(curr.left);
  }
  idx++;
  if (idx < tokens.length && tokens[idx] !== 'null') {
    curr.right = new TreeNode(Number(tokens[idx]));
    q.push(curr.right);
  }
  idx++;
}

const levels = [];
const bfsQ = [root];
while (bfsQ.length > 0) {
  const levelSize = bfsQ.length;
  const currentLevel = [];
  for (let s = 0; s < levelSize; s++) {
    const node = bfsQ.shift();
    currentLevel.push(node.val);
    if (node.left) bfsQ.push(node.left);
    if (node.right) bfsQ.push(node.right);
  }
  levels.push('[' + currentLevel.join(',') + ']');
}

console.log(levels.join(' '));`
    },
    testCases: [
      {
        input: '3 9 20 null null 15 7',
        expectedOutput: '[3] [9,20] [15,7]',
        isHidden: false,
        explanation: 'Three levels formatted as requested.'
      },
      {
        input: '1',
        expectedOutput: '[1]',
        isHidden: false
      },
      {
        input: 'null',
        expectedOutput: 'EMPTY',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Empty tree.'
      },
      {
        input: '1 2 null 3 null 4',
        expectedOutput: '[1] [2] [3] [4]',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'validate-binary-search-tree',
    title: 'Validate Binary Search Tree',
    topic: 'Binary Trees',
    difficulty: 'Medium',
    description: `Given the root of a binary tree in level-order format, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys strictly less than the node's key.
- The right subtree of a node contains only nodes with keys strictly greater than the node's key.
- Both the left and right subtrees must also be binary search trees.

Output \`true\` or \`false\`.`,
    constraints: ['The number of nodes in the tree is in the range [1, 10^4].', '-2^31 <= Node.val <= 2^31 - 1'],
    hints: ['Recursively validate node values within valid (min, max) range boundaries.'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const tokens = (readline() || '').trim().split(/\\s+/);\nfunction isValidBST(arr) { return false; }\nconsole.log(isValidBST(tokens));`,
      python: `import sys\ntokens = sys.stdin.read().split()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const tokens = (readline() || '').trim().split(/\\s+/).filter(Boolean);
if (tokens.length === 0 || tokens[0] === 'null') {
  console.log('true');
  process.exit(0);
}

class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

const root = new TreeNode(Number(tokens[0]));
const q = [root];
let idx = 1;
while (q.length > 0 && idx < tokens.length) {
  const curr = q.shift();
  if (idx < tokens.length && tokens[idx] !== 'null') {
    curr.left = new TreeNode(Number(tokens[idx]));
    q.push(curr.left);
  }
  idx++;
  if (idx < tokens.length && tokens[idx] !== 'null') {
    curr.right = new TreeNode(Number(tokens[idx]));
    q.push(curr.right);
  }
  idx++;
}

function validate(node, min, max) {
  if (!node) return true;
  if (min !== null && node.val <= min) return false;
  if (max !== null && node.val >= max) return false;
  return validate(node.left, min, node.val) && validate(node.right, node.val, max);
}

console.log(validate(root, null, null) ? 'true' : 'false');`
    },
    testCases: [
      {
        input: '2 1 3',
        expectedOutput: 'true',
        isHidden: false,
        explanation: 'Valid BST.'
      },
      {
        input: '5 1 4 null null 3 6',
        expectedOutput: 'false',
        isHidden: false,
        explanation: 'Root 5 has right child 4 with value less than 5.'
      },
      {
        input: '10 5 15 null null 6 20',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Subtree node 6 is smaller than root 10.'
      },
      {
        input: '1',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Single node is a valid BST.'
      }
    ]
  },

  // ==========================================
  // TOPIC 10: Basic Graphs (1 Easy, 1 Medium, 1 Hard)
  // ==========================================
  {
    slug: 'graph-reachability-path-exists',
    title: 'Path Exists in Undirected Graph',
    topic: 'Basic Graphs',
    difficulty: 'Easy',
    description: `There is a bi-directional graph with \`n\` vertices, where each vertex is labeled from \`0\` to \`n - 1\` (inclusive). The edges in the graph are represented as an array of pairs.

Determine if there is a valid path that exists from vertex \`source\` to vertex \`destination\`. Output \`true\` or \`false\`.

Input:
Line 1: Two integers \`n\` and \`m\` (number of vertices and edges)
Next \`m\` lines: Two integers \`u v\` representing an edge
Last line: Two integers \`source destination\``,
    constraints: ['1 <= n <= 2 * 10^5', '0 <= m <= 2 * 10^5', '0 <= u, v, source, destination <= n - 1'],
    hints: ['Breadth-First Search (BFS) or Depth-First Search (DFS) from source.'],
    timeLimitMs: 2000,
    maxScore: 20,
    starterCode: {
      javascript: `// Graph path search\nconst [n, m] = (readline() || '').trim().split(/\\s+/).map(Number);\n// Read edges and source/dest`,
      python: `import sys\nlines = sys.stdin.read().splitlines()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const line1 = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const n = line1[0];
const m = line1[1];
const adj = Array.from({ length: n }, () => []);

for (let i = 0; i < m; i++) {
  const [u, v] = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
  if (u !== undefined && v !== undefined) {
    adj[u].push(v);
    adj[v].push(u);
  }
}

const [source, destination] = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);

if (source === destination) {
  console.log('true');
  process.exit(0);
}

const visited = new Uint8Array(n);
const queue = [source];
visited[source] = 1;
let found = false;

while (queue.length > 0) {
  const curr = queue.shift();
  if (curr === destination) {
    found = true;
    break;
  }
  for (const neighbor of adj[curr]) {
    if (!visited[neighbor]) {
      visited[neighbor] = 1;
      queue.push(neighbor);
    }
  }
}

console.log(found ? 'true' : 'false');`
    },
    testCases: [
      {
        input: '3 3\n0 1\n1 2\n2 0\n0 2',
        expectedOutput: 'true',
        isHidden: false,
        explanation: 'Path 0 -> 2 exists.'
      },
      {
        input: '6 5\n0 1\n0 2\n3 5\n5 4\n4 3\n0 5',
        expectedOutput: 'false',
        isHidden: false,
        explanation: 'Vertices 0 and 5 are in separate components.'
      },
      {
        input: '1 0\n0 0',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'Source equals destination.'
      },
      {
        input: '4 2\n0 1\n2 3\n0 3',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'connected-components-count',
    title: 'Count Connected Components in Graph',
    topic: 'Basic Graphs',
    difficulty: 'Medium',
    description: `You have a graph of \`n\` nodes labeled from \`0\` to \`n - 1\`. You are given an integer \`n\` and an integer \`m\` representing the number of edges, followed by the \`m\` edges.

Return the number of connected components in the graph.

Input:
Line 1: Two integers \`n\` and \`m\`
Next \`m\` lines: Two integers \`u v\``,
    constraints: ['1 <= n <= 2000', '0 <= m <= 5000', '0 <= u, v < n', 'Graph has no self-loops or duplicate edges.'],
    hints: ['Run DFS or BFS from each unvisited vertex, or use Disjoint Set Union (DSU).'],
    timeLimitMs: 2000,
    maxScore: 35,
    starterCode: {
      javascript: `const [n, m] = (readline() || '').trim().split(/\\s+/).map(Number);\n// Count connected components`,
      python: `import sys\nlines = sys.stdin.read().splitlines()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const line1 = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const n = line1[0];
const m = line1[1];
const adj = Array.from({ length: n }, () => []);

for (let i = 0; i < m; i++) {
  const [u, v] = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
  if (u !== undefined && v !== undefined) {
    adj[u].push(v);
    adj[v].push(u);
  }
}

const visited = new Uint8Array(n);
let components = 0;

for (let i = 0; i < n; i++) {
  if (!visited[i]) {
    components++;
    const q = [i];
    visited[i] = 1;
    while (q.length > 0) {
      const node = q.shift();
      for (const next of adj[node]) {
        if (!visited[next]) {
          visited[next] = 1;
          q.push(next);
        }
      }
    }
  }
}

console.log(components);`
    },
    testCases: [
      {
        input: '5 4\n0 1\n1 2\n3 4\n2 0',
        expectedOutput: '2',
        isHidden: false,
        explanation: 'Components are {0,1,2} and {3,4}. Total 2.'
      },
      {
        input: '5 4\n0 1\n1 2\n2 3\n3 4',
        expectedOutput: '1',
        isHidden: false,
        explanation: 'All 5 nodes connected.'
      },
      {
        input: '3 0',
        expectedOutput: '3',
        isHidden: true,
        isEdgeCase: true,
        explanation: '0 edges means n isolated components.'
      },
      {
        input: '6 3\n0 1\n2 3\n4 5',
        expectedOutput: '3',
        isHidden: true,
        isEdgeCase: false
      }
    ]
  },
  {
    slug: 'topological-sort-course-prerequisites',
    title: 'Course Prerequisites Schedule Feasibility',
    topic: 'Basic Graphs',
    difficulty: 'Hard',
    description: `There are a total of \`numCourses\` courses you have to take, labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [a, b]\` indicates that you must take course \`b\` first if you want to take course \`a\`.

Return \`true\` if you can finish all courses, or \`false\` if a cycle exists making it impossible.

Input:
Line 1: Two integers \`numCourses\` and \`m\` (number of dependencies)
Next \`m\` lines: Two integers \`a b\` (a depends on b)`,
    constraints: ['1 <= numCourses <= 2000', '0 <= m <= 5000', 'prerequisites[i].length == 2', '0 <= a, b < numCourses'],
    hints: ['Detect cycle in directed graph using Kahn algorithm (in-degrees) or DFS with coloring (unvisited, visiting, visited).'],
    timeLimitMs: 2000,
    maxScore: 50,
    starterCode: {
      javascript: `const [numCourses, m] = (readline() || '').trim().split(/\\s+/).map(Number);\n// Topological sort / cycle detection`,
      python: `import sys\nlines = sys.stdin.read().splitlines()`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() { return 0; }`,
      java: `import java.util.*;\npublic class Solution { public static void main(String[] args) {} }`
    },
    referenceSolution: {
      language: 'javascript',
      code: `const line1 = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
const numCourses = line1[0];
const m = line1[1];
const inDegree = new Int32Array(numCourses);
const adj = Array.from({ length: numCourses }, () => []);

for (let i = 0; i < m; i++) {
  const [a, b] = (readline() || '').trim().split(/\\s+/).filter(Boolean).map(Number);
  if (a !== undefined && b !== undefined) {
    adj[b].push(a);
    inDegree[a]++;
  }
}

const queue = [];
for (let i = 0; i < numCourses; i++) {
  if (inDegree[i] === 0) queue.push(i);
}

let visitedCount = 0;
while (queue.length > 0) {
  const curr = queue.shift();
  visitedCount++;
  for (const next of adj[curr]) {
    inDegree[next]--;
    if (inDegree[next] === 0) {
      queue.push(next);
    }
  }
}

console.log(visitedCount === numCourses ? 'true' : 'false');`
    },
    testCases: [
      {
        input: '2 1\n1 0',
        expectedOutput: 'true',
        isHidden: false,
        explanation: 'To take course 1, take 0 first. Possible.'
      },
      {
        input: '2 2\n1 0\n0 1',
        expectedOutput: 'false',
        isHidden: false,
        explanation: 'Cycle between 0 and 1.'
      },
      {
        input: '3 0',
        expectedOutput: 'true',
        isHidden: true,
        isEdgeCase: true,
        explanation: 'No dependencies.'
      },
      {
        input: '4 4\n1 0\n2 1\n3 2\n1 3',
        expectedOutput: 'false',
        isHidden: true,
        isEdgeCase: false,
        explanation: 'Cycle 1 -> 2 -> 3 -> 1.'
      }
    ]
  }
];

module.exports = {
  CODING_PROBLEMS_BANK
};
