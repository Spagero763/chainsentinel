import type { Finding } from "./gas"

export const securityRules: Array<{
  id: string
  detect: (source: string) => Finding[]
}> = [
  {
    // Reentrancy — state change after external call (CEI violation)
    id: "SEC-001",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        const isExternalCall = /\.call\{value:|\.call\("|\.call\('"|\.call\(\)|externalContract\.\w+\(/.test(line)
        if (!isExternalCall) return
        const ctx = lines.slice(Math.max(0, i - 8), i + 1).join("\n")
        const after = lines.slice(i + 1, Math.min(i + 12, lines.length)).join("\n")
        const hasGuard = /nonReentrant|ReentrancyGuard|mutex/.test(ctx)
        const stateChangeAfter = /\w+\s*[\-\+]?=\s*|balances\[|userInfo\[|_balances\[|delete\s+\w/.test(after)
        if (!hasGuard && stateChangeAfter) {
          findings.push({
            id: "SEC-001",
            severity: "critical",
            title: "Reentrancy: state update after external call",
            description: "State is modified after an external call without a reentrancy guard. An attacker can re-enter before the state update, draining funds.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Apply OpenZeppelin's ReentrancyGuard nonReentrant modifier, or move all state changes before the external call (Checks-Effects-Interactions).",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-002",
    detect(source) {
      const findings: Finding[] = []
      source.split("\n").forEach((line, i) => {
        if (/tx\.origin/.test(line) && !/(\/\/|emit)/.test(line.slice(0, line.indexOf("tx.origin")))) {
          findings.push({
            id: "SEC-002",
            severity: "critical",
            title: "tx.origin used for authentication",
            description: "tx.origin is the original EOA signer — not the immediate caller. A malicious intermediary contract can trick a user into signing a transaction that then exploits your contract with the user's tx.origin identity.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Replace tx.origin with msg.sender for all access control.",
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
      source.split("\n").forEach((line, i) => {
        if (/block\.timestamp|block\.number/.test(line) && /require|if\s*\(/.test(line)) {
          findings.push({
            id: "SEC-003",
            severity: "medium",
            title: "Block timestamp or block.number in critical condition",
            description: "Validators can shift block.timestamp by ~15 seconds. Any time-sensitive logic relying on second-level precision is exploitable. block.number is also manipulable via uncle blocks.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use block.number for relative timing. Increase time windows to minutes. Never rely on sub-15s precision.",
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
      source.split("\n").forEach((line, i) => {
        if (/\.delegatecall\(/.test(line)) {
          findings.push({
            id: "SEC-004",
            severity: "critical",
            title: "delegatecall to external address",
            description: "delegatecall executes foreign code in your contract's storage context. If the target is user-supplied or not a hardcoded trusted constant, an attacker can overwrite any storage slot including owner, balances, or implementation addresses.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Ensure delegatecall target is a hardcoded trusted constant. If used for upgrades, gate behind a timelock + multisig.",
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
      source.split("\n").forEach((line, i) => {
        if (/\bselfdestruct\s*\(|\bsuicide\s*\(/.test(line)) {
          findings.push({
            id: "SEC-005",
            severity: "critical",
            title: "selfdestruct present",
            description: "selfdestruct permanently destroys contract code and force-sends all ETH to any address, bypassing receive(). Deprecated by EIP-6049. Post-Cancun, CREATE2 can redeploy with different code to same address — making selfdestruct a vector for bait-and-switch attacks.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Remove selfdestruct entirely. Use a pause mechanism with emergency withdrawal instead.",
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
      source.split("\n").forEach((line, i) => {
        if (/\.\s*transfer\s*\(|\.\s*send\s*\(/.test(line) && !/safeTransfer|SafeERC20|IERC20|ERC20/.test(line)) {
          findings.push({
            id: "SEC-006",
            severity: "high",
            title: ".transfer() / .send() — hardcoded 2300 gas will fail for contract recipients",
            description: "These forward only 2300 gas. Any recipient contract with a non-trivial receive() or fallback() will revert, permanently locking ETH. This breaks composability with smart wallets and multisigs.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use .call{value: amount}('') with a return value check. Apply nonReentrant to guard against reentrancy.",
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
      if (/pragma solidity\s+[\^>]=?\s*0\.[0-7]\./.test(source) || /pragma solidity\s+>=\s*0\.[0-4]\./.test(source)) {
        findings.push({
          id: "SEC-007",
          severity: "high",
          title: "Outdated Solidity pragma — missing overflow protection",
          description: "Compiler versions below 0.8.0 do not have built-in integer overflow/underflow protection. Without SafeMath, arithmetic bugs silently wrap around (e.g., balance underflow to 2^256 - 1).",
          suggestion: "Upgrade to pragma solidity 0.8.24; and lock to a specific version, not a range.",
        })
      }
      if (/pragma solidity\s+\^/.test(source)) {
        findings.push({
          id: "SEC-007b",
          severity: "low",
          title: "Floating pragma — version not locked",
          description: "A floating pragma like ^0.8.0 allows any 0.8.x compiler, including versions with unfixed bugs.",
          suggestion: "Lock to a specific compiler version: `pragma solidity 0.8.24;`",
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
        if (/\.\s*call\s*[\({]/.test(line)) {
          const returnCapture = /\(bool\s+\w+/.test(line) || /bool\s+\w+\s*=/.test(line)
          if (!returnCapture) {
            findings.push({
              id: "SEC-008",
              severity: "high",
              title: "Low-level call return value ignored",
              description: "If a .call() fails and the return bool is not captured and checked, execution continues silently. This can lead to partial state updates and lost ETH.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "(bool success, ) = target.call{...}(...); require(success, 'call failed');",
            })
          } else {
            const after = lines.slice(i + 1, Math.min(i + 4, lines.length)).join("\n")
            if (!/require\s*\(|revert\s*\(|if\s*\(!\s*\w+|if\s*\(!success/.test(after)) {
              findings.push({
                id: "SEC-008",
                severity: "high",
                title: "Low-level call success flag captured but never checked",
                description: "The bool return from .call() is captured but not verified. Silent failures will not revert the transaction.",
                line: i + 1,
                snippet: line.trim(),
                suggestion: "Add: require(success, 'call failed'); immediately after the call.",
              })
            }
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-009",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      const SENSITIVE = /function\s+(mint|burn|withdraw|emergencyWithdraw|drainFunds|setOwner|transferOwnership|setPrice|setFee|pause|unpause|upgradeProxy|setImplementation|addMinter|removeMinter|setAdmin|setTreasury|setOperator|sweep)\s*\(/i
      lines.forEach((line, i) => {
        if (!SENSITIVE.test(line)) return
        if (/(internal|private)/.test(line)) return
        const ctx = lines.slice(i, Math.min(i + 5, lines.length)).join(" ")
        if (!/(onlyOwner|onlyAdmin|onlyRole|onlyGovernance|onlyMinter|onlyOperator|require\s*\(\s*msg\.sender|_checkOwner|hasRole)/.test(ctx)) {
          const name = (line.match(/function\s+(\w+)/) || ["", "unknown"])[1]
          findings.push({
            id: "SEC-009",
            severity: "critical",
            title: `No access control on privileged function: ${name}()`,
            description: `${name}() performs a sensitive operation but has no access modifier or msg.sender check. Any address can call it and drain funds, change ownership, or pause the protocol.`,
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Add onlyOwner or a custom modifier. For multi-party control use OpenZeppelin AccessControl with role-based permissions.",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-010",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      const isRng = /\b(random|lottery|winner|shuffle|rng|raffle|jackpot|roll|dice)\b/i.test(source)
      lines.forEach((line, i) => {
        if (/\b(blockhash|block\.difficulty|block\.prevrandao)\s*\(/.test(line) && isRng) {
          findings.push({
            id: "SEC-010",
            severity: "critical",
            title: "Predictable on-chain randomness",
            description: "blockhash and block.difficulty can be known in advance or influenced by validators. Any winner selection or shuffle using these is fully predictable and exploitable by miners or sophisticated bots.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use Chainlink VRF or another decentralized VRF. Never use block variables as a randomness source.",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-011",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        const isAddressParam = /\b(constructor|function)\b.*\baddress\b/.test(line)
        if (!isAddressParam) return
        if (/(view|pure|internal|private)/.test(line)) return
        const body = lines.slice(i, Math.min(i + 12, lines.length)).join("\n")
        if (!/require\s*\(.*!=\s*address\s*\(\s*0\s*\)|require\s*\(\s*\w+\s*!=\s*address\s*\(0\)/.test(body)) {
          findings.push({
            id: "SEC-011",
            severity: "high",
            title: "Missing zero-address check on address parameter",
            description: "Passing address(0) to this function may set a critical variable (owner, treasury, token) to the zero address, permanently bricking part of the protocol.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Add: require(addr != address(0), 'zero address'); at the top of the function body.",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-012",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/function\s+initialize\s*\(/.test(line)) {
          const ctx = lines.slice(i, Math.min(i + 6, lines.length)).join(" ")
          if (!/(initializer|onlyInitializing|_initialized|_isInitialized|Initializable)/.test(ctx)) {
            findings.push({
              id: "SEC-012",
              severity: "critical",
              title: "Unprotected initialize() — anyone can call it",
              description: "This initialize() function lacks the OpenZeppelin `initializer` modifier. A frontrunner or attacker can call it before the deployer, setting themselves as owner and taking full control of the contract.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Inherit from OpenZeppelin Initializable and add the `initializer` modifier. Call _disableInitializers() in the constructor for UUPS proxies.",
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-013",
    detect(source) {
      const findings: Finding[] = []
      const usesSafeERC20 = /SafeERC20|safeTransfer|safeTransferFrom/.test(source)
      if (usesSafeERC20) return findings
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/IERC20\([^)]+\)\.(transfer|transferFrom)\s*\(|token\.(transfer|transferFrom)\s*\(/.test(line)) {
          findings.push({
            id: "SEC-013",
            severity: "high",
            title: "Unsafe ERC-20 transfer — not using SafeERC20",
            description: "Some widely-used ERC-20 tokens (USDT, BNB, MATIC) do not return a bool from transfer/transferFrom — they revert or return nothing. Calling these directly silently fails or crashes.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Use OpenZeppelin SafeERC20: import SafeERC20 and call token.safeTransfer(to, amount).",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-014",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\becrecover\s*\(/.test(line)) {
          const hasNonce = /nonce|_nonce|nonces/.test(source)
          const hasChainId = /chainId|block\.chainid|CHAIN_ID/.test(source)
          const hasDomain = /DOMAIN_SEPARATOR|EIP712|_domainSeparator/.test(source)
          if (!hasNonce && !hasDomain) {
            findings.push({
              id: "SEC-014",
              severity: "critical",
              title: "Signature replay attack — no nonce or domain separator",
              description: "ecrecover without a nonce and chainId in the signed message allows an attacker to reuse a valid signature indefinitely across transactions and chains.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Use EIP-712 structured data signing with a nonce and block.chainid in the message hash. Use OpenZeppelin's EIP712 base contract.",
            })
          } else if (!hasChainId && !hasDomain) {
            findings.push({
              id: "SEC-014b",
              severity: "high",
              title: "Cross-chain signature replay — missing chainId",
              description: "Signatures that don't include chainId or a domain separator are replayable on every EVM-compatible chain the contract is deployed to.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Include block.chainid in the signed message hash or use OpenZeppelin EIP712.",
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-015",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/for\s*\(/.test(line) && /\.length/.test(line)) {
          const ctx = lines.slice(Math.max(0, i - 20), i + 3).join("\n")
          const isUserArray = /(users|holders|participants|accounts|recipients|depositors|voters|members)\[/.test(ctx) ||
            /\.push\s*\(|address\s*\[\s*\]/.test(ctx)
          if (isUserArray) {
            findings.push({
              id: "SEC-015",
              severity: "high",
              title: "Unbounded loop over user array — DoS vector",
              description: "Iterating over a dynamically growing user array in an on-chain function will eventually exceed the block gas limit as the array grows, permanently freezing the function.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Use pull-payment patterns. If push is required, add pagination with offset/limit parameters.",
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-016",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      const hasDeFiCall = /swap|addLiquidity|removeLiquidity|exactInput|exactOutput/i.test(source)
      if (!hasDeFiCall) return findings
      lines.forEach((line, i) => {
        if (/(swap|addLiquidity|removeLiquidity|exactInput|exactOutput)/i.test(line)) {
          const block = lines.slice(i, Math.min(i + 8, lines.length)).join("\n")
          if (/,\s*0\s*[,)]\s*/.test(block)) {
            findings.push({
              id: "SEC-016",
              severity: "high",
              title: "Missing slippage protection — 0 minimum output",
              description: "Passing 0 as minimum output/amount to a DEX call means the caller accepts any price, including a 100% sandwich attack loss.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Calculate and pass a minimum amount with acceptable slippage (e.g., 99% of expected). Let users configure slippage tolerance.",
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-017",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/function\s+\w+\s*\([^)]*\)\s*(external|public)\s+payable/.test(line) ||
            /function\s+\w+\s*\([^)]*\)\s+payable\s+(external|public)/.test(line)) {
          const ctx = lines.slice(Math.max(0, i - 3), i + 6).join("\n")
          if (!/(nonReentrant|ReentrancyGuard|_status|mutex)/.test(ctx)) {
            const name = (line.match(/function\s+(\w+)/) || ["", ""])[1]
            if (!/(receive|fallback)/.test(name)) {
              findings.push({
                id: "SEC-017",
                severity: "high",
                title: `Payable function ${name}() has no reentrancy protection`,
                description: "Public payable functions that accept ETH and call external contracts are prime reentrancy targets. Without a guard, a malicious contract recipient can re-enter before balance updates.",
                line: i + 1,
                snippet: line.trim(),
                suggestion: "Add OpenZeppelin ReentrancyGuard and the nonReentrant modifier to all payable external functions.",
              })
            }
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-018",
    detect(source) {
      const findings: Finding[] = []
      const hasOwner = /Ownable|onlyOwner/.test(source)
      const hasTimelock = /Timelock|TimelockController|timeDelay|timelockDelay/.test(source)
      const hasMultisig = /multisig|Multisig|MultiSig|gnosis|safe\./.test(source)
      const hasCriticalOwnerFunc = /(onlyOwner[\s\S]{0,200}(mint|withdraw|setFee|upgrade|pause|drain)|(mint|withdraw|setFee|upgrade|pause|drain)[\s\S]{0,200}onlyOwner)/.test(source)
      if (hasOwner && hasCriticalOwnerFunc && !hasTimelock && !hasMultisig) {
        findings.push({
          id: "SEC-018",
          severity: "medium",
          title: "Centralization risk — single owner key controls critical functions",
          description: "The owner/admin can unilaterally mint tokens, withdraw funds, upgrade logic, or pause the protocol with no delay or multi-party approval. A single compromised key is a total loss.",
          suggestion: "Use a Gnosis Safe multisig as owner. Add a TimelockController with at least 48h delay on privileged actions.",
        })
      }
      return findings
    }
  },
  {
    id: "SEC-019",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      let inUnchecked = false
      lines.forEach((line, i) => {
        if (/\bunchecked\s*\{/.test(line)) inUnchecked = true
        if (inUnchecked && /\}/.test(line)) inUnchecked = false
        if (inUnchecked && /\w+\s*[\+\-]\s*\w+|[\+\-]{2}/.test(line)) {
          const ctx = lines.slice(Math.max(0, i - 5), i + 1).join("\n")
          if (!/\+\+i|i\+\+|^\s*i\s*[\+\-]/.test(line) || /\*|\-\s*\w+/.test(line)) {
            if (/\-/.test(line) && !/\/\//.test(line)) {
              findings.push({
                id: "SEC-019",
                severity: "high",
                title: "Subtraction inside unchecked block — potential underflow",
                description: "unchecked disables Solidity 0.8's overflow guards. Subtraction here can silently wrap to 2^256 - 1 if the operand is larger than expected.",
                line: i + 1,
                snippet: line.trim(),
                suggestion: "Validate that the minuend >= subtrahend before entering the unchecked block, or move subtraction outside unchecked.",
              })
            }
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-020",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\.approve\s*\(\s*\w+\s*,\s*(type\s*\(\s*uint256\s*\)\s*\.max|2\s*\*\*\s*256\s*-\s*1|0xffffffff)/i.test(line)) {
          findings.push({
            id: "SEC-020",
            severity: "medium",
            title: "Unlimited token approval (type(uint256).max)",
            description: "Approving max uint256 permanently grants a spender full access to all current and future tokens in the wallet. If the spender contract is exploited later, all approved tokens can be drained.",
            line: i + 1,
            snippet: line.trim(),
            suggestion: "Approve only the exact amount needed for the transaction, or implement a permit-based (EIP-2612) flow.",
          })
        }
      })
      return findings
    }
  },
  {
    id: "SEC-021",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/\bassembly\s*\{/.test(line)) {
          const block = lines.slice(i, Math.min(i + 20, lines.length)).join("\n")
          if (/sstore\s*\(|mstore\s*\(|calldataload|delegatecall|create2\s*\(/.test(block)) {
            findings.push({
              id: "SEC-021",
              severity: "medium",
              title: "Inline assembly with low-level storage/call operations",
              description: "Inline assembly bypasses Solidity's type system and safety checks. Misuse of sstore, delegatecall, or create2 in assembly can corrupt storage or execute arbitrary code.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Document exactly why assembly is necessary. Fuzz test the assembly block. Consider using OpenZeppelin's vetted assembly patterns instead.",
            })
          }
        }
      })
      return findings
    }
  },
  {
    id: "SEC-022",
    detect(source) {
      const findings: Finding[] = []
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        if (/require\s*\(\s*msg\.value\s*[><=]/.test(line)) {
          const ctx = lines.slice(Math.max(0, i - 2), i + 6).join("\n")
          if (/(balances|deposited|stake|locked)\[msg\.sender\]\s*[\+\-]=/.test(ctx) &&
              !/nonReentrant/.test(ctx)) {
            findings.push({
              id: "SEC-022",
              severity: "high",
              title: "ETH deposit without reentrancy guard",
              description: "This function accepts ETH and updates a user balance mapping without a reentrancy guard. If a refund path exists elsewhere, a reentrant call can double-credit a deposit.",
              line: i + 1,
              snippet: line.trim(),
              suggestion: "Add nonReentrant modifier and ensure state is updated before any ETH transfer.",
            })
          }
        }
      })
      return findings
    }
  },
]
