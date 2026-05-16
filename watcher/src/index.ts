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

async function watch() {
  console.log("chainsentinel / track2-alpha-data")
  console.log("monitoring mantle mainnet for anomalies...\n")

  // Start from current block
  lastBlock = await client.getBlockNumber()
  console.log(`starting at block ${lastBlock}\n`)

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
