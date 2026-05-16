import { NextRequest, NextResponse } from "next/server"
import { analyze } from "../../../lib/analyzer"
import { deepAudit } from "../../../lib/ai"
import { recordExecution } from "../../../lib/agent"
import type { Finding } from "../../../lib/rules/gas"

export const maxDuration = 60

function rescore(findings: Finding[]) {
  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    high:     findings.filter(f => f.severity === "high").length,
    medium:   findings.filter(f => f.severity === "medium").length,
    low:      findings.filter(f => f.severity === "low").length,
    info:     findings.filter(f => f.severity === "info").length,
    total:    findings.length,
  }
  const penalty =
    summary.critical * 25 +
    summary.high     * 12 +
    summary.medium   * 6  +
    summary.low      * 2  +
    summary.info     * 1
  return { summary, score: Math.max(0, 100 - penalty) }
}

const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export async function POST(req: NextRequest) {
  const { source } = await req.json()

  if (!source || typeof source !== "string") {
    return NextResponse.json({ error: "No source provided" }, { status: 400 })
  }

  if (source.length > 100_000) {
    return NextResponse.json({ error: "Contract too large (max 100KB)" }, { status: 400 })
  }

  const staticResult = analyze(source)

  const aiAudit = await deepAudit(source, staticResult).catch(e => ({
    narrative: `AI analysis failed: ${(e as Error).message}`,
    findings: [],
  }))

  // Merge static + AI findings, deduplicate by (line, normalized-title)
  const seen = new Set<string>()
  const merged: Finding[] = []
  for (const f of [...staticResult.findings, ...aiAudit.findings]) {
    const key = `${f.line ?? "x"}:${f.title.toLowerCase().slice(0, 40)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(f)
  }
  merged.sort((a, b) => {
    const sev = (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9)
    if (sev !== 0) return sev
    return (a.line ?? 9999) - (b.line ?? 9999)
  })

  const { summary, score } = rescore(merged)

  // Fire-and-forget on-chain execution record
  const skill = summary.critical > 0 || summary.high > 0 ? "security-scan" : "gas-audit"
  const txPromise = recordExecution(skill, true, source)
  const txHash = await Promise.race([
    txPromise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
  ])

  return NextResponse.json({
    findings: merged,
    summary,
    score,
    aiSummary: aiAudit.narrative,
    aiFindingsCount: aiAudit.findings.length,
    txHash,
    skill,
  })
}
