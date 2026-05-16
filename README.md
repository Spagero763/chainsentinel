# ChainSentinel

Static analysis tool for Solidity contracts and a real-time anomaly feed for Mantle mainnet.

**Live:** https://chainsentinel-app.vercel.app

---

## What it does

**Audit tool (`/`)** — paste any Solidity contract, get a structured breakdown of gas inefficiencies and security issues with line-level pointers and fix suggestions. An LLM pass runs after the static checks to give a plain-English summary of the risk surface.

**Live feed (`/feed`)** — scans the last 20 Mantle blocks every 8 seconds. Surfaces whale transfers, large MNT movements, contract deployments, gas spikes, and DeFi interactions as they happen. Each event links directly to MantleScan.

---

## Stack

- Next.js 16 (App Router)
- Monaco editor
- viem — Mantle RPC reads
- Groq / llama-3.3-70b — AI audit summaries
- ERC-8004 agent identity contract on Mantle mainnet

---

## Static analysis rules

**Gas**
- Public state variables that should be external
- Array `.length` read inside loop condition
- Post-increment (`i++`) instead of pre-increment
- Revert strings over 32 bytes
- Standalone `bool` storage variables
- Unindexed event parameters
- Magic numbers (unlabeled literals)

**Security**
- Reentrancy (state changes after external calls)
- `tx.origin` used for auth
- `block.timestamp` as randomness source
- Unsafe `delegatecall`
- `selfdestruct` present
- `.transfer()` / `.send()` (2300 gas limit)
- Outdated Solidity pragma (`<0.8.0`)
- Unchecked external call return values

---

## Run locally

```bash
git clone https://github.com/Spagero763/chainsentinel
cd chainsentinel
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_key_here
```

```bash
npm run dev
```

Open http://localhost:3000

---

## Agent identity

The on-chain agent is registered at [`0xd933c28d0fc2283cca10f4361226c75f7ffeb39e`](https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e) on Mantle mainnet — ERC-8004 compliant, skills: `gas-audit`, `security-scan`, `anomaly-detect`, `smart-money-track`, `ai-explain`.
