import TelegramBot from "node-telegram-bot-api"
import type { Anomaly } from "./detector"

let _bot: TelegramBot | null = null
function getBot() {
  if (!_bot) _bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })
  return _bot
}

const SEV_ICON: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
}

function formatAnomaly(a: Anomaly): string {
  const icon = SEV_ICON[a.severity] ?? "⚪"
  const lines = [
    `${icon} *${a.title}*`,
    `\`${a.detail}\``,
  ]
  if (a.explorerUrl) lines.push(`[View on MantleScan](${a.explorerUrl})`)
  return lines.join("\n")
}

export async function sendTelegram(
  blockNumber: bigint,
  anomalies: Anomaly[],
  aiSummary: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const header = `⛓ *ChainSentinel — Block ${blockNumber}*\n${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} detected on Mantle\n`
  const body = anomalies.map(formatAnomaly).join("\n\n")
  const footer = aiSummary ? `\n\n_${aiSummary}_` : ""

  const text = header + "\n" + body + footer

  await getBot().sendMessage(chatId, text, {
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
  if (!webhook) return

  const fields = anomalies.map(a => ({
    name: `${SEV_ICON[a.severity]} ${a.title}`,
    value: a.detail + (a.explorerUrl ? `\n[MantleScan](${a.explorerUrl})` : ""),
    inline: false,
  }))

  const payload = {
    embeds: [{
      title: `ChainSentinel — Block ${blockNumber}`,
      description: `${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} on Mantle Mainnet`,
      color: anomalies.some(a => a.severity === "critical") ? 0xff4444
           : anomalies.some(a => a.severity === "high")     ? 0xff8800
           : 0xffcc00,
      fields,
      footer: aiSummary ? { text: aiSummary } : undefined,
      timestamp: new Date().toISOString(),
    }],
  }

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
