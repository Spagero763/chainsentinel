import Groq from "groq-sdk"
import type { AnalysisResult } from "./analyzer"
import type { Finding } from "./rules/gas"

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

const MODEL_PRIMARY = "openai/gpt-oss-120b"
const MODEL_FALLBACK = "llama-3.3-70b-versatile"

export interface AIAudit {
  narrative: string
  findings: Finding[]
}

const SYSTEM_PROMPT = `You are the lead auditor at a top-tier smart contract security firm — equivalent to Trail of Bits, OpenZeppelin, or Cyfrin. You have personally audited Uniswap V4, Aave V3, Compound III, and reviewed over 500 production contracts. You have published research on novel reentrancy patterns and L2-specific vulnerabilities.

Your job is to find vulnerabilities in Solidity contracts that static analysis cannot detect — business logic flaws, economic attacks, cross-function state inconsistencies.

You are precise. You do NOT hallucinate findings. Every finding you report is verifiable from the source code. You write like a senior auditor — direct, technical, no marketing language, no hedging.

CRITICAL EXPLOIT PATTERNS to pattern-match against:
- Beanstalk (2022, -$182M): governance flash loan — voting power based on instantaneous balance
- Wormhole (2022, -$325M): signature verification bypass — incorrect guardian set check
- Ronin (2022, -$625M): trusted multisig threshold too low
- bZx (2020, -$1M): oracle price manipulated via flash loan in same transaction
- The DAO (2016, -$60M): classic reentrancy on .call before state update
- Parity Wallet (2017, $30M frozen): initialize() left public, attacker took ownership
- Cream Finance (2021, -$130M): incorrect collateral pricing via Yearn vault manipulation
- Nomad (2022, -$190M): proof verification bypass — any zero hash accepted
- Euler (2023, -$197M): donateToReserves with no health check
- Compound III (2021, -$80M): reward distribution math error

VULNERABILITY CATEGORIES (audit through each):
1. Business logic — incorrect accounting, mint/burn errors, fee miscalculation
2. Access control — missing modifiers on state-changing functions
3. Economic / Flash loan — any function depending on a tx-local balance reading
4. Oracle manipulation — single-source prices, no TWAP, spot price as truth
5. Cross-function reentrancy — state inconsistencies between functions
6. Signature security — replay, nonce reuse, missing chainId or domain separator
7. Privilege escalation — role assignment without proper authorization
8. Front-running / MEV — sandwich exposure, missing slippage, predictable txs
9. Token compatibility — fee-on-transfer, rebasing, ERC-777 callback hooks
10. L2-specific (Mantle) — sequencer trust, msg.value handling, bridging risks

You output STRICT JSON only — no markdown, no preamble. The schema is enforced.`

const USER_TEMPLATE = (source: string, staticFindings: string, findingsCount: number, score: number) => `STATIC ANALYSIS RESULTS (do NOT repeat these):
${staticFindings}

Static analyzer caught ${findingsCount} issues. Current score: ${score}/100.

CONTRACT SOURCE:
\`\`\`solidity
${source}
\`\`\`

Find additional vulnerabilities the static rules missed. Be ruthless and precise.

Respond with EXACTLY this JSON shape (no markdown fences, no extra text):

{
  "findings": [
    {
      "id": "AI-001",
      "severity": "critical|high|medium|low|info",
      "title": "concise title (max 80 chars)",
      "description": "what the vulnerability is, in 1-2 sentences",
      "line": 42,
      "attack": "step-by-step exploit scenario, 2-3 sentences referencing the exact functions and state",
      "mitigation": "concrete fix — code-level recommendation",
      "reference": "optional: similar real-world exploit, e.g. 'Beanstalk 2022'"
    }
  ],
  "verdict": "CRITICAL|HIGH|MEDIUM|LOW|CLEAN",
  "summary": "3-4 sentence executive summary covering overall risk posture, most concerning issue, and recommended action"
}

If no additional issues found, return: {"findings": [], "verdict": "...", "summary": "..."}

Only include findings you can directly justify from the source. Hallucinated findings destroy your credibility.`

interface AIResponse {
  findings: Array<{
    id: string
    severity: "critical" | "high" | "medium" | "low" | "info"
    title: string
    description: string
    line?: number
    attack: string
    mitigation: string
    reference?: string
  }>
  verdict: string
  summary: string
}

function extractJSON(text: string): AIResponse | null {
  if (!text) return null
  // Try direct parse first
  try { return JSON.parse(text) } catch {}
  // Strip markdown fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) {
    try { return JSON.parse(fenced[1]) } catch {}
  }
  // Find the first { and last } and try
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  return null
}

function aiToFinding(a: AIResponse["findings"][number]): Finding {
  const refLine = a.reference ? `\n\nReference: ${a.reference}` : ""
  return {
    id: a.id || "AI-???",
    severity: a.severity,
    title: a.title,
    description: `${a.description}\n\nAttack scenario: ${a.attack}${refLine}`,
    line: a.line,
    suggestion: a.mitigation,
  }
}

export async function deepAudit(
  source: string,
  result: AnalysisResult
): Promise<AIAudit> {
  const truncated = source.length > 12000
    ? source.slice(0, 12000) + `\n\n// ... [${source.length - 12000} more characters truncated]`
    : source

  const staticFindings = result.findings.length > 0
    ? result.findings
        .map(f => `[${f.severity.toUpperCase()}] ${f.id}: ${f.title}${f.line ? ` (line ${f.line})` : ""}`)
        .join("\n")
    : "None"

  const userPrompt = USER_TEMPLATE(truncated, staticFindings, result.findings.length, result.score)

  let raw = ""
  let usedFallback = false
  try {
    const res = await getGroq().chat.completions.create({
      model: MODEL_PRIMARY,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    })
    raw = res.choices[0]?.message?.content ?? ""
  } catch {
    usedFallback = true
    const res = await getGroq().chat.completions.create({
      model: MODEL_FALLBACK,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    })
    raw = res.choices[0]?.message?.content ?? ""
  }

  const parsed = extractJSON(raw)
  if (!parsed) {
    return {
      narrative: raw.slice(0, 2000) || "AI analysis unavailable.",
      findings: [],
    }
  }

  const findings = (parsed.findings ?? []).map(aiToFinding)
  const narrative = [
    parsed.verdict ? `Verdict: ${parsed.verdict}` : "",
    parsed.summary ?? "",
    usedFallback ? "\n(analyzed by llama-3.3-70b — fallback mode)" : "",
  ].filter(Boolean).join("\n\n")

  return { narrative, findings }
}

// Legacy export kept for compatibility — calls deepAudit and returns narrative
export async function explainFindings(
  source: string,
  result: AnalysisResult
): Promise<string> {
  const { narrative } = await deepAudit(source, result)
  return narrative
}
