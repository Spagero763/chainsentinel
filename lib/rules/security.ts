import type { Finding } from "./gas"

export const securityRules: Array<{
  id: string
  detect: (source: string) => Finding[]
}> = [
  {
    id: "SEC-001",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\.call\{value:/.test(line) || /\.call\.value\(/.test(line)) {
          const surroundingCode = lines.slice(Math.max(0, i - 5), i + 5).join("\n")
          if (!/nonReentrant|ReentrancyGuard/.test(surroundingCode)) {
            findings.push({
              id: "SEC-001",
              severity: "critical",
              title: "Reentrancy vulnerability — external call without guard",
              description: "Low-level .call{value:} detected without ReentrancyGuard or checks-effects-interactions pattern. An attacker can re-enter before state updates.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Apply OpenZeppelin ReentrancyGuard nonReentrant modifier, or move all state changes before the external call.",
              gasSaved: undefined
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-002",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/tx\.origin/.test(line)) {
          findings.push({
            id: "SEC-002",
            severity: "critical",
            title: "tx.origin used for authentication",
            description: "tx.origin always refers to the original EOA, not the immediate caller. A malicious contract can trick a user into calling it, which then calls your contract with the user's tx.origin.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace tx.origin with msg.sender for all access control checks.",
            gasSaved: undefined
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-003",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/block\.timestamp|now\b/.test(line) && /require|if\s*\(|<=|>=|==/.test(line)) {
          findings.push({
            id: "SEC-003",
            severity: "medium",
            title: "Block timestamp used in critical condition",
            description: "Validators can manipulate block.timestamp by a few seconds. Any time-sensitive logic with tight windows (seconds) is exploitable.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use block.number for relative time or increase the time window to minutes. Never rely on sub-15-second timestamp precision.",
            gasSaved: undefined
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-004",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/delegatecall/.test(line)) {
          findings.push({
            id: "SEC-004",
            severity: "critical",
            title: "delegatecall to potentially untrusted address",
            description: "delegatecall executes external code in the calling contract's storage context. If the target is user-supplied or upgradeable without a timelock, storage can be wiped or ownership stolen.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Ensure the delegatecall target is a hardcoded trusted address or protected behind a timelock-gated upgrade pattern.",
            gasSaved: undefined
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-005",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/selfdestruct|suicide\s*\(/.test(line)) {
          findings.push({
            id: "SEC-005",
            severity: "critical",
            title: "selfdestruct present",
            description: "selfdestruct permanently destroys the contract and force-sends ETH to any address, bypassing receive() hooks. Deprecated in EIP-6049 and behavior changed post-Cancun.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Remove selfdestruct. Use a pause + upgrade pattern instead for emergency stops.",
            gasSaved: undefined
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-006",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\.transfer\(|\.send\(/.test(line)) {
          findings.push({
            id: "SEC-006",
            severity: "high",
            title: "Using .transfer() or .send() — hardcoded 2300 gas stipend",
            description: ".transfer() and .send() forward only 2300 gas, which will fail if the recipient is a contract with any non-trivial receive() logic. This breaks composability.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use .call{value: amount}('') and check the return value. Apply ReentrancyGuard to protect against reentrancy.",
            gasSaved: undefined
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-007",
    detect(source) {
      const findings: Finding[] = []
      if (/pragma solidity\s+\^0\.[0-7]\./.test(source) || /pragma solidity\s+>=0\.[0-4]/.test(source)) {
        findings.push({
          id: "SEC-007",
          severity: "medium",
          title: "Outdated Solidity pragma",
          description: "Older compiler versions miss important bug fixes and security patches. Versions below 0.8.x lack built-in overflow/underflow protection.",
          suggestion: "Lock to a specific recent version: `pragma solidity 0.8.24;` — avoid floating pragmas in production.",
          gasSaved: undefined
        })
      }
      return findings
    }
  },
  {
    id: "SEC-008",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\(bool\s+\w+,\s*\)\s*=/.test(line) || /\.call\{/.test(line)) {
          const nextLines = lines.slice(i + 1, i + 4).join("\n")
          if (!/require\(|revert|if\s*\(!\w+/.test(nextLines)) {
            findings.push({
              id: "SEC-008",
              severity: "high",
              title: "Return value of low-level call not checked",
              description: "If a .call() fails silently and the return bool is not checked, execution continues as if nothing happened.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Always check: `(bool ok, ) = addr.call{...}(...); require(ok, 'call failed');`",
              gasSaved: undefined
            })
          }
        }
      })
      return findings
    }
  }
]
