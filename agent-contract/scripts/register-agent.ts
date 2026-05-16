import "dotenv/config"
import { createPublicClient, createWalletClient, http, parseAbi } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mantle } from "viem/chains"
import deployment from "../deployment.json"

const ABI = parseAbi([
  "function registerAgent(string agentName, string agentType, string[] skills) returns (uint256)",
  "function getSkills(uint256 tokenId) view returns (string[])",
  "function agents(uint256) view returns (string name, string agentType, address owner, uint256 mintedAt, uint256 totalExecutions, uint256 successfulExecutions, int256 reputationScore, bool active)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, string name)",
])

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)

const publicClient = createPublicClient({
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
})

const walletClient = createWalletClient({
  account,
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
})

async function main() {
  console.log(`registering ChainSentinel agent on Mantle mainnet...`)
  console.log(`contract: ${deployment.address}`)
  console.log(`owner:    ${account.address}\n`)

  const hash = await walletClient.writeContract({
    address: deployment.address as `0x${string}`,
    abi: ABI,
    functionName: "registerAgent",
    args: [
      "ChainSentinel",
      "analytics",
      ["gas-audit", "security-scan", "anomaly-detect", "smart-money-track", "ai-explain"],
    ],
  })

  console.log(`tx sent: ${hash}`)
  console.log(`waiting for confirmation...`)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`confirmed in block ${receipt.blockNumber}`)
  console.log(`mantlescan: https://mantlescan.xyz/tx/${hash}\n`)

  // Read back agent data
  const tokenId = 1n
  const agent = await publicClient.readContract({
    address: deployment.address as `0x${string}`,
    abi: ABI,
    functionName: "agents",
    args: [tokenId],
  }) as readonly [string, string, string, bigint, bigint, bigint, bigint, boolean]

  const skills = await publicClient.readContract({
    address: deployment.address as `0x${string}`,
    abi: ABI,
    functionName: "getSkills",
    args: [tokenId],
  }) as string[]

  console.log(`agent registered:`)
  console.log(`  token ID:   1`)
  console.log(`  name:       ${agent[0]}`)
  console.log(`  type:       ${agent[1]}`)
  console.log(`  skills:     ${skills.join(", ")}`)
  console.log(`  reputation: ${agent[6]}`)
}

main().catch(err => {
  console.error("error:", err.message)
  process.exit(1)
})
