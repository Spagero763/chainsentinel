"use client"

import { useState, useEffect, useCallback } from "react"
import type { FeedEvent } from "../api/feed/route"
import type { SmartWallet } from "../api/smart-money/route"

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Fira Code', Consolas, monospace",
}

const TYPE_COLOR: Record<string, string> = {
  WHALE:    "var(--critical)",
  LARGE:    "var(--high)",
  DEPLOY:   "var(--medium)",
  GAS_SPIKE:"var(--accent)",
}

const TYPE_LABEL: Record<string, string> = {
  WHALE:    "WHALE",
  LARGE:    "TRANSFER",
  DEPLOY:   "CONTRACT",
  GAS_SPIKE:"GAS",
}

type Filter = "all" | "WHALE" | "LARGE" | "DEPLOY" | "GAS_SPIKE" | "SMART_MONEY"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "WHALE",      label: "Whale" },
  { key: "LARGE",      label: "Transfer" },
  { key: "DEPLOY",     label: "Contract" },
  { key: "GAS_SPIKE",  label: "Gas" },
  { key: "SMART_MONEY",label: "Smart Money" },
]

const BEHAVIOR_COLOR: Record<string, string> = {
  accumulating: "var(--accent)",
  distributing: "var(--high)",
  active:       "var(--medium)",
}

function shortAddr(a: string) { return `${a.slice(0, 6)}...${a.slice(-4)}` }

function SmartWalletCard({ w, rank }: { w: SmartWallet; rank: number }) {
  const color = BEHAVIOR_COLOR[w.behavior] ?? "var(--text-dim)"
  return (
    <div style={{
      borderBottom: "1px solid var(--border-dim)",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <span style={{ ...MONO, fontSize: 13, color: "var(--text-dim)", width: 22, flexShrink: 0 }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <a href={w.explorerUrl} target="_blank" rel="noopener noreferrer"
            style={{ ...MONO, fontSize: 13, color: "var(--text)", textDecoration: "none" }}>
            {shortAddr(w.address)} ↗
          </a>
          <span style={{
            ...MONO, fontSize: 10, fontWeight: 700, color,
            background: `${color}15`, border: `1px solid ${color}30`,
            padding: "2px 8px", borderRadius: 4, letterSpacing: "0.06em",
          }}>
            {w.behavior.toUpperCase()}
          </span>
        </div>
        <div style={{ ...MONO, fontSize: 12, color: "var(--text-muted)" }}>
          {Number(w.totalVolume).toLocaleString(undefined, { maximumFractionDigits: 0 })} MNT moved · {w.txCount} txs
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ ...MONO, fontSize: 13, fontWeight: 600, color, lineHeight: 1.2 }}>
          {Number(w.netFlow) >= 0 ? "+" : ""}{Number(w.netFlow).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: "var(--text-dim)" }}>net MNT</div>
      </div>
    </div>
  )
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function shareText(e: FeedEvent): string {
  const icon = e.severity === "critical" ? "🔴" : e.severity === "high" ? "🟠" : "🟡"
  return encodeURIComponent(`${icon} ${e.title} on Mantle — ChainSentinel\n\n${e.explorerUrl}\n\n#Mantle #Web3`)
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
  const color = TYPE_COLOR[e.type] ?? "var(--text-dim)"
  const label = TYPE_LABEL[e.type] ?? e.type

  return (
    <div style={{
      background: fresh ? `${color.replace("var(", "").replace(")", "")}08` : "transparent",
      borderBottom: "1px solid var(--border-dim)",
      padding: "18px 20px",
      transition: "background 2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            ...MONO,
            fontSize: 10,
            fontWeight: 700,
            color,
            background: `${color}15`.replace(/var\(([^)]+)\)15/, "var($1-bg)"),
            border: `1px solid ${color}30`,
            padding: "2px 9px",
            borderRadius: 4,
            letterSpacing: "0.07em",
          }}>
            {label}
          </span>
          <span style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
            block {Number(e.block).toLocaleString()}
          </span>
        </div>
        <span style={{ ...MONO, fontSize: 11, color: "var(--text-muted)" }}>
          {timeAgo(e.timestamp)}
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.4, wordBreak: "break-word" }}>
        {e.title}
      </div>

      <div style={{ ...MONO, fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5, wordBreak: "break-all" }}>
        {e.detail}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <a
          href={e.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...MONO, fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}
        >
          mantlescan ↗
        </a>
        <span style={{ color: "var(--border)" }}>·</span>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText(e)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...MONO, fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
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
  const [filter, setFilter] = useState<Filter>("all")
  const [, setTick] = useState(0)
  const [smartMoney, setSmartMoney] = useState<SmartWallet[] | null>(null)
  const [smLoading, setSmLoading] = useState(false)

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
        const newIds = json.events
          .filter((e: FeedEvent) => !prevIds.has(e.id))
          .map((e: FeedEvent) => e.id)
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

  useEffect(() => {
    if (freshIds.size === 0) return
    const t = setTimeout(() => setFreshIds(new Set()), 4000)
    return () => clearTimeout(t)
  }, [freshIds])

  // Fetch smart-money ranking when that tab is active (and refresh every 30s)
  useEffect(() => {
    if (filter !== "SMART_MONEY") return
    let alive = true
    const load = async () => {
      setSmLoading(smartMoney === null)
      try {
        const res = await fetch("/api/smart-money")
        const json = await res.json()
        if (alive && res.ok) setSmartMoney(json.wallets ?? [])
      } catch { /* keep last data */ }
      finally { if (alive) setSmLoading(false) }
    }
    load()
    const i = setInterval(load, 30000)
    return () => { alive = false; clearInterval(i) }
  }, [filter, smartMoney])

  const events = data?.events ?? []
  const filtered = filter === "all"
    ? events
    : filter === "SMART_MONEY"
      ? events
      : events.filter(e => e.type === filter)
  const showSmartMoney = filter === "SMART_MONEY"

  return (
    <div style={{ minHeight: "calc(100vh - var(--nav-h))", background: "var(--bg)" }}>

      {/* Filter bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        height: 48,
        borderBottom: "1px solid var(--border-dim)",
        position: "sticky",
        top: "var(--nav-h)",
        background: "var(--bg)",
        zIndex: 40,
        gap: 8,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: "1 1 auto", minWidth: 0 }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                ...MONO,
                fontSize: 12,
                color: filter === key ? "var(--text)" : "var(--text-muted)",
                background: filter === key ? "var(--surface-2)" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "5px 13px",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {data && (
            <span className="nav-badge" style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
              {filtered.length} events · block {Number(data.block).toLocaleString()}
            </span>
          )}
          <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: loading ? "var(--text-dim)" : "var(--accent)",
            boxShadow: loading ? "none" : "0 0 6px var(--accent-glow)",
            display: "inline-block",
          }} />
        </div>
      </div>

      {/* Feed list */}
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {error && (
          <div style={{ padding: "16px 20px", ...MONO, fontSize: 12, color: "var(--critical)" }}>
            {error}
          </div>
        )}

        {/* Smart Money view */}
        {showSmartMoney && (
          <>
            <div style={{ padding: "16px 20px 8px" }}>
              <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
                Smart money on Mantle
              </div>
              <div style={{ ...MONO, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                Wallets moving the most value in the last 20 blocks, ranked by volume and classified by net flow.
              </div>
            </div>

            {smLoading && (
              <div style={{ padding: "40px 20px", textAlign: "center", ...MONO, fontSize: 12, color: "var(--text-dim)" }}>
                Ranking active wallets...
              </div>
            )}

            {!smLoading && smartMoney && smartMoney.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 14, color: "var(--text-dim)" }}>
                No large wallet movements in recent blocks
              </div>
            )}

            {!smLoading && smartMoney && smartMoney.map((w, i) => (
              <SmartWalletCard key={w.address} w={w} rank={i + 1} />
            ))}

            {!smLoading && smartMoney && smartMoney.length > 0 && (
              <div style={{ padding: "24px 20px 8px", textAlign: "center" }}>
                <span style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
                  last 20 blocks · updates every 30s · accumulating = net inflow, distributing = net outflow
                </span>
              </div>
            )}
          </>
        )}

        {/* Anomaly feed view */}
        {!showSmartMoney && loading && (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ ...MONO, fontSize: 12, color: "var(--text-dim)" }}>
              Scanning Mantle mainnet...
            </div>
          </div>
        )}

        {!showSmartMoney && !loading && filtered.length === 0 && (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "var(--text-dim)" }}>
              {filter === "all"
                ? "No activity in recent blocks"
                : `No ${FILTERS.find(f => f.key === filter)?.label} events recently`}
            </div>
          </div>
        )}

        {!showSmartMoney && filtered.map(e => (
          <EventCard key={e.id} e={e} fresh={freshIds.has(e.id)} />
        ))}

        {!showSmartMoney && !loading && filtered.length > 0 && (
          <div style={{ padding: "24px 20px 8px", textAlign: "center" }}>
            <span style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
              last 20 blocks · updates every 8s
            </span>
          </div>
        )}

        {!loading && (
          <div style={{ padding: "12px 20px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              Get these alerts pushed to you
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <a
                href={process.env.NEXT_PUBLIC_TELEGRAM_INVITE || "https://t.me/ChainSentinelg"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...MONO,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  padding: "5px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Telegram
              </a>
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/vNCqr4VA"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...MONO,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  background: "var(--surface)",
                  border: "1px solid var(--border-dim)",
                  padding: "5px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Discord
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
