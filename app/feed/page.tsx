"use client"

import { useState, useEffect, useCallback } from "react"
import type { FeedEvent } from "../api/feed/route"

const MONO: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'Fira Code', Consolas, monospace",
}

const SEV: Record<string, string> = {
  critical: "#ff4444",
  high:     "#ff8800",
  medium:   "#ffaa00",
}

const TYPE_LABEL: Record<string, string> = {
  WHALE:    "WHALE",
  LARGE:    "TRANSFER",
  DEPLOY:   "CONTRACT",
  GAS_SPIKE:"GAS",
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function shareText(e: FeedEvent): string {
  const icon = e.severity === "critical" ? "🔴" : e.severity === "high" ? "🟠" : "🟡"
  const base = `${icon} ${e.title} on Mantle — detected by ChainSentinel\n\n${e.explorerUrl}\n\n#Mantle #Web3 #OnChain`
  return encodeURIComponent(base)
}

interface AgentInfo {
  name: string
  type: string
  totalExecutions: string
  successfulExecutions: string
  reputationScore: string
  skills: string[]
}

interface FeedData {
  block: string
  events: FeedEvent[]
  agent: AgentInfo
}

function EventCard({ e, fresh }: { e: FeedEvent; fresh: boolean }) {
  const color = SEV[e.severity] ?? "#555"

  return (
    <div style={{
      borderLeft: `2px solid ${color}`,
      padding: "14px 16px",
      background: fresh ? `${color}0a` : "transparent",
      borderBottom: "1px solid #111",
      transition: "background 1.5s ease",
    }}>
      {/* Row 1: type badge + block + time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            ...MONO, fontSize: 10, fontWeight: 700, color,
            background: `${color}15`, border: `1px solid ${color}30`,
            padding: "2px 7px", borderRadius: 2, letterSpacing: "0.08em"
          }}>
            {TYPE_LABEL[e.type]}
          </span>
          <span style={{ ...MONO, fontSize: 11, color: "#333" }}>
            block {Number(e.block).toLocaleString()}
          </span>
        </div>
        <span style={{ ...MONO, fontSize: 11, color: "#2a2a2a" }}>
          {timeAgo(e.timestamp)}
        </span>
      </div>

      {/* Row 2: title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e4", marginBottom: 5, lineHeight: 1.3 }}>
        {e.title}
      </div>

      {/* Row 3: detail */}
      <div style={{ ...MONO, fontSize: 12, color: "#444", marginBottom: 12 }}>
        {e.detail}
      </div>

      {/* Row 4: links */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <a href={e.explorerUrl} target="_blank" rel="noopener noreferrer"
          style={{ ...MONO, fontSize: 11, color: "#333", textDecoration: "none" }}>
          mantlescan ↗
        </a>
        <span style={{ color: "#1a1a1a" }}>·</span>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText(e)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ ...MONO, fontSize: 11, color: "#00d4aa", textDecoration: "none" }}
        >
          𝕏 share
        </a>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [data, setData] = useState<FeedData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const [tick, setTick] = useState(0)

  const fetchFeed = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch("/api/feed")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setData(prev => {
        if (!prev || isFirst) {
          setFreshIds(new Set(json.events.slice(0, 5).map((e: FeedEvent) => e.id)))
          return json
        }
        const prevIds = new Set(prev.events.map(e => e.id))
        const newIds = json.events.filter((e: FeedEvent) => !prevIds.has(e.id)).map((e: FeedEvent) => e.id)
        if (newIds.length > 0) setFreshIds(new Set(newIds))
        return json
      })
      setError("")
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(true)
    const poll = setInterval(() => fetchFeed(), 8000)
    const clock = setInterval(() => setTick(t => t + 1), 30000)
    return () => { clearInterval(poll); clearInterval(clock) }
  }, [fetchFeed])

  // Clear fresh highlight after 4 seconds
  useEffect(() => {
    if (freshIds.size === 0) return
    const t = setTimeout(() => setFreshIds(new Set()), 4000)
    return () => clearTimeout(t)
  }, [freshIds])

  const pageUrl = typeof window !== "undefined" ? window.location.href : "https://chainsentinel.vercel.app/feed"
  const pageTweet = encodeURIComponent(`Watching Mantle on-chain activity live with ChainSentinel 👀\n\n${pageUrl}\n\n#Mantle #Web3`)

  return (
    <div style={{ ...MONO, minHeight: "100vh", background: "#0a0a0b", color: "#e4e4e4" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 40,
        borderBottom: "1px solid #1a1a1a",
        position: "sticky",
        top: 0,
        background: "#0a0a0b",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/" style={{ color: "#00d4aa", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            chainsentinel
          </a>
          <span style={{ color: "#222" }}>·</span>
          <span style={{ fontSize: 12, color: "#444" }}>mantle live feed</span>
          <a href="/" style={{ fontSize: 11, color: "#444", textDecoration: "none" }}>audit tool →</a>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {data && (
            <span style={{ fontSize: 11, color: "#333" }}>
              block {Number(data.block).toLocaleString()}
            </span>
          )}
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "#333" : "#00d4aa", display: "inline-block" }} />
          <a
            href={`https://twitter.com/intent/tweet?text=${pageTweet}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#00d4aa", textDecoration: "none", border: "1px solid #00d4aa22", padding: "3px 10px", borderRadius: 2 }}
          >
            𝕏 share page
          </a>
        </div>
      </div>

      {/* Agent identity bar */}
      {data?.agent && (
        <div style={{
          padding: "8px 16px",
          borderBottom: "1px solid #111",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 11,
          color: "#444",
        }}>
          <span style={{ color: "#00d4aa" }}>agent:{data.agent.name}#1</span>
          <span>rep:{data.agent.reputationScore}</span>
          <span>executions:{data.agent.totalExecutions}</span>
          <span>skills:{data.agent.skills.join(", ")}</span>
          <a
            href={`https://mantlescan.xyz/address/0xd933c28d0fc2283cca10f4361226c75f7ffeb39e`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#333", textDecoration: "none" }}
          >
            identity↗
          </a>
        </div>
      )}

      {/* Feed */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {error && (
          <div style={{ padding: 16, color: "#ff4444", fontSize: 12 }}>
            error: {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: "40px 16px", color: "#333", fontSize: 12 }}>
            scanning mantle mainnet...
          </div>
        )}

        {!loading && data?.events.length === 0 && (
          <div style={{ padding: "40px 16px", color: "#333", fontSize: 12 }}>
            no anomalies in recent blocks — chain is quiet
          </div>
        )}

        {data?.events.map(e => (
          <EventCard key={e.id} e={e} fresh={freshIds.has(e.id)} />
        ))}

        {data && (
          <div style={{ padding: "16px 16px 32px", fontSize: 11, color: "#222", textAlign: "center", ...MONO }}>
            scanning last 20 blocks · polling every 8s · {data.events.length} events · mantle mainnet
          </div>
        )}
      </div>
    </div>
  )
}
