import { client, explorerTx, explorerAddress } from "./chain"
import { formatEther, type Address } from "viem"

export interface Anomaly {
  type: string
  severity: "critical" | "high" | "medium"
  title: string
  detail: string
  txHash?: string
  address?: string
  value?: string
  explorerUrl?: string
}

// Thresholds — calibrated to actual Mantle mainnet activity levels
const WHALE_MNT = BigInt(50_000) * BigInt(10 ** 18)
const LARGE_MNT = BigInt(500)    * BigInt(10 ** 18)
const MAX_GAS_RATIO = 3n

const SYSTEM = new Set([
  "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001",
  "0x4200000000000000000000000000000000000015",
  "0x4200000000000000000000000000000000000016",
])

export async function detectBlockAnomalies(blockNumber: bigint): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  const block = await client.getBlock({
    blockNumber,
    includeTransactions: true,
  })

  if (!block.transactions || block.transactions.length === 0) return []

  const txs = block.transactions.filter(tx => typeof tx === "object") as Array<{
    hash: string
    from: Address
    to: Address | null
    value: bigint
    gas: bigint
    gasPrice?: bigint
    input: string
  }>

  // Compute median gas price
  const gasPrices = txs
    .map(tx => tx.gasPrice ?? 0n)
    .filter(g => g > 0n)
    .sort((a, b) => (a < b ? -1 : 1))

  const medianGas = gasPrices.length > 0
    ? gasPrices[Math.floor(gasPrices.length / 2)]
    : 0n

  for (const tx of txs) {
    if (SYSTEM.has(tx.from.toLowerCase()) || (tx.to && SYSTEM.has(tx.to.toLowerCase()))) continue

    // 1. Whale transfer — large native MNT movement
    if (tx.value >= WHALE_MNT && tx.to !== null) {
      anomalies.push({
        type: "WHALE_TRANSFER",
        severity: "critical",
        title: "Whale transfer detected",
        detail: `${formatEther(tx.value)} MNT moved from ${tx.from} → ${tx.to}`,
        txHash: tx.hash,
        address: tx.from,
        value: formatEther(tx.value),
        explorerUrl: explorerTx(tx.hash),
      })
    } else if (tx.value >= LARGE_MNT && tx.to !== null) {
      anomalies.push({
        type: "LARGE_TRANSFER",
        severity: "high",
        title: "Large transfer detected",
        detail: `${formatEther(tx.value)} MNT moved from ${tx.from} → ${tx.to}`,
        txHash: tx.hash,
        address: tx.from,
        value: formatEther(tx.value),
        explorerUrl: explorerTx(tx.hash),
      })
    }

    // 2. Contract deployment
    if (tx.to === null && tx.input && tx.input.length > 2) {
      anomalies.push({
        type: "CONTRACT_DEPLOY",
        severity: "medium",
        title: "New contract deployed",
        detail: `Deployed by ${tx.from} — bytecode ${Math.floor((tx.input.length - 2) / 2)} bytes`,
        txHash: tx.hash,
        address: tx.from,
        explorerUrl: explorerTx(tx.hash),
      })
    }

    // 3. Gas price spike — potential front-running or urgent MEV
    if (medianGas > 0n && tx.gasPrice && tx.gasPrice > medianGas * MAX_GAS_RATIO) {
      anomalies.push({
        type: "GAS_SPIKE",
        severity: "medium",
        title: "Gas price spike — possible front-run",
        detail: `${tx.from} paid ${(tx.gasPrice / BigInt(10 ** 9))}gwei vs median ${(medianGas / BigInt(10 ** 9))}gwei`,
        txHash: tx.hash,
        address: tx.from,
        explorerUrl: explorerTx(tx.hash),
      })
    }
  }

  return anomalies
}

// Track known smart money wallets across blocks
export async function getWalletActivity(address: Address, blockCount = 20n): Promise<{
  txCount: number
  totalVolume: bigint
  lastSeen: bigint
}> {
  const latest = await client.getBlockNumber()
  let txCount = 0
  let totalVolume = 0n
  let lastSeen = 0n

  for (let i = latest; i > latest - blockCount; i--) {
    const block = await client.getBlock({ blockNumber: i, includeTransactions: true })
    const txs = (block.transactions ?? []).filter(tx => typeof tx === "object") as Array<{
      from: Address
      to: Address | null
      value: bigint
    }>

    for (const tx of txs) {
      if (tx.from.toLowerCase() === address.toLowerCase() ||
          tx.to?.toLowerCase() === address.toLowerCase()) {
        txCount++
        totalVolume += tx.value
        if (i > lastSeen) lastSeen = i
      }
    }
  }

  return { txCount, totalVolume, lastSeen }
}
