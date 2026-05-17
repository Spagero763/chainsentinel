import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Nav from "./nav"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://chainsentinel-app.vercel.app"),
  title: {
    default: "ChainSentinel — Mantle smart contract auditor",
    template: "%s · ChainSentinel",
  },
  description:
    "Real-time on-chain intelligence for Mantle. Audit Solidity contracts with 37 security + gas rules and an AI auditor, watch Mantle mainnet anomalies live, and verify every audit on-chain through the ERC-8004 agent identity.",
  keywords: ["Mantle", "Solidity", "smart contract audit", "on-chain", "Web3", "ERC-8004"],
  authors: [{ name: "spagero763" }],
  openGraph: {
    type: "website",
    siteName: "ChainSentinel",
    title: "ChainSentinel — Mantle smart contract auditor",
    description:
      "Audit Solidity contracts with 37 rules + AI, watch Mantle mainnet live, every audit recorded on-chain.",
    url: "https://chainsentinel-app.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainSentinel — Mantle smart contract auditor",
    description:
      "Audit Solidity contracts with 37 rules + AI, watch Mantle mainnet live, every audit recorded on-chain.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  )
}
