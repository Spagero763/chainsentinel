import { NextResponse } from "next/server"
import { recordExecution, publicClient } from "../../../../lib/agent"

export const dynamic = "force-dynamic"

// Vercel cron hits this every 10 min. Records one anomaly-detect execution
// on-chain if Mantle activity is detected in recent blocks.
export async function GET() {
  try {
    const latest = await publicClient.getBlockNumber()
    const block = await publicClient.getBlock({ blockNumber: latest, includeTransactions: false })

    const payload = JSON.stringify({
      block: latest.toString(),
      ts: Number(block.timestamp),
      tx: block.transactions?.length ?? 0,
    })

    // Only record if the block had activity (non-zero tx count)
    const hadActivity = (block.transactions?.length ?? 0) > 0
    const hash = hadActivity
      ? await recordExecution("anomaly-detect", true, payload)
      : null

    return NextResponse.json({
      ok: true,
      recorded: !!hash,
      txHash: hash,
      block: latest.toString(),
      txCount: block.transactions?.length ?? 0,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
