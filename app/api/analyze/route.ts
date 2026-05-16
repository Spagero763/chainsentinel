import { NextRequest, NextResponse } from "next/server"
import { analyze } from "../../../lib/analyzer"
import { explainFindings } from "../../../lib/ai"
import { recordExecution } from "../../../lib/agent"

export async function POST(req: NextRequest) {
  const { source } = await req.json()

  if (!source || typeof source !== "string") {
    return NextResponse.json({ error: "No source provided" }, { status: 400 })
  }

  if (source.length > 100_000) {
    return NextResponse.json({ error: "Contract too large (max 100KB)" }, { status: 400 })
  }

  const result = analyze(source)
  const aiSummary = await explainFindings(source, result)

  // Fire-and-forget on-chain execution record
  const success = result.findings.length > 0 || result.score === 100
  const skill = result.summary.critical > 0 || result.summary.high > 0 ? "security-scan" : "gas-audit"
  const txPromise = recordExecution(skill, success, source)
  const txHash = await Promise.race([
    txPromise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
  ])

  return NextResponse.json({ ...result, aiSummary, txHash, skill })
}
