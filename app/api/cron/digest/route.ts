import { NextResponse } from "next/server"
import { createPublicClient, http, formatEther, defineChain } from "viem"
import { broadcastDigest } from "../../../../lib/alerts"

export const dynamic = "force-dynamic"
export const maxDuration = 60

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

const WHALE = BigInt(50_000) * BigInt(10 ** 18)
const LARGE = BigInt(500)    * BigInt(10 ** 18)
const MIN_SMART = BigInt(100) * BigInt(10 ** 18)
const ACCUM = BigInt(50) * BigInt(10 ** 18)

export async function GET() {
  try {
    const latest = await client.getBlockNumber()

    const blockPromises = []
    for (let i = 0n; i < 60n; i++) {
      blockPromises.push(client.getBlock({ blockNumber: latest - i, includeTransactions: true }))
    }
    const blocks = await Promise.all(blockPromises)

    let whale = 0, large = 0, deploy = 0, gas = 0, defi = 0
    const wallets = new Map<string, { vin: bigint; vout: bigint }>()

    for (const block of blocks) {
      const txs = block.transactions.filter(t => typeof t === "object") as Array<{
        from: `0x${string}`; to: `0x${string}` | null; value: bigint; gas: bigint; gasPrice?: bigint; input: string
      }>
      const gasPrices = txs.map(t => t.gasPrice ?? 0n).filter(g => g > 0n).sort((a, b) => (a < b ? -1 : 1))
      const median = gasPrices.length ? gasPrices[Math.floor(gasPrices.length / 2)] : 0n

      for (const tx of txs) {
        const from = tx.from.toLowerCase()
        const to = tx.to?.toLowerCase()
        if (SYSTEM.has(from) || (to && SYSTEM.has(to))) continue

        if (tx.value >= WHALE && tx.to) whale++
        else if (tx.value >= LARGE && tx.to) large++
        if (!tx.to && tx.input && tx.input.length > 2) deploy++
        if (median > 0n && tx.gasPrice && tx.gasPrice > median * 3n) gas++
        if (tx.to && tx.input && tx.input.length > 10 && tx.gas > 100_000n) defi++

        if (tx.value > 0n) {
          const s = wallets.get(from) ?? { vin: 0n, vout: 0n }
          s.vout += tx.value; wallets.set(from, s)
          if (to) {
            const r = wallets.get(to) ?? { vin: 0n, vout: 0n }
            r.vin += tx.value; wallets.set(to, r)
          }
        }
      }
    }

    const topWallets = [...wallets.entries()]
      .map(([address, w]) => ({ address, total: w.vin + w.vout, net: w.vin - w.vout }))
      .filter(x => x.total >= MIN_SMART)
      .sort((a, b) => (a.total < b.total ? 1 : -1))
      .slice(0, 5)
      .map(x => ({
        address: x.address,
        totalVolume: formatEther(x.total),
        netFlow: formatEther(x.net),
        behavior: x.net >= ACCUM ? "accumulating" : x.net <= -ACCUM ? "distributing" : "active",
      }))

    const total = whale + large + deploy + gas + defi
    const hasActivity = total > 0 || topWallets.length > 0

    let pushed = { telegram: false, discord: false }
    if (hasActivity) {
      pushed = await broadcastDigest({
        block: latest.toString(),
        anomalies: { whale, large, deploy, gas, defi, total },
        topWallets,
      })
    }

    return NextResponse.json({
      ok: true,
      block: latest.toString(),
      anomalies: { whale, large, deploy, gas, defi, total },
      smartWallets: topWallets.length,
      pushed,
      skipped: !hasActivity,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
