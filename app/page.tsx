"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { AnalysisResult } from "../lib/analyzer"
import { SAMPLE_CONTRACT } from "../lib/sample"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

type Severity = "critical" | "high" | "medium" | "low" | "info"
type FullResult = AnalysisResult & {
  aiSummary: string
  aiFindingsCount?: number
  txHash?: string | null
  skill?: string
}

const SEV_COLOR: Record<Severity, string> = {
  critical: "var(--critical)",
  high:     "var(--high)",
  medium:   "var(--medium)",
  low:      "var(--low)",
  info:     "var(--text-dim)",
}

const SEV_BG: Record<Severity, string> = {
  critical: "var(--critical-bg)",
  high:     "var(--high-bg)",
  medium:   "var(--medium-bg)",
  low:      "var(--low-bg)",
  info:     "transparent",
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), 'Fira Code', Consolas, monospace",
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--accent)" : score >= 50 ? "var(--high)" : "var(--critical)"
  const label = score >= 80 ? "Looks clean" : score >= 50 ? "Needs attention" : "Critical issues"
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 20px",
      borderBottom: "1px solid var(--border-dim)",
    }}>
      <div style={{
        width: 54,
        height: 54,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ ...MONO, fontSize: 17, fontWeight: 700, color }}>{score}</span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>
          Security Score
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  )
}

function FindingRow({ f }: { f: FullResult["findings"][number] }) {
  const [open, setOpen] = useState(false)
  const sev = f.severity as Severity
  const color = SEV_COLOR[sev]
  const bg = SEV_BG[sev]
  const isAI = f.id?.startsWith("AI-")

  return (
    <div style={{ borderBottom: "1px solid var(--border-dim)" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 20px",
          cursor: "pointer",
          background: open ? "var(--surface)" : "transparent",
          transition: "background 0.1s",
        }}
      >
        <span style={{
          ...MONO,
          fontSize: 10,
          fontWeight: 700,
          color,
          background: bg,
          border: `1px solid ${color}33`,
          padding: "2px 8px",
          borderRadius: 4,
          letterSpacing: "0.06em",
          flexShrink: 0,
          width: 72,
          textAlign: "center",
        }}>
          {f.severity.toUpperCase()}
        </span>
        <span style={{
          ...MONO,
          fontSize: 11,
          color: isAI ? "var(--accent)" : "var(--text-dim)",
          flexShrink: 0,
          width: 64,
          fontWeight: isAI ? 700 : 400,
        }}>
          {f.id}
        </span>
        <span style={{ fontSize: 13, color: "var(--text)", flex: 1, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 8 }}>
          {f.title}
          {isAI && (
            <span style={{
              ...MONO,
              fontSize: 9,
              fontWeight: 700,
              color: "var(--accent)",
              background: "rgba(0,212,170,0.08)",
              border: "1px solid rgba(0,212,170,0.2)",
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: "0.05em",
            }}>
              AI
            </span>
          )}
        </span>
        {f.line && (
          <span style={{ ...MONO, fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
            line {f.line}
          </span>
        )}
        <span style={{ color: "var(--text-dim)", fontSize: 15, flexShrink: 0, marginLeft: 4 }}>
          {open ? "−" : "+"}
        </span>
      </div>

      {open && (
        <div style={{ padding: "12px 20px 16px 166px", background: "var(--surface)" }}>
          {f.snippet && (
            <div style={{
              ...MONO,
              fontSize: 12,
              color: "var(--text-muted)",
              borderLeft: `2px solid ${color}`,
              paddingLeft: 12,
              marginBottom: 10,
              overflow: "auto",
              whiteSpace: "nowrap",
              lineHeight: 1.7,
            }}>
              {f.snippet}
            </div>
          )}
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 8 }}>
            {f.description}
          </p>
          <p style={{ ...MONO, fontSize: 12, color: "var(--accent)", lineHeight: 1.6 }}>
            → {f.suggestion}
          </p>
          {f.gasSaved && (
            <p style={{ ...MONO, fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
              est. gas saved: {f.gasSaved}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [source, setSource] = useState("")
  const [result, setResult] = useState<FullResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function run() {
    if (!source.trim() || loading) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "failed")
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error")
    } finally {
      setLoading(false)
    }
  }

  const findings = result?.findings ?? []
  const counts = {
    critical: findings.filter(f => f.severity === "critical").length,
    high:     findings.filter(f => f.severity === "high").length,
    medium:   findings.filter(f => f.severity === "medium").length,
    low:      findings.filter(f => f.severity === "low").length,
  }

  return (
    <div className="audit-split">

      {/* Left — editor */}
      <div className="audit-editor" style={{
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 40,
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
            <span style={{ ...MONO, fontSize: 12, color: "var(--text-muted)" }}>contract.sol</span>
            <span style={{
              ...MONO,
              fontSize: 10,
              fontWeight: 700,
              color: "#a78bfa",
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
              padding: "1px 7px",
              borderRadius: 3,
              letterSpacing: "0.05em",
            }}>
              Solidity
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSource(SAMPLE_CONTRACT)}
              style={{
                ...MONO,
                fontSize: 11,
                color: "var(--accent)",
                background: "transparent",
                border: "1px solid rgba(0,212,170,0.25)",
                borderRadius: 4,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              load example
            </button>
            <span style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
              {source ? `${source.split("\n").length} lines` : "empty"}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {!source && (
            <div style={{
              position: "absolute",
              top: 16,
              left: 68,
              zIndex: 5,
              pointerEvents: "none",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-dim)",
              userSelect: "none",
            }}>
              <div>{"// Paste your Solidity smart contract here"}</div>
              <div style={{ marginTop: 12 }}>{"// Supports: Solidity 0.4.x — 0.8.x"}</div>
              <div>{"// Checks:   37 gas + security rules · AI audit summary"}</div>
              <div style={{ marginTop: 12, opacity: 0.6 }}>{"pragma solidity ^0.8.0;"}</div>
              <div style={{ opacity: 0.6 }}>{"  "}</div>
              <div style={{ opacity: 0.6 }}>{"contract MyContract {"}</div>
              <div style={{ opacity: 0.6 }}>{"    // your code here"}</div>
              <div style={{ opacity: 0.6 }}>{"}"}</div>
            </div>
          )}
          <MonacoEditor
            height="100%"
            language="sol"
            theme="vs-dark"
            value={source}
            onChange={v => setSource(v ?? "")}
            options={{
              fontSize: 13,
              fontFamily: "'Geist Mono', 'Fira Code', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderLineHighlight: "line",
              padding: { top: 16, bottom: 16 },
              tabSize: 4,
              wordWrap: "on",
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 4,
            }}
          />
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 50,
          borderTop: "1px solid var(--border-dim)",
          flexShrink: 0,
          background: "var(--surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              ...MONO,
              fontSize: 10,
              color: "#a78bfa",
              background: "rgba(167,139,250,0.08)",
              border: "1px solid rgba(167,139,250,0.15)",
              padding: "2px 7px",
              borderRadius: 3,
            }}>
              .sol
            </span>
            <span style={{ ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
              {source ? `${source.split("\n").length} lines · ${(new Blob([source]).size / 1024).toFixed(1)} KB` : "Solidity only"}
            </span>
          </div>
          <button
            onClick={run}
            disabled={loading || !source.trim()}
            style={{
              ...MONO,
              background: loading || !source.trim() ? "transparent" : "var(--accent)",
              border: `1px solid ${loading || !source.trim() ? "var(--border)" : "var(--accent)"}`,
              color: loading || !source.trim() ? "var(--text-dim)" : "#09090b",
              borderRadius: 6,
              padding: "7px 20px",
              fontSize: 12,
              fontWeight: 700,
              cursor: loading || !source.trim() ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading ? "Analyzing..." : "Run Audit"}
          </button>
        </div>
      </div>

      {/* Right — results */}
      <div className="audit-results" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 40,
          borderBottom: "1px solid var(--border-dim)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Results</span>
          {result && (
            <div style={{ display: "flex", gap: 12 }}>
              {counts.critical > 0 && <span style={{ ...MONO, fontSize: 11, color: "var(--critical)" }}>{counts.critical} critical</span>}
              {counts.high > 0 && <span style={{ ...MONO, fontSize: 11, color: "var(--high)" }}>{counts.high} high</span>}
              {counts.medium > 0 && <span style={{ ...MONO, fontSize: 11, color: "var(--medium)" }}>{counts.medium} medium</span>}
              {counts.low > 0 && <span style={{ ...MONO, fontSize: 11, color: "var(--low)" }}>{counts.low} low</span>}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {!result && !loading && !error && (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 10 }}>
                Paste a Solidity contract and click Run Audit
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
                {["Solidity .sol", "37 rules", "Gas + Security", "AI Summary"].map(tag => (
                  <span key={tag} style={{
                    ...MONO,
                    fontSize: 10,
                    color: "var(--text-dim)",
                    background: "var(--surface)",
                    border: "1px solid var(--border-dim)",
                    padding: "2px 9px",
                    borderRadius: 3,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{
                display: "inline-block",
                padding: "16px 20px",
                background: "var(--surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: 8,
                maxWidth: 400,
              }}>
                <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 4 }}>
                  Get notified every time an audit runs
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  Live audit reports + Mantle anomaly alerts sent to both channels
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <a
                    href={process.env.NEXT_PUBLIC_TELEGRAM_INVITE || "https://t.me/ChainSentinelg"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...MONO,
                      fontSize: 11,
                      color: "var(--text)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      padding: "6px 14px",
                      borderRadius: 6,
                      textDecoration: "none",
                    }}
                  >
                    Join Telegram
                  </a>
                  <a
                    href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/vNCqr4VA"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...MONO,
                      fontSize: 11,
                      color: "var(--text)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      padding: "6px 14px",
                      borderRadius: 6,
                      textDecoration: "none",
                    }}
                  >
                    Join Discord
                  </a>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: "48px 24px" }}>
              {["Checking gas usage...", "Scanning for vulnerabilities...", "Generating AI summary..."].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ color: "var(--accent)", fontSize: 10 }}>●</span>
                  <span style={{ ...MONO, fontSize: 12, color: "var(--text-muted)" }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              margin: 16,
              padding: "12px 16px",
              background: "var(--critical-bg)",
              borderRadius: 6,
              border: "1px solid rgba(248,113,113,0.15)",
            }}>
              <span style={{ ...MONO, fontSize: 12, color: "var(--critical)" }}>{error}</span>
            </div>
          )}

          {result && (
            <div>
              <ScoreBadge score={result.score} />

              {result.txHash && (
                <div style={{
                  margin: "12px 20px 0",
                  padding: "10px 14px",
                  background: "rgba(0,212,170,0.05)",
                  border: "1px solid rgba(0,212,170,0.18)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "var(--accent)",
                      boxShadow: "0 0 5px var(--accent-glow)",
                    }} />
                    <span style={{ fontSize: 12, color: "var(--text)" }}>
                      Audit recorded on Mantle by ChainSentinel agent
                    </span>
                  </div>
                  <a
                    href={`https://mantlescan.xyz/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...MONO, fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
                  >
                    tx ↗
                  </a>
                </div>
              )}

              <div style={{ padding: "10px 20px 4px", ...MONO, fontSize: 11, color: "var(--text-dim)" }}>
                {result.summary.total} issue{result.summary.total !== 1 ? "s" : ""} found
                {(result.aiFindingsCount ?? 0) > 0 && (
                  <span style={{ color: "var(--accent)" }}>
                    {" · "}{result.aiFindingsCount} discovered by AI
                  </span>
                )}
              </div>

              {findings.map(f => <FindingRow key={f.id + (f.line ?? "")} f={f} />)}

              {result.aiSummary && (
                <div style={{
                  margin: 16,
                  padding: 16,
                  background: "var(--surface)",
                  borderRadius: 8,
                  border: "1px solid var(--border-dim)",
                }}>
                  <div style={{
                    ...MONO,
                    fontSize: 10,
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 10,
                  }}>
                    AI Summary
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {result.aiSummary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
