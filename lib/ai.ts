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
  if (result.findings.length === 0) {
    return "No issues detected. Contract looks clean across gas and security checks."
  }

  const findingsSummary = result.findings
    .map(f => `[${f.severity.toUpperCase()}] ${f.id}: ${f.title}${f.line ? ` (line ${f.line})` : ""}\n  → ${f.suggestion}`)
    .join("\n\n")

  const prompt = `You are a senior Solidity auditor reviewing a smart contract deployed on Mantle (an EVM L2).

The static analyzer found ${result.findings.length} issues (score: ${result.score}/100).

FINDINGS:
${findingsSummary}

CONTRACT SNIPPET (first 80 lines):
${source.split("\n").slice(0, 80).join("\n")}

Write a concise audit summary for the developer. Be direct, technical, and specific:
1. Call out the most critical issues first with exact impact
2. Explain the Mantle-specific context where relevant (L2 gas pricing, sequencer trust assumptions)
3. Give a prioritized fix order
4. End with the overall risk rating: CRITICAL / HIGH / MEDIUM / LOW / CLEAN

No fluff. Write like a senior auditor, not a chatbot.`

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1024
  })

  return response.choices[0]?.message?.content ?? "AI explanation unavailable."
}
