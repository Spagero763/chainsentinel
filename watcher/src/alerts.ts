import TelegramBot from "node-telegram-bot-api"
import type { Anomaly } from "./detector"

const LIVE_URL = "https://chainsentinel-app.vercel.app"
const FEED_URL = `${LIVE_URL}/feed`
const AGENT_URL = "https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e"
const LOGO_URL = `${LIVE_URL}/logo.png`

let _bot: TelegramBot | null = null
function getBot() {
  if (!_bot) _bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })
  return _bot
}

const SEV_ICON: Record<string, string> = {
  critical: "🔴",
  high:     "🟠",
  medium:   "🟡",
}

const SEV_COLOR: Record<string, number> = {
  critical: 0xf87171,
  high:     0xfb923c,
  medium:   0x60a5fa,
}

function highestSeverity(anomalies: Anomaly[]): string {
  if (anomalies.some(a => a.severity === "critical")) return "critical"
  if (anomalies.some(a => a.severity === "high"))     return "high"
  return "medium"
}

function escapeMd(s: string): string {
  return s.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1")
}

export async function sendTelegram(
  blockNumber: bigint,
  anomalies: Anomaly[],
  aiSummary: string
): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId || anomalies.length === 0) return

  const sev = highestSeverity(anomalies)
  const icon = SEV_ICON[sev] ?? "⚪"

  const lines: string[] = []
  lines.push(`${icon} *ChainSentinel — Mantle Anomaly Detected*`)
  lines.push(`_Block ${blockNumber.toLocaleString()} · ${anomalies.length} ${anomalies.length === 1 ? "anomaly" : "anomalies"}_`)
  lines.push("")

  for (const a of anomalies.slice(0, 5)) {
    const aIcon = SEV_ICON[a.severity] ?? "⚪"
    lines.push(`${aIcon} *${a.title}*`)
    lines.push(`\`${a.detail}\``)
    if (a.explorerUrl) lines.push(`[mantlescan ↗](${a.explorerUrl})`)
    lines.push("")
  }

  if (anomalies.length > 5) lines.push(`_... and ${anomalies.length - 5} more_`)

  if (aiSummary) {
    lines.push("")
    lines.push(`💬 _${aiSummary.slice(0, 400)}${aiSummary.length > 400 ? "..." : ""}_`)
  }

  lines.push("")
  lines.push(`🛡 [Live Feed](${FEED_URL}) · 🤖 [Agent Identity](${AGENT_URL})`)

  await getBot().sendMessage(chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  })
}

export async function sendDiscord(
  blockNumber: bigint,
  anomalies: Anomaly[],
  aiSummary: string
): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook || anomalies.length === 0) return

  const sev = highestSeverity(anomalies)
  const color = SEV_COLOR[sev] ?? 0x71717a

  const fields = anomalies.slice(0, 8).map(a => ({
    name:  `${SEV_ICON[a.severity] ?? "⚪"} ${a.title}`,
    value: [
      a.detail,
      a.explorerUrl ? `[View on MantleScan ↗](${a.explorerUrl})` : "",
    ].filter(Boolean).join("\n"),
    inline: false,
  }))

  const payload = {
    username: "ChainSentinel",
    avatar_url: LOGO_URL,
    embeds: [{
      author: {
        name: "ChainSentinel · Mantle Mainnet",
        url: LIVE_URL,
        icon_url: LOGO_URL,
      },
      title: `${SEV_ICON[sev] ?? "⚪"} ${anomalies.length} ${anomalies.length === 1 ? "anomaly" : "anomalies"} detected — Block ${blockNumber.toLocaleString()}`,
      url: FEED_URL,
      description: aiSummary
        ? `> ${aiSummary.slice(0, 500)}${aiSummary.length > 500 ? "..." : ""}`
        : `${anomalies.length} on-chain ${anomalies.length === 1 ? "anomaly" : "anomalies"} detected by the ChainSentinel agent.`,
      color,
      fields,
      footer: {
        text: "ChainSentinel agent CSAI #1 · ERC-8004 · recorded on Mantle",
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
