import { NextResponse } from "next/server"
import { createPublicClient, http, formatEther, defineChain, parseAbi } from "viem"

const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
})

const client = createPublicClient({ chain: mantle, transport: http("https://rpc.mantle.xyz") })

const AGENT_CONTRACT = "0xd933c28d0fc2283cca10f4361226c75f7ffeb39e"
const AGENT_ABI = parseAbi([
  "function agents(uint256) view returns (string name, string agentType, address owner, uint256 mintedAt, uint256 totalExecutions, uint256 successfulExecutions, int256 reputationScore, bool active)",
  "function getSkills(uint256) view returns (string[])",
])

const WHALE_THRESHOLD  = BigInt(50_000)  * BigInt(10 ** 18)
const LARGE_THRESHOLD  = BigInt(500)     * BigInt(10 ** 18)
const GAS_SPIKE_RATIO  = 3n

const SIG: Record<string, string> = {
  "a9059cbb": "ERC-20 transfer",
  "095ea7b3": "ERC-20 approve",
  "23b872dd": "ERC-20 transferFrom",
  "38ed1739": "DEX swap",
  "7ff36ab5": "DEX swap (ETH in)",
  "18cbafe5": "DEX swap (ETH out)",
  "791ac947": "DEX swap exact out",
  "e8e33700": "add liquidity",
  "baa2abde": "remove liquidity",
  "d0e30db0": "wrap ETH",
  "2e1a7d4d": "unwrap ETH",
  "4e71d92d": "claim rewards",
  "b6b55f25": "deposit",
  "2f4f21e2": "stake",
  "a694fc3a": "stake tokens",
  "2e17de78": "unstake",
  "3d18b912": "harvest",
  "70a08231": "balanceOf query",
  "6a761202": "gnosis safe exec",
  "1cff79cd": "delegate call",
}

function callLabel(input: string, gas: bigint): string {
  const sel = input.slice(2, 10).toLowerCase()
  if (SIG[sel]) return SIG[sel]
  if (gas > 500_000n) return "complex protocol call"
  if (gas > 200_000n) return "DeFi interaction"
  if (gas > 100_000n) return "contract interaction"
  return "contract call"
}

export interface FeedEvent {
  id: string
  type: "WHALE" | "LARGE" | "DEPLOY" | "GAS_SPIKE"
  severity: "critical" | "high" | "medium"
  block: string
  timestamp: number
  title: string
  detail: string
  from?: string
  to?: string
  value?: string
  txHash: string
  explorerUrl: string
}

async function scanBlock(blockNumber: bigint): Promise<FeedEvent[]> {
  const events: FeedEvent[] = []

  const block = await client.getBlock({ blockNumber, includeTransactions: true })
  const txs = (block.transactions ?? []).filter(tx => typeof tx === "object") as Array<{
    hash: `0x${string}`
    from: `0x${string}`
    to: `0x${string}` | null
    value: bigint
    gas: bigint
    gasPrice?: bigint
    input: string
  }>

  const gasPrices = txs.map(tx => tx.gasPrice ?? 0n).filter(g => g > 0n).sort((a, b) => a < b ? -1 : 1)
  const median = gasPrices.length > 0 ? gasPrices[Math.floor(gasPrices.length / 2)] : 0n

  // Mantle system addresses to ignore
  const SYSTEM = new Set([
    "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001",
    "0x4200000000000000000000000000000000000015",
    "0x4200000000000000000000000000000000000016",
  ])

  for (const tx of txs) {
    if (SYSTEM.has(tx.from.toLowerCase()) || (tx.to && SYSTEM.has(tx.to.toLowerCase()))) continue
    const ts = Number(block.timestamp)

    if (tx.value >= WHALE_THRESHOLD && tx.to) {
      events.push({
        id: tx.hash,
        type: "WHALE",
        severity: "critical",
        block: blockNumber.toString(),
        timestamp: ts,
        title: `${Number(formatEther(tx.value)).toLocaleString()} MNT moved`,
        detail: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)} → ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`,
        from: tx.from,
        to: tx.to,
        value: formatEther(tx.value),
        txHash: tx.hash,
        explorerUrl: `https://mantlescan.xyz/tx/${tx.hash}`,
      })
    } else if (tx.value >= LARGE_THRESHOLD && tx.to) {
      events.push({
        id: tx.hash,
        type: "LARGE",
        severity: "high",
        block: blockNumber.toString(),
        timestamp: ts,
        title: `${Number(formatEther(tx.value)).toLocaleString()} MNT moved`,
        detail: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)} → ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`,
        from: tx.from,
        to: tx.to,
        value: formatEther(tx.value),
        txHash: tx.hash,
        explorerUrl: `https://mantlescan.xyz/tx/${tx.hash}`,
      })
    }

    if (!tx.to && tx.input && tx.input.length > 2) {
      events.push({
        id: tx.hash + "_deploy",
        type: "DEPLOY",
        severity: "medium",
        block: blockNumber.toString(),
        timestamp: ts,
        title: "New contract deployed",
        detail: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)} · ${Math.floor((tx.input.length - 2) / 2).toLocaleString()} bytes`,
        from: tx.from,
        txHash: tx.hash,
        explorerUrl: `https://mantlescan.xyz/tx/${tx.hash}`,
      })
    }

    if (median > 0n && tx.gasPrice && tx.gasPrice > median * GAS_SPIKE_RATIO) {
      events.push({
        id: tx.hash + "_gas",
        type: "GAS_SPIKE",
        severity: "medium",
        block: blockNumber.toString(),
        timestamp: ts,
        title: "Gas price spike",
        detail: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)} · ${(tx.gasPrice / BigInt(10 ** 9))}gwei vs ${(median / BigInt(10 ** 9))}gwei median`,
        from: tx.from,
        txHash: tx.hash,
        explorerUrl: `https://mantlescan.xyz/tx/${tx.hash}`,
      })
    }

    // Contract interaction — catches DeFi swaps, protocol calls
    if (tx.to && tx.input && tx.input.length > 10 && tx.gas > 50_000n) {
      events.push({
        id: tx.hash + "_interact",
        type: "DEPLOY",
        severity: "medium",
        block: blockNumber.toString(),
        timestamp: ts,
        title: callLabel(tx.input, tx.gas),
        detail: `${tx.from.slice(0, 6)}...${tx.from.slice(-4)} → ${tx.to.slice(0, 6)}...${tx.to.slice(-4)} · ${tx.gas.toLocaleString()} gas`,
        from: tx.from,
        to: tx.to,
        txHash: tx.hash,
        explorerUrl: `https://mantlescan.xyz/tx/${tx.hash}`,
      })
    }
  }

  return events
}

export async function GET() {
  try {
    const [latest, agentRaw, skills] = await Promise.all([
      client.getBlockNumber(),
      client.readContract({ address: AGENT_CONTRACT, abi: AGENT_ABI, functionName: "agents", args: [1n] }),
      client.readContract({ address: AGENT_CONTRACT, abi: AGENT_ABI, functionName: "getSkills", args: [1n] }),
    ])

    const agent = agentRaw as readonly [string, string, string, bigint, bigint, bigint, bigint, boolean]

    // Scan last 20 blocks for events
    const scanPromises: Promise<FeedEvent[]>[] = []
    for (let i = 0n; i < 20n; i++) {
      scanPromises.push(scanBlock(latest - i))
    }

    const results = await Promise.all(scanPromises)
    const events = results.flat().sort((a, b) => b.timestamp - a.timestamp).slice(0, 30)

    return NextResponse.json({
      block: latest.toString(),
      events,
      agent: {
        name: agent[0],
        type: agent[1],
        totalExecutions: agent[4].toString(),
        successfulExecutions: agent[5].toString(),
        reputationScore: agent[6].toString(),
        skills: skills as string[],
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
