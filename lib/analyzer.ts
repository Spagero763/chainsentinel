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
  score: number // 0-100, higher = cleaner code
}

export function analyze(source: string): AnalysisResult {
  const findings: Finding[] = []

  for (const rule of [...gasRules, ...securityRules]) {
    findings.push(...rule.detect(source))
  }

  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
    total: findings.length
  }

  const penalty =
    summary.critical * 25 +
    summary.high * 15 +
    summary.medium * 8 +
    summary.low * 3 +
    summary.info * 1

  const score = Math.max(0, 100 - penalty)

  return { findings, summary, score }
}
