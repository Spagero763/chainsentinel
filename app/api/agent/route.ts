import { NextResponse } from "next/server"
import { getAgentInfo } from "../../../lib/agent"

export const revalidate = 15

export async function GET() {
  try {
    const info = await getAgentInfo()
    return NextResponse.json(info)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
