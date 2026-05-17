<p align="center">
  <a href="https://chainsentinel-app.vercel.app">
    <img src="public/logo.svg" alt="ChainSentinel" width="220" />
  </a>
</p>

<p align="center">
  Real-time on-chain intelligence for Mantle.
</p>

<p align="center">
  <a href="https://chainsentinel-app.vercel.app"><b>chainsentinel-app.vercel.app</b></a>
  ·
  <a href="https://t.me/ChainSentinelg">Telegram</a>
  ·
  <a href="https://discord.gg/vNCqr4VA">Discord</a>
  ·
  <a href="https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e">Agent on Mantle</a>
</p>

---

ChainSentinel watches Mantle mainnet and tells you what's happening — whale movements, contract deployments, gas spikes, DeFi activity — as it happens. The audit tool lets you drop in any Solidity contract and get a full breakdown of gas issues, security vulnerabilities and an AI-written summary of the risk. Every audit is permanently recorded on-chain through the agent's ERC-8004 identity.

## What's in here

- **Audit tool** — Solidity static analysis with 37 rules + AI deep audit.
- **Live feed** — real-time anomaly detection on Mantle mainnet.
- **Agent identity** — ERC-8004 NFT on Mantle, every audit recorded on-chain.
- **Watcher** — off-chain Node.js process for Telegram + Discord alerts.

```
app/              Next.js app (audit tool + feed + agent page)
lib/              Static analyzer, AI prompt, agent client, alerts
agent-contract/   AgentIdentity.sol + hardhat deploy scripts
watcher/          Off-chain anomaly watcher → Telegram + Discord
```

## On-chain agent

- Contract: [`0xd933c28d0fc2283cca10f4361226c75f7ffeb39e`](https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e)
- Standard: ERC-8004 (Autonomous Agent Identity)
- Token: CSAI #1 — ChainSentinel
- Skills: gas-audit · security-scan · anomaly-detect · smart-money-track · ai-explain
