"use client"

import { useEffect, useState } from "react"

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Fira Code', Consolas, monospace",
}

interface AgentInfo {
  name: string
  type: string
  owner: string
  mintedAt: number
  totalExecutions: string
  successfulExecutions: string
  reputationScore: string
  active: boolean
  skills: string[]
  successRate: string
  contractAddress: string
  tokenId: number
}

function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}` }

function formatDate(unix: number): string {
  if (!unix) return "—"
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric"
  })
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1,
      padding: "20px",
      background: "var(--surface)",
      border: "1px solid var(--border-dim)",
      borderRadius: 8,
    }}>
      <div style={{
        ...MONO,
        fontSize: 10,
        color: "var(--text-dim)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 12,
      }}>
        {label}
      </div>
      <div style={{
        ...MONO,
        fontSize: 28,
        fontWeight: 700,
        color: color ?? "var(--text)",
        lineHeight: 1,
        marginBottom: sub ? 6 : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ ...MONO, fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>
      )}
    </div>
  )
}

export default function AgentPage() {
  const [agent, setAgent] = useState<AgentInfo | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch("/api/agent", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "load failed")
        if (alive) setAgent(json)
      } catch (e) {
        if (alive) setError((e as Error).message)
      }
    }
    load()
    const i = setInterval(load, 15000)
    return () => { alive = false; clearInterval(i) }
  }, [])

  if (error) {
    return (
      <div style={{ padding: 40, color: "var(--critical)", ...MONO }}>
        {error}
      </div>
    )
  }

  if (!agent) {
    return (
      <div style={{ padding: 40, color: "var(--text-dim)", ...MONO, fontSize: 12 }}>
        Loading agent identity from Mantle...
      </div>
    )
  }

  const repNum = parseInt(agent.reputationScore)
  const repColor = repNum > 0 ? "var(--accent)" : repNum < 0 ? "var(--critical)" : "var(--text)"

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 80px" }}>

      {/* Hero card */}
      <div style={{
        padding: "28px",
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{
                ...MONO,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--accent)",
                background: "rgba(0,212,170,0.1)",
                border: "1px solid rgba(0,212,170,0.25)",
                padding: "3px 9px",
                borderRadius: 4,
                letterSpacing: "0.08em",
              }}>
                CSAI #{agent.tokenId}
              </span>
              <span style={{
                ...MONO,
                fontSize: 10,
                fontWeight: 700,
                color: agent.active ? "var(--accent)" : "var(--text-dim)",
                background: agent.active ? "rgba(0,212,170,0.1)" : "var(--surface-2)",
                border: `1px solid ${agent.active ? "rgba(0,212,170,0.25)" : "var(--border)"}`,
                padding: "3px 9px",
                borderRadius: 4,
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: agent.active ? "var(--accent)" : "var(--text-dim)",
                  boxShadow: agent.active ? "0 0 4px var(--accent)" : "none",
                }} />
                {agent.active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div style={{ fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 4 }}>
              {agent.name}
            </div>
            <div style={{ ...MONO, fontSize: 13, color: "var(--text-muted)" }}>
              {agent.type} agent · registered {formatDate(agent.mintedAt)}
            </div>
          </div>

          <a
            href={`https://mantlescan.xyz/address/${agent.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...MONO,
              fontSize: 11,
              color: "var(--text-muted)",
              textDecoration: "none",
              padding: "6px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--surface-2)",
            }}
          >
            verify on mantlescan ↗
          </a>
        </div>

        <div style={{ ...MONO, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 580 }}>
          Verified on-chain identity registered through the ERC-8004 standard on Mantle mainnet.
          Every audit and detection performed by this agent is permanently recorded on-chain — no off-chain claims, no fakes.
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard
          label="Reputation"
          value={repNum > 0 ? `+${repNum}` : `${repNum}`}
          color={repColor}
          sub="on-chain score"
        />
        <StatCard
          label="Executions"
          value={agent.totalExecutions}
          sub={`${agent.successfulExecutions} successful`}
        />
        <StatCard
          label="Success Rate"
          value={agent.totalExecutions === "0" ? "—" : `${agent.successRate}%`}
          color={agent.successRate === "0" ? "var(--text-dim)" : "var(--accent)"}
          sub="verified runs"
        />
      </div>

      {/* Skills */}
      <div style={{
        padding: "20px 24px",
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 8,
        marginBottom: 24,
      }}>
        <div style={{
          ...MONO,
          fontSize: 10,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 14,
        }}>
          Registered Skills
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {agent.skills.map(s => (
            <span key={s} style={{
              ...MONO,
              fontSize: 12,
              color: "var(--text)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              padding: "6px 12px",
              borderRadius: 6,
            }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* On-chain proof */}
      <div style={{
        padding: "20px 24px",
        background: "var(--surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: 8,
      }}>
        <div style={{
          ...MONO,
          fontSize: 10,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 16,
        }}>
          On-Chain Proof
        </div>

        {[
          { label: "Contract", value: agent.contractAddress, link: `https://mantlescan.xyz/address/${agent.contractAddress}` },
          { label: "Token ID", value: `#${agent.tokenId}` },
          { label: "Owner",    value: agent.owner, link: `https://mantlescan.xyz/address/${agent.owner}` },
          { label: "Standard", value: "ERC-8004 (Autonomous Agent Identity)" },
          { label: "Network",  value: "Mantle Mainnet · Chain ID 5000" },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--border-dim)",
          }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.label}</span>
            {row.link ? (
              <a
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...MONO, fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
              >
                {row.value.startsWith("0x") ? shortAddr(row.value) : row.value} ↗
              </a>
            ) : (
              <span style={{ ...MONO, fontSize: 12, color: "var(--text)" }}>{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
