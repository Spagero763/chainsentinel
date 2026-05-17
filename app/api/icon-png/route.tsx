import { ImageResponse } from "next/og"

export const runtime = "edge"
export const dynamic = "force-static"

// 512x512 — sweet spot for Telegram profile pic (min 512), Discord avatar,
// and webhook embed icons (Discord scales down automatically).
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
          backgroundImage:
            "radial-gradient(circle at center, rgba(0,212,170,0.08) 0%, transparent 60%)",
        }}
      >
        <svg width="380" height="380" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
            stroke="#00d4aa"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="6.5" stroke="#00d4aa" strokeWidth="0.8" opacity="0.4" />
          <circle cx="16" cy="16" r="2.5" fill="#00d4aa" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
