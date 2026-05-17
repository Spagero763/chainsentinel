import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "ChainSentinel — Mantle smart contract auditor and live on-chain feed"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#f0f0f4",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(0,212,170,0.12) 0%, transparent 40%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" stroke="#00d4aa" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="6.5" stroke="#00d4aa" strokeWidth="1" opacity="0.35" />
            <circle cx="16" cy="16" r="2.5" fill="#00d4aa" />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#00d4aa", letterSpacing: "-0.02em" }}>
            chainsentinel
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#f0f0f4" }}>
            Real-time on-chain intelligence for Mantle
          </div>
          <div style={{ fontSize: 26, color: "#888896", lineHeight: 1.5 }}>
            Solidity audits + Mantle anomaly feed · 37 rules · AI summary · ERC-8004 agent
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, color: "#71717a", fontSize: 18 }}>
            <span style={{ background: "#1c1c24", border: "1px solid #2a2a35", padding: "8px 16px", borderRadius: 8 }}>Solidity .sol</span>
            <span style={{ background: "#1c1c24", border: "1px solid #2a2a35", padding: "8px 16px", borderRadius: 8 }}>Mantle mainnet</span>
            <span style={{ background: "#1c1c24", border: "1px solid #2a2a35", padding: "8px 16px", borderRadius: 8 }}>On-chain proof</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888896", fontSize: 18 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00d4aa", boxShadow: "0 0 12px #00d4aa" }} />
            <span>chainsentinel-app.vercel.app</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
