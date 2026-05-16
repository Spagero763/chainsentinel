import { gasRules, type Finding } from "./rules/gas"
import { securityRules } from "./rules/security"

export interface AnalysisResult {
  findings: Finding[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
    total: number
  }
  score: number
}

export function analyze(source: string): AnalysisResult {
  const seen = new Set<string>()
  const findings: Finding[] = []

  for (const rule of [...securityRules, ...gasRules]) {
    const results = rule.detect(source)
    for (const f of results) {
      // Deduplicate: same rule + same line
      const key = `${f.id}:${f.line ?? "file"}`
      if (seen.has(key)) continue
      seen.add(key)
      findings.push(f)
    }
  }

  // Sort: critical → high → medium → low → info, then by line number
  const ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  findings.sort((a, b) => {
    const sevDiff = ORDER[a.severity] - ORDER[b.severity]
    if (sevDiff !== 0) return sevDiff
    return (a.line ?? 9999) - (b.line ?? 9999)
  })

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

  return { findings, summary, score: Math.max(0, 100 - penalty) }
}
