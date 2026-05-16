import { NextRequest, NextResponse } from "next/server"
import { analyze } from "../../../lib/analyzer"
import { explainFindings } from "../../../lib/ai"

export async function POST(req: NextRequest) {
  const { source } = await req.json()

  if (!source || typeof source !== "string") {
    return NextResponse.json({ error: "No source provided" }, { status: 400 })
  }

  if (source.length > 100_000) {
    return NextResponse.json({ error: "Contract too large (max 100KB)" }, { status: 400 })
  }

  const result = analyze(source)
  const aiSummary = await explainFindings(source, result)

  return NextResponse.json({ ...result, aiSummary })
}
