"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "Audit" },
  { href: "/feed", label: "Live Feed" },
  { href: "/agent", label: "Agent" },
]

const TELEGRAM_INVITE = process.env.NEXT_PUBLIC_TELEGRAM_INVITE || "https://t.me/ChainSentinelg"
const DISCORD_INVITE  = process.env.NEXT_PUBLIC_DISCORD_INVITE  || "https://discord.gg/vNCqr4VA"

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export default function Nav() {
  const path = usePathname()

  return (
    <header style={{
      height: "var(--nav-h)",
      borderBottom: "1px solid var(--border-dim)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      gap: 12,
      background: "var(--bg)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "0 1 auto" }}>
        <Link href="/" style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-geist-mono)",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--accent)",
          textDecoration: "none",
          letterSpacing: "-0.01em",
        }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
            <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
          </svg>
          chainsentinel
        </Link>

        <nav style={{ display: "flex", gap: 2 }}>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-page-link" style={{
              fontSize: 13,
              color: path === href ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
              padding: "5px 12px",
              borderRadius: 6,
              background: path === href ? "var(--surface-2)" : "transparent",
              transition: "color 0.12s, background 0.12s",
            }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href={TELEGRAM_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          title="Join ChainSentinel on Telegram"
          aria-label="Join Telegram"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-muted)",
            textDecoration: "none",
            padding: "5px 9px",
            borderRadius: 6,
            border: "1px solid var(--border-dim)",
            background: "var(--surface)",
            fontSize: 11,
            transition: "color 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.3)" }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-dim)" }}
        >
          <TelegramIcon />
          <span className="nav-label" style={{ fontFamily: "var(--font-geist-mono)" }}>Telegram</span>
        </a>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          title="Join ChainSentinel on Discord"
          aria-label="Join Discord"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-muted)",
            textDecoration: "none",
            padding: "5px 9px",
            borderRadius: 6,
            border: "1px solid var(--border-dim)",
            background: "var(--surface)",
            fontSize: 11,
            transition: "color 0.12s, border-color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.3)" }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-dim)" }}
        >
          <DiscordIcon />
          <span className="nav-label" style={{ fontFamily: "var(--font-geist-mono)" }}>Discord</span>
        </a>

        <div className="nav-badge" style={{
          width: 1,
          height: 18,
          background: "var(--border-dim)",
          margin: "0 4px",
        }} />

        <span className="nav-badge" style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: 11,
          color: "var(--text-dim)",
          background: "var(--surface)",
          border: "1px solid var(--border-dim)",
          padding: "3px 10px",
          borderRadius: 4,
        }}>
          mantle mainnet
        </span>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--accent)",
          boxShadow: "0 0 8px var(--accent-glow)",
          display: "inline-block",
        }} />
      </div>
    </header>
  )
}
