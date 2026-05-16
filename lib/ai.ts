import Groq from "groq-sdk"
import type { AnalysisResult } from "./analyzer"

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

export async function explainFindings(
  source: string,
  result: AnalysisResult
): Promise<string> {
  const contractPreview = source.length > 6000
    ? source.slice(0, 6000) + `\n\n... [${source.length - 6000} chars truncated]`
    : source

  const staticFindings = result.findings.length > 0
    ? result.findings
        .map(f => `[${f.severity.toUpperCase()}] ${f.id}: ${f.title}${f.line ? ` (line ${f.line})` : ""}`)
        .join("\n")
    : "None detected"

  const prompt = `You are the lead auditor at a top smart contract security firm. You have audited protocols securing over $2 billion in TVL. Your job is to complete a security review of the Solidity contract below.

The static analyzer already caught the following issues — do NOT repeat them. Your job is to find what it MISSED and provide expert-level analysis.

═══════════════════════════════════════
CONTRACT SOURCE
═══════════════════════════════════════
${contractPreview}

═══════════════════════════════════════
ALREADY DETECTED BY STATIC ANALYSIS (${result.findings.length} findings, score: ${result.score}/100)
═══════════════════════════════════════
${staticFindings}

═══════════════════════════════════════
YOUR AUDIT TASKS
═══════════════════════════════════════

Go through EVERY category below. For each one, either report a finding or mark it clear:

1. BUSINESS LOGIC — Can the protocol's own rules be gamed? Incorrect accounting, wrong fee calculations, token minting exploits.

2. ACCESS CONTROL — Are ALL state-changing functions properly gated? Setter functions, admin functions, emergencies. Not just mint/burn.

3. ECONOMIC ATTACKS — Flash loan vectors, sandwich attacks, price oracle manipulation, liquidity drain, MEV exposure.

4. REENTRANCY (CROSS-FUNCTION) — Not just recursive calls. Can an attacker call functionA → exploit state inconsistency in functionB?

5. PRECISION & ARITHMETIC — Integer division rounding, scaling mismatches, token decimal assumptions, cumulative rounding errors.

6. PRIVILEGE ESCALATION — Can a low-privilege account elevate itself? Role assignment flaws, missing revocation logic.

7. FRONT-RUNNING & MEV — Can transactions be sandwiched, front-run, or back-run for profit? Missing commit-reveal or slippage guards.

8. DENIAL OF SERVICE — Gas griefing, forced revert, storage bloat, unbounded operations that can be triggered by attackers.

9. TOKEN HANDLING — Fee-on-transfer tokens, rebasing tokens, ERC-777 reentrancy hooks, non-standard return values.

10. L2 / MANTLE SPECIFIC — Sequencer censorship risk, msg.value assumptions on L2, bridging trust assumptions, differences from Ethereum mainnet.

═══════════════════════════════════════
OUTPUT FORMAT (follow exactly)
═══════════════════════════════════════

## Additional Vulnerabilities Found
[List ONLY issues the static analyzer missed. Each finding: severity in brackets, one-line title, then 2-sentence explanation of the exact attack. If nothing new found, say "Static analysis captured the main issues."]

## Attack Scenarios
[1–2 concrete attack scenarios. Walk through step-by-step how an attacker would exploit the most dangerous issue. Be specific — amounts, function calls, sequence of events.]

## Priority Fix Order
[Numbered list. Most dangerous first. One line each.]

## Verdict
[One of: CRITICAL / HIGH / MEDIUM / LOW / CLEAN — followed by one sentence explaining why]`

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1500,
  })

  return response.choices[0]?.message?.content?.trim() ?? "AI analysis unavailable."
}
