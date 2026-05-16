import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChainSentinel — Mantle Smart Contract Auditor",
  description: "AI-powered gas optimization and security analysis for Solidity contracts on Mantle",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  )
}
