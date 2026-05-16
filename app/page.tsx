"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { AnalysisResult } from "../lib/analyzer"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

type Severity = "critical" | "high" | "medium" | "low" | "info"
type FullResult = AnalysisResult & { aiSummary: string }

const SEV_COLOR: Record<Severity, string> = {
  critical: "#ff4444",
  high:     "#ff8800",
  medium:   "#4488ff",
  low:      "#555555",
  info:     "#333333",
}

const MONO: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'Fira Code', Consolas, monospace",
}

function FindingRow({ f }: { f: FullResult["findings"][number] }) {
  const [open, setOpen] = useState(false)
  const sev = f.severity as Severity
  const color = SEV_COLOR[sev]

  return (
    <div style={{ borderBottom: "1px solid var(--border-dim)" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          padding: "6px 16px",
          cursor: "pointer",
          background: open ? "var(--bg-hover)" : "transparent",
        }}
      >
        <span style={{ ...MONO, color, fontSize: 11, width: 60, flexShrink: 0 }}>
          {f.severity.toUpperCase()}
        </span>
        <span style={{ ...MONO, color: "#444", fontSize: 11, width: 72, flexShrink: 0 }}>
          {f.id}
        </span>
        <span style={{ color: "var(--text)", fontSize: 12, flex: 1 }}>
          {f.title}
        </span>
        {f.line && (
          <span style={{ ...MONO, color: "var(--text-muted)", fontSize: 11 }}>
            :{f.line}
          </span>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{open ? "−" : "+"}</span>
      </div>

      {open && (
        <div style={{ padding: "10px 16px 14px 160px", background: "var(--bg-hover)" }}>
          {f.snippet && (
            <div style={{
              ...MONO,
              fontSize: 12,
              color: "#444",
              borderLeft: `2px solid ${color}`,
              paddingLeft: 10,
              marginBottom: 8,
              overflow: "auto",
              whiteSpace: "nowrap",
            }}>
              {f.snippet}
            </div>
          )}
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7, marginBottom: 6 }}>
            {f.description}
          </p>
          <p style={{ ...MONO, fontSize: 11, color: "var(--accent)" }}>
            → {f.suggestion}
          </p>
          {f.gasSaved && (
            <p style={{ ...MONO, fontSize: 11, color: "#444", marginTop: 4 }}>
              gas saved: {f.gasSaved}
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
    info:     findings.filter(f => f.severity === "info").length,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* Top bar — pure text, no chrome */}
      <div style={{
        ...MONO,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 36,
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        fontSize: 12,
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>chainsentinel</span>
          <span style={{ color: "var(--text-muted)" }}>mantle / solidity-auditor</span>
          <a href="/feed" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 11 }}>live feed →</a>
        </div>
        <div style={{ display: "flex", gap: 16, color: "var(--text-muted)" }}>
          {result && (
            <>
              {counts.critical > 0 && <span style={{ color: SEV_COLOR.critical }}>{counts.critical}C</span>}
              {counts.high > 0 && <span style={{ color: SEV_COLOR.high }}>{counts.high}H</span>}
              {counts.medium > 0 && <span style={{ color: SEV_COLOR.medium }}>{counts.medium}M</span>}
              {counts.low > 0 && <span style={{ color: SEV_COLOR.low }}>{counts.low}L</span>}
              <span>score:{result.score}/100</span>
            </>
          )}
          <span style={{ color: "#1a1a1a" }}>|</span>
          <span>mantle:mainnet</span>
        </div>
      </div>

      {/* Two panels */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — editor */}
        <div style={{
          width: "52%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
        }}>
          {/* File tab */}
          <div style={{
            ...MONO,
            fontSize: 11,
            color: "var(--text-muted)",
            padding: "0 16px",
            height: 32,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--border-dim)",
            flexShrink: 0,
          }}>
            <span style={{ borderBottom: "1px solid var(--accent)", paddingBottom: 1, color: "var(--text)" }}>
              contract.sol
            </span>
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
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
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                wordWrap: "on",
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 4,
              }}
            />
          </div>

          {/* Status bar */}
          <div style={{
            ...MONO,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: 32,
            borderTop: "1px solid var(--border-dim)",
            flexShrink: 0,
            fontSize: 11,
            color: "var(--text-muted)",
          }}>
            <span>{source.split("\n").length}L · {new Blob([source]).size}B</span>
            <button
              onClick={run}
              disabled={loading || !source.trim()}
              style={{
                ...MONO,
                background: "none",
                border: `1px solid ${loading || !source.trim() ? "var(--border)" : "var(--accent)"}`,
                color: loading || !source.trim() ? "var(--text-muted)" : "var(--accent)",
                borderRadius: 2,
                padding: "3px 12px",
                fontSize: 11,
                cursor: loading || !source.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "running..." : "$ analyze"}
            </button>
          </div>
        </div>

        {/* Right — output */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Output header */}
          <div style={{
            ...MONO,
            fontSize: 11,
            color: "var(--text-muted)",
            padding: "0 16px",
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-dim)",
            flexShrink: 0,
          }}>
            <span>output</span>
            {result && <span style={{ color: result.score >= 80 ? "var(--accent)" : result.score >= 50 ? SEV_COLOR.high : SEV_COLOR.critical }}>
              score {result.score}/100
            </span>}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Empty state */}
            {!result && !loading && !error && (
              <div style={{
                ...MONO,
                padding: "24px 16px",
                color: "var(--text-dim)",
                fontSize: 12,
                lineHeight: 2,
              }}>
                <div style={{ color: "#222" }}>$ chainsentinel analyze ./contract.sol</div>
                <div style={{ color: "#1a1a1a", marginTop: 4 }}>waiting for input...</div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ ...MONO, padding: "24px 16px", color: "var(--text-muted)", fontSize: 12, lineHeight: 2 }}>
                <div>$ chainsentinel analyze ./contract.sol</div>
                <div style={{ color: "var(--accent)" }}>running gas checks...</div>
                <div style={{ color: "var(--accent)" }}>running security checks...</div>
                <div style={{ color: "var(--accent)" }}>querying groq llama-3.3-70b...</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ ...MONO, padding: "16px", color: SEV_COLOR.critical, fontSize: 12 }}>
                error: {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div>
                {/* Summary line */}
                <div style={{
                  ...MONO,
                  padding: "12px 16px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border-dim)",
                }}>
                  <span>found {result.summary.total} issue{result.summary.total !== 1 ? "s" : ""} — </span>
                  {counts.critical > 0 && <span style={{ color: SEV_COLOR.critical }}>{counts.critical} critical </span>}
                  {counts.high > 0 && <span style={{ color: SEV_COLOR.high }}>{counts.high} high </span>}
                  {counts.medium > 0 && <span style={{ color: SEV_COLOR.medium }}>{counts.medium} medium </span>}
                  {counts.low > 0 && <span style={{ color: SEV_COLOR.low }}>{counts.low} low </span>}
                </div>

                {/* Finding rows */}
                {findings.map(f => <FindingRow key={f.id + (f.line ?? "")} f={f} />)}

                {/* AI summary */}
                {result.aiSummary && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <div style={{
                      ...MONO,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      padding: "10px 16px 6px",
                    }}>
                      --- ai audit summary ---
                    </div>
                    <div style={{
                      ...MONO,
                      fontSize: 12,
                      color: "#666",
                      padding: "0 16px 20px",
                      lineHeight: 1.9,
                      whiteSpace: "pre-wrap",
                    }}>
                      {result.aiSummary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
