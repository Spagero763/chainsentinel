import { NextResponse } from "next/server"
import { getAgentInfo } from "../../../lib/agent"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const info = await getAgentInfo()
    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
