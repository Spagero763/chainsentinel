import { NextResponse } from "next/server"
import { createPublicClient, http, formatEther, defineChain } from "viem"

const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
})

const client = createPublicClient({ chain: mantle, transport: http("https://rpc.mantle.xyz") })

const SYSTEM = new Set([
  "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001",
  "0x4200000000000000000000000000000000000015",
  "0x4200000000000000000000000000000000000016",
])

const MIN_VOLUME = BigInt(100) * BigInt(10 ** 18)  // ≥100 MNT moved to qualify as smart money
const ACCUM_THRESHOLD = BigInt(50) * BigInt(10 ** 18)

export interface SmartWallet {
  address: string
  volumeIn: string
  volumeOut: string
  totalVolume: string
  txCount: number
  netFlow: string
  behavior: "accumulating" | "distributing" | "active"
  explorerUrl: string
}

export async function GET() {
  try {
    const latest = await client.getBlockNumber()

    const blockPromises = []
    for (let i = 0n; i < 20n; i++) {
      blockPromises.push(client.getBlock({ blockNumber: latest - i, includeTransactions: true }))
    }
    const blocks = await Promise.all(blockPromises)

    const wallets = new Map<string, { vin: bigint; vout: bigint; count: number }>()

    for (const block of blocks) {
      for (const tx of block.transactions) {
        if (typeof tx !== "object") continue
        if (!tx.value || tx.value === 0n) continue
        const from = tx.from.toLowerCase()
        const to = tx.to?.toLowerCase()
        if (SYSTEM.has(from) || (to && SYSTEM.has(to))) continue

        const sender = wallets.get(from) ?? { vin: 0n, vout: 0n, count: 0 }
        sender.vout += tx.value
        sender.count += 1
        wallets.set(from, sender)

        if (to) {
          const recv = wallets.get(to) ?? { vin: 0n, vout: 0n, count: 0 }
          recv.vin += tx.value
          recv.count += 1
          wallets.set(to, recv)
        }
      }
    }

    const ranked: SmartWallet[] = [...wallets.entries()]
      .map(([address, w]) => ({ address, w, total: w.vin + w.vout, net: w.vin - w.vout }))
      .filter(x => x.total >= MIN_VOLUME)
      .sort((a, b) => (a.total < b.total ? 1 : -1))
      .slice(0, 12)
      .map(x => ({
        address: x.address,
        volumeIn: formatEther(x.w.vin),
        volumeOut: formatEther(x.w.vout),
        totalVolume: formatEther(x.total),
        txCount: x.w.count,
        netFlow: formatEther(x.net),
        behavior:
          x.net >= ACCUM_THRESHOLD ? "accumulating"
          : x.net <= -ACCUM_THRESHOLD ? "distributing"
          : "active",
        explorerUrl: `https://mantlescan.xyz/address/${x.address}`,
      }))

    return NextResponse.json({ block: latest.toString(), wallets: ranked })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
