import { ImageResponse } from "next/og"

export const runtime = "edge"
export const dynamic = "force-static"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" stroke="#00d4aa" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="6.5" stroke="#00d4aa" strokeWidth="1" opacity="0.4" />
          <circle cx="16" cy="16" r="2.5" fill="#00d4aa" />
        </svg>
      </div>
    ),
    { width: 256, height: 256 }
  )
}
