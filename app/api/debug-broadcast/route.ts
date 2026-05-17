import { NextResponse } from "next/server"
import { broadcastAudit } from "../../../lib/alerts"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  const result: Record<string, unknown> = {}

  try {
    await broadcastAudit({
      score: 24,
      totalFindings: 5,
      counts: { critical: 2, high: 1, medium: 1, low: 1, info: 0 },
      topFindings: [
        {
          id: "SEC-001",
          severity: "critical",
          title: "Reentrancy: state update after external call",
          description: "Test finding for broadcast debug",
          line: 12,
          suggestion: "Apply ReentrancyGuard",
        },
        {
          id: "SEC-009",
          severity: "critical",
          title: "No access control on privileged function: setOwner()",
          description: "Anyone can change owner",
          line: 24,
          suggestion: "Add onlyOwner",
        },
      ],
      aiSummary: "Test contract has critical reentrancy and access control issues. The withdraw function violates checks-effects-interactions pattern.",
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    }, "debug-" + Date.now())
    result.ok = true
  } catch (e) {
    result.ok = false
    result.error = (e as Error).message
    result.stack = (e as Error).stack?.slice(0, 500)
  }

  // Now try direct Telegram with the EXACT format used in audits
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (token && chatId) {
    const text = `🔴 <b>ChainSentinel — New Audit</b>
Score: <b>24/100</b> · Verdict: <b>HIGH</b>
5 issues found

🔴 2 critical · 🟠 1 high · 🟡 1 medium · ⚪ 1 low

<b>Top findings:</b>
🔴 Reentrancy: state update after external call <i>(line 12)</i>
🔴 No access control on privileged function: setOwner() <i>(line 24)</i>

💬 <i>Test contract has critical reentrancy and access control issues.</i>

🛡 <a href="https://chainsentinel-app.vercel.app">Audit live</a> · ⛓ <a href="https://mantlescan.xyz/tx/0x1234">On-chain proof</a>`

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })

    result.directTelegramStatus = res.status
    result.directTelegramResponse = (await res.text()).slice(0, 600)
  }

  return NextResponse.json(result)
}
