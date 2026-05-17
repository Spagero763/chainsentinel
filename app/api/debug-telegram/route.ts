import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: "missing env", token: !!token, chatId: !!chatId })
  }

  const text = "🛡 <b>ChainSentinel debug ping</b>\nTesting HTML mode delivery."

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

  const body = await res.text()
  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    chatIdLength: chatId.length,
    chatIdStartsWithMinus100: chatId.startsWith("-100"),
    response: body.slice(0, 500),
  })
}
