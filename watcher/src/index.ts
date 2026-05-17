import "dotenv/config"
import { client } from "./chain"
import { detectBlockAnomalies } from "./detector"
import { explainAnomalies } from "./ai"
import { sendTelegram, sendDiscord } from "./alerts"
import { recordExecution } from "./agent"

let lastBlock = 0n

async function processBlock(blockNumber: bigint) {
  process.stdout.write(`[block ${blockNumber}] scanning... `)

  const anomalies = await detectBlockAnomalies(blockNumber)

  if (anomalies.length === 0) {
    console.log("clean")
    return
  }

  console.log(`${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} found`)

  for (const a of anomalies) {
    console.log(`  [${a.severity.toUpperCase()}] ${a.type}: ${a.detail}`)
  }

  const aiSummary = await explainAnomalies(blockNumber, anomalies)
  if (aiSummary) console.log(`  AI: ${aiSummary}`)

  const [, , txHash] = await Promise.all([
    sendTelegram(blockNumber, anomalies, aiSummary),
    sendDiscord(blockNumber, anomalies, aiSummary),
    recordExecution(
      "anomaly-detect",
      true,
      JSON.stringify({ block: blockNumber.toString(), n: anomalies.length }),
    ),
  ])

  if (txHash) console.log(`  [chain] execution recorded: ${txHash}`)
}

const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  green: "\x1b[38;5;43m",
  gray:  "\x1b[38;5;240m",
  white: "\x1b[38;5;255m",
}

function banner() {
  const { reset: R, bold: B, dim: D, green: G, gray: GR, white: W } = C
  console.log("")
  console.log(`${G}      ⬡${R}   ${B}${W}ChainSentinel${R} ${D}${GR}· mantle on-chain watcher${R}`)
  console.log(`${D}${GR}  ─────────────────────────────────────────────────${R}`)
  console.log(`  ${D}${GR}live:${R}    ${G}https://chainsentinel-app.vercel.app${R}`)
  console.log(`  ${D}${GR}agent:${R}   ${G}CSAI #1${R} ${D}${GR}· 0xd933...f39e · ERC-8004${R}`)
  console.log(`  ${D}${GR}skills:${R}  ${GR}anomaly-detect · smart-money-track · ai-explain${R}`)
  console.log(`${D}${GR}  ─────────────────────────────────────────────────${R}`)
  console.log("")
}

async function watch() {
  banner()
  lastBlock = await client.getBlockNumber()
  console.log(`${C.dim}${C.gray}  watching from block${C.reset} ${C.green}${lastBlock}${C.reset}${C.dim}${C.gray} · polling every 3s${C.reset}\n`)

  // Poll every 3 seconds (Mantle block time ~2s)
  setInterval(async () => {
    try {
      const latest = await client.getBlockNumber()
      if (latest <= lastBlock) return

      // Process all new blocks since last check
      for (let b = lastBlock + 1n; b <= latest; b++) {
        await processBlock(b)
      }

      lastBlock = latest
    } catch (err) {
      console.error("poll error:", (err as Error).message)
    }
  }, 3000)
}

watch().catch(err => {
  console.error("fatal:", err.message)
  process.exit(1)
})
