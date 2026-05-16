import Groq from "groq-sdk"
import type { Anomaly } from "./detector"

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

export async function explainAnomalies(
  blockNumber: bigint,
  anomalies: Anomaly[]
): Promise<string> {
  if (anomalies.length === 0) return ""

  const summary = anomalies
    .map(a => `[${a.severity.toUpperCase()}] ${a.type}: ${a.detail}`)
    .join("\n")

  const prompt = `You are an on-chain intelligence analyst monitoring Mantle (an EVM L2).

Block ${blockNumber} just produced these anomalies:
${summary}

In 3-5 sentences max, explain what this activity likely means for the Mantle ecosystem.
Be specific: mention DeFi impact, potential risks, or smart money signals.
Write like a trading desk analyst, not a chatbot. No bullet points. No hedging phrases like "it's worth noting".`

  const res = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 256,
  })

  return res.choices[0]?.message?.content ?? ""
}
