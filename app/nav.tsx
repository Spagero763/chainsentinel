"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "Audit" },
  { href: "/feed", label: "Live Feed" },
]

export default function Nav() {
  const path = usePathname()

  return (
    <header style={{
      height: "var(--nav-h)",
      borderBottom: "1px solid var(--border-dim)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      background: "var(--bg)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/" style={{
          fontFamily: "var(--font-geist-mono)",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--accent)",
          textDecoration: "none",
          letterSpacing: "-0.01em",
        }}>
          chainsentinel
        </Link>

        <nav style={{ display: "flex", gap: 2 }}>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} style={{
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

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
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
