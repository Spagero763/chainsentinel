import type { Finding } from "./rules/gas"

const LIVE_URL = "https://chainsentinel-app.vercel.app"
const AGENT_URL = "https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e"
const LOGO_URL = `${LIVE_URL}/api/icon-png`

const SEV_ICON: Record<string, string> = {
  critical: "🔴",
  high:     "🟠",
  medium:   "🟡",
  low:      "⚪",
  info:     "ℹ️",
}

const SEV_COLOR: Record<string, number> = {
  critical: 0xf87171,
  high:     0xfb923c,
  medium:   0x60a5fa,
  low:      0x71717a,
  info:     0x52525b,
}

export interface AuditAlert {
  score: number
  totalFindings: number
  counts: { critical: number; high: number; medium: number; low: number; info: number }
  topFindings: Finding[]
  aiSummary: string
  txHash?: string | null
}

function scoreSeverity(score: number): "critical" | "high" | "medium" | "low" {
  if (score < 50) return "critical"
  if (score < 70) return "high"
  if (score < 85) return "medium"
  return "low"
}

function scoreVerdict(score: number): string {
  if (score >= 85) return "CLEAN"
  if (score >= 70) return "LOW"
  if (score >= 50) return "MEDIUM"
  if (score >= 25) return "HIGH"
  return "CRITICAL"
}

// In-memory rate limit per source-hash to prevent spam (10 min window)
const recentHashes = new Map<string, number>()
const RATE_LIMIT_MS = 10 * 60 * 1000

function shouldBroadcast(hash: string): boolean {
  const now = Date.now()
  for (const [h, t] of recentHashes) {
    if (now - t > RATE_LIMIT_MS) recentHashes.delete(h)
  }
  if (recentHashes.has(hash)) return false
  recentHashes.set(hash, now)
  return true
}

export async function broadcastAudit(alert: AuditAlert, sourceHash: string): Promise<void> {
  if (!shouldBroadcast(sourceHash)) return
  const [tg, dc] = await Promise.allSettled([
    sendTelegramAudit(alert),
    sendDiscordAudit(alert),
  ])
  if (tg.status === "rejected") console.error("[alerts] telegram failed:", tg.reason?.message ?? tg.reason)
  if (dc.status === "rejected") console.error("[alerts] discord failed:", dc.reason?.message ?? dc.reason)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

async function sendTelegramAudit(alert: AuditAlert): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sev    = scoreSeverity(alert.score)
  const verdict = scoreVerdict(alert.score)
  const icon   = SEV_ICON[sev]

  const lines: string[] = []
  lines.push(`${icon} <b>ChainSentinel — New Audit</b>`)
  lines.push(`Score: <b>${alert.score}/100</b> · Verdict: <b>${verdict}</b>`)
  lines.push(`${alert.totalFindings} ${alert.totalFindings === 1 ? "issue" : "issues"} found`)
  lines.push("")

  const counts = alert.counts
  const breakdown: string[] = []
  if (counts.critical > 0) breakdown.push(`🔴 ${counts.critical} critical`)
  if (counts.high     > 0) breakdown.push(`🟠 ${counts.high} high`)
  if (counts.medium   > 0) breakdown.push(`🟡 ${counts.medium} medium`)
  if (counts.low      > 0) breakdown.push(`⚪ ${counts.low} low`)
  if (breakdown.length) {
    lines.push(breakdown.join(" · "))
    lines.push("")
  }

  if (alert.topFindings.length > 0) {
    lines.push("<b>Top findings:</b>")
    for (const f of alert.topFindings.slice(0, 3)) {
      const title = escapeHtml(f.title)
      lines.push(`${SEV_ICON[f.severity]} ${title}${f.line ? ` <i>(line ${f.line})</i>` : ""}`)
    }
    lines.push("")
  }

  if (alert.aiSummary) {
    const summary = escapeHtml(alert.aiSummary.slice(0, 300)) + (alert.aiSummary.length > 300 ? "..." : "")
    lines.push(`💬 <i>${summary}</i>`)
    lines.push("")
  }

  const links: string[] = [`🛡 <a href="${LIVE_URL}">Audit live</a>`]
  if (alert.txHash) links.push(`⛓ <a href="https://mantlescan.xyz/tx/${alert.txHash}">On-chain proof</a>`)
  lines.push(links.join(" · "))

  const bot = await getBot()
  if (!bot) return
  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  })
}

async function sendDiscordAudit(alert: AuditAlert): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) return

  const sev     = scoreSeverity(alert.score)
  const verdict = scoreVerdict(alert.score)
  const color   = SEV_COLOR[sev]

  const breakdown = [
    alert.counts.critical > 0 ? `🔴 ${alert.counts.critical} critical` : null,
    alert.counts.high     > 0 ? `🟠 ${alert.counts.high} high`         : null,
    alert.counts.medium   > 0 ? `🟡 ${alert.counts.medium} medium`     : null,
    alert.counts.low      > 0 ? `⚪ ${alert.counts.low} low`           : null,
  ].filter(Boolean).join(" · ")

  const topFindings = alert.topFindings.slice(0, 5).map(f => ({
    name: `${SEV_ICON[f.severity]} ${f.title}`.slice(0, 256),
    value: [
      f.line ? `line ${f.line}` : null,
      f.description ? f.description.slice(0, 300) : null,
    ].filter(Boolean).join("\n").slice(0, 1024) || "—",
    inline: false,
  }))

  const fields = [
    { name: "Score",   value: `**${alert.score}/100**`, inline: true },
    { name: "Verdict", value: `**${verdict}**`,         inline: true },
    { name: "Issues",  value: `**${alert.totalFindings}**`, inline: true },
    ...(breakdown ? [{ name: "Breakdown", value: breakdown, inline: false }] : []),
    ...topFindings,
  ]

  const payload = {
    username: "ChainSentinel",
    avatar_url: LOGO_URL,
    embeds: [{
      author: {
        name: "ChainSentinel · Solidity Audit Complete",
        url: LIVE_URL,
        icon_url: LOGO_URL,
      },
      title: `${SEV_ICON[sev]} Score ${alert.score}/100 — ${alert.totalFindings} ${alert.totalFindings === 1 ? "issue" : "issues"}`,
      url: LIVE_URL,
      description: alert.aiSummary
        ? `> ${alert.aiSummary.slice(0, 600)}${alert.aiSummary.length > 600 ? "..." : ""}`
        : `Audit completed by the ChainSentinel agent and recorded on Mantle.`,
      color,
      fields,
      footer: {
        text: alert.txHash
          ? `Recorded on Mantle · tx ${alert.txHash.slice(0, 10)}...${alert.txHash.slice(-6)}`
          : "ChainSentinel agent CSAI #1 · ERC-8004",
        icon_url: LOGO_URL,
      },
      timestamp: new Date().toISOString(),
    }],
  }

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

let _bot: { sendMessage: (chat: string, text: string, opts?: unknown) => Promise<unknown> } | null = null

async function getBot() {
  if (_bot) return _bot
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  // Use the raw Telegram HTTP API instead of node-telegram-bot-api
  // to avoid polling/server side-effects in Vercel serverless.
  _bot = {
    async sendMessage(chat_id: string, text: string, opts?: unknown) {
      const body = { chat_id, text, ...(opts as object) }
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`telegram: ${res.status} ${await res.text()}`)
      return res.json()
    },
  }
  return _bot
}
