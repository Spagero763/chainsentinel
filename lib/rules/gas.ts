export interface Finding {
  id: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  title: string
  description: string
  line?: number
  snippet?: string
  suggestion: string
  gasSaved?: string
}

export const gasRules: Array<{
  id: string
  detect: (source: string) => Finding[]
}> = [
  {
    id: "GAS-001",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/\buint256\s+public\s+\w+/.test(line) && !/constant|immutable/.test(line)) {
          findings.push({
            id: "GAS-001",
            severity: "medium",
            title: "Public uint256 state variable — consider immutable",
            description: "Public variables auto-generate an external getter costing extra bytecode. If the value is only set in the constructor and never changes, mark it immutable for a 2,100 gas saving per read.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "If set only in constructor: `uint256 public immutable myVar;`. Otherwise write an explicit `external` getter.",
            gasSaved: "~2,100 gas per read (SLOAD → push constant)"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-002",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/for\s*\(.*;\s*\w+\s*<\s*\w+\.length\s*;/.test(line)) {
          findings.push({
            id: "GAS-002",
            severity: "high",
            title: "Array .length read on every loop iteration",
            description: "Every .length access on a storage array is an SLOAD (100 warm / 2,100 cold gas). Over N iterations this is N * 100+ gas wasted.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Cache before the loop: `uint256 len = arr.length; for (uint256 i; i < len; ++i)`",
            gasSaved: "100–2,100 gas × iterations"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-003",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/for\s*\(/.test(line) && /\bi\+\+/.test(line) && !/\+\+i/.test(line)) {
          findings.push({
            id: "GAS-003",
            severity: "low",
            title: "Post-increment i++ in loop (use pre-increment ++i)",
            description: "i++ stores a temporary copy of i before incrementing. ++i increments in place. In a tight loop this adds up.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace i++ with ++i in the for loop increment clause.",
            gasSaved: "~5 gas per iteration"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-004",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/require\s*\([^,]+,\s*"[^"]{33,}"/.test(line)) {
          findings.push({
            id: "GAS-004",
            severity: "low",
            title: "Revert string over 32 bytes — use custom errors",
            description: "Each character in a revert string costs deployment gas. Strings over 32 bytes spill into additional slots. Custom errors are ~3× cheaper on both deployment and runtime.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Define: `error MyError();` at file level. Use: `if (!condition) revert MyError();`",
            gasSaved: "~100–200 gas deployment, ~50 gas runtime"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-005",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/^\s*(bool|uint8|uint16|uint32)\s+\w+\s*;/.test(line) &&
            !/struct|mapping|\/\//.test(lines[Math.max(0, i - 1)] || "")) {
          findings.push({
            id: "GAS-005",
            severity: "medium",
            title: "Small type in standalone storage slot",
            description: "bool, uint8, uint16, uint32 each occupy a full 32-byte storage slot unless packed with adjacent variables. Packing requires declaring them consecutively in the same struct.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Group small types together in a struct or declare consecutively so the compiler can pack them into one slot.",
            gasSaved: "~15,000–20,000 gas if packed into existing slot"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-006",
    detect(source) {
      const findings: Finding[] = []
      const emitMatches = source.match(/emit\s+\w+\(/g) || []
      const indexedCount = (source.match(/\bindexed\b/g) || []).length
      if (emitMatches.length > 0 && indexedCount === 0) {
        findings.push({
          id: "GAS-006",
          severity: "info",
          title: "No indexed event parameters — off-chain filtering is O(n)",
          description: "Without indexed parameters, subgraph or frontend queries must scan every log emitted. Indexed fields are stored in the bloom filter and enable O(1) filtering.",
          suggestion: "Add `indexed` to address and ID parameters in events: `event Transfer(address indexed from, address indexed to, uint256 value);`",
          gasSaved: "No on-chain saving — critical for off-chain efficiency and UX"
        })
      }
      return findings
    }
  },
  {
    id: "GAS-007",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/\*\s*10\s*\*\*\s*18|\*\s*1e18|1_000_000_000_000_000_000/.test(line) && !/constant|immutable/.test(line)) {
          findings.push({
            id: "GAS-007",
            severity: "low",
            title: "Magic number for ether denomination — use unit literal or constant",
            description: "Hardcoding 10**18 or 1e18 inline is error-prone (off-by-one zeros) and wastes a constant-folding opportunity.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use Solidity's `1 ether` unit literal, or: `uint256 constant PRECISION = 1e18;`",
            gasSaved: "Prevents denomination bugs"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-008",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/function\s+\w+\s*\([^)]*\bstring\s+memory\b[^)]*\)\s*(external|public)/.test(line) ||
            /function\s+\w+\s*\([^)]*\bbytes\s+memory\b[^)]*\)\s*(external|public)/.test(line)) {
          findings.push({
            id: "GAS-008",
            severity: "medium",
            title: "string/bytes parameter marked memory on external function — use calldata",
            description: "`memory` copies the argument into a new memory location costing extra gas. `calldata` reads directly from the call data without copying.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace `string memory` / `bytes memory` with `string calldata` / `bytes calldata` on external functions that don't modify the argument.",
            gasSaved: "~30–200 gas depending on input size"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-009",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/^\s*(uint\d*|int\d*|bool|address)\s+\w+\s*=\s*0\s*;/.test(line)) {
          findings.push({
            id: "GAS-009",
            severity: "low",
            title: "Redundant zero initialization",
            description: "State and memory variables default to zero in Solidity. Explicitly writing = 0 costs extra deployment gas without changing behavior.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Remove the `= 0` initializer: `uint256 count;` is identical to `uint256 count = 0;`",
            gasSaved: "~3 gas per variable at deployment"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-010",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      let inLoop = 0
      lines.forEach((line, i) => {
        if (/\b(for|while)\s*\(/.test(line)) inLoop++
        if (inLoop > 0 && /\{/.test(line)) inLoop = Math.max(inLoop, 1)
        if (inLoop > 0 && /^\s*\}/.test(line)) inLoop = Math.max(0, inLoop - 1)
        if (inLoop > 0 && /\bemit\s+/.test(line)) {
          findings.push({
            id: "GAS-010",
            severity: "medium",
            title: "Event emitted inside a loop",
            description: "Each emit inside a loop costs ~375+ gas for the LOG opcode. N iterations = N × 375+ gas. For large arrays this becomes the dominant cost.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Aggregate the data and emit a single event after the loop, or emit a summary event with arrays as parameters.",
            gasSaved: "375+ gas × (iterations - 1)"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-011",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/\/\s*\d+.*\*\s*\d+|\/[^/].*\*/.test(line) && !/\/\//.test(line.slice(0, 2))) {
          findings.push({
            id: "GAS-011",
            severity: "medium",
            title: "Division before multiplication — precision loss",
            description: "Solidity uses integer division. Dividing first discards the remainder before multiplication amplifies it, permanently losing precision. e.g., (5 / 2) * 3 = 6, but (5 * 3) / 2 = 7.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Multiply before dividing. Use a precision scaling factor (e.g., 1e18) to preserve fractional precision.",
            gasSaved: "Prevents precision loss — not a gas issue but a logic bug"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-012",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/for\s*\([^;]*;\s*[^;]*;\s*[^)]*\+\+[^)]*\)/.test(line) && !/unchecked/.test(source.slice(Math.max(0, source.indexOf(line) - 20), source.indexOf(line) + line.length + 20))) {
          findings.push({
            id: "GAS-012",
            severity: "low",
            title: "Loop increment not wrapped in unchecked",
            description: "The loop counter cannot realistically overflow but Solidity 0.8+ still checks it every iteration. Wrapping ++i in unchecked saves the overflow check.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace loop increment with: `unchecked { ++i; }` inside the loop body (move the increment there).",
            gasSaved: "~30–50 gas per iteration"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-013",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/\bstring\s+(private|internal|public)\s+\w+\s*=\s*"[^"]{0,32}"/.test(line)) {
          findings.push({
            id: "GAS-013",
            severity: "low",
            title: "Short string stored as string — use bytes32",
            description: "For fixed short strings (≤32 chars), bytes32 is cheaper: no length prefix, fits in one slot, no ABI encoding overhead.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace `string public name = 'abc'` with `bytes32 public constant NAME = 'abc';`",
            gasSaved: "~20,000 gas deployment, cheaper reads"
          })
        }
      })
      return findings
    }
  },
  {
    id: "GAS-014",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/function\s+\w+\s*\([^)]*\)\s*(external|public)\s+payable/.test(line)) {
          const body = source.split("\n").slice(i, Math.min(i + 20, source.split("\n").length)).join("\n")
          if (!/msg\.value|address\(this\)\.balance/.test(body)) {
            const name = (line.match(/function\s+(\w+)/) || ["", ""])[1]
            if (name && !/(receive|fallback)/.test(name)) {
              findings.push({
                id: "GAS-014",
                severity: "low",
                title: `Possibly unnecessary payable on ${name}()`,
                description: "A payable function that does not reference msg.value wastes gas on callers who accidentally send ETH (it gets stuck), and misleads about the function's intent.",
                line: i + 1,
                snippet: line.trim(),
                suggestion: "Remove payable if the function does not intentionally accept ETH.",
                gasSaved: "Prevents accidental ETH lockup"
              })
            }
          }
        }
      })
      return findings
    }
  },
  {
    id: "GAS-015",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      const stateVarReads: Record<string, number[]> = {}
      lines.forEach((line, i) => {
        const m = line.match(/\b([a-z_][a-zA-Z0-9_]*)\b(?!\s*[=(])/g)
        if (!m) return
        m.forEach(name => {
          if (name.length < 3 || /^(if|for|uint|int|bool|true|false|address|return|emit|require|revert|new|delete|this|msg|block|tx)$/.test(name)) return
          if (!stateVarReads[name]) stateVarReads[name] = []
          stateVarReads[name].push(i + 1)
        })
      })
      for (const [name, lines_] of Object.entries(stateVarReads)) {
        if (lines_.length >= 4 && new Set(lines_.slice(0, 30)).size >= 4) {
          const isStateVar = new RegExp(`\\b(uint\\d*|int\\d*|address|bool|bytes\\d*)\\s+(?:private|internal|public)?\\s*${name}\\b`).test(source)
          if (isStateVar) {
            findings.push({
              id: "GAS-015",
              severity: "medium",
              title: `Storage variable '${name}' read multiple times — cache in memory`,
              description: `'${name}' appears to be read from storage ${lines_.length}+ times. Each SLOAD costs 100 (warm) or 2,100 (cold) gas. Caching in a local variable pays for itself after 2 reads.`,
              suggestion: `Add at the start of the function: \`uint256 _${name} = ${name};\` and use \`_${name}\` throughout.`,
              gasSaved: "100 gas × (reads - 1), up to 2,100 × (reads - 1)"
            })
            break
          }
        }
      }
      return findings
    }
  },
]
