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
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/uint256\s+public\s+\w+/.test(line) && !/constant|immutable/.test(line)) {
          findings.push({
            id: "GAS-001",
            severity: "medium",
            title: "Public state variable — use external getter or immutable",
            description: "Public variables auto-generate a getter, costing extra deployment gas. If never written after construction, mark immutable.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Mark as immutable if set only in constructor, or remove public and write a manual external getter.",
            gasSaved: "~2,000 gas per read on immutable vs storage slot"
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
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/for\s*\(.*\.length/.test(line)) {
          findings.push({
            id: "GAS-002",
            severity: "high",
            title: "Array length read inside loop condition",
            description: "Reading .length from storage on every iteration costs 2,100 gas (cold) or 100 gas (warm) per loop cycle.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Cache array length in a local variable before the loop: `uint256 len = arr.length;`",
            gasSaved: "100–2,100 gas per iteration"
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
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\+\+i|i\+\+/.test(line) && /for\s*\(/.test(line)) {
          if (/i\+\+/.test(line) && !/\+\+i/.test(line)) {
            findings.push({
              id: "GAS-003",
              severity: "low",
              title: "Post-increment in loop (use pre-increment)",
              description: "i++ creates a temporary copy before incrementing. ++i skips the copy, saving gas.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Replace i++ with ++i in for loop.",
              gasSaved: "~5 gas per iteration"
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "GAS-004",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/require\(.*,\s*"[^"]{32,}"/.test(line)) {
          findings.push({
            id: "GAS-004",
            severity: "low",
            title: "Long revert string increases deployment cost",
            description: "Each byte in a revert string costs deployment gas. Strings over 32 bytes push past a single 32-byte slot.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use custom errors instead: `error Unauthorized(); revert Unauthorized();`",
            gasSaved: "~10–50 gas deployment + cheaper reverts"
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
        if (/bool\s+\w+\s*;/.test(line) && !/mapping|struct/.test(lines[i - 1] || "")) {
          findings.push({
            id: "GAS-005",
            severity: "medium",
            title: "Standalone bool storage variable",
            description: "A bool occupies a full 32-byte storage slot unless packed with adjacent variables. Consider using uint8 or packing with other small types.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Pack bool with adjacent uint types in the same struct or declare them consecutively for slot packing.",
            gasSaved: "~15,000 gas if packed into existing slot"
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
      if (/emit\s+\w+\([^)]*\)/.test(source)) {
        const emitCount = (source.match(/emit\s+\w+\(/g) || []).length
        const indexedCount = (source.match(/indexed/g) || []).length
        if (emitCount > 0 && indexedCount === 0) {
          findings.push({
            id: "GAS-006",
            severity: "info",
            title: "Events have no indexed parameters",
            description: "Without indexed parameters, off-chain filtering requires scanning all logs. Indexed params enable efficient log queries.",
            suggestion: "Add `indexed` to key event parameters like addresses and IDs.",
            gasSaved: "No gas saved on-chain, but critical for off-chain efficiency"
          })
        }
      }
      return findings
    }
  },
  {
    id: "GAS-007",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\*\s*10\s*\*\*\s*18|\*\s*1e18/.test(line)) {
          findings.push({
            id: "GAS-007",
            severity: "low",
            title: "Magic number for ether denomination",
            description: "Using 10**18 or 1e18 as a magic number is error-prone and slightly less readable than using Solidity's built-in unit literals.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use `1 ether` or define a constant: `uint256 constant PRECISION = 1e18;`",
            gasSaved: "Readability + prevents denomination bugs"
          })
        }
      })
      return findings
    }
  }
]
