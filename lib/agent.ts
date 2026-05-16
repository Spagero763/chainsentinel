import { createWalletClient, createPublicClient, http, defineChain, keccak256, toBytes, parseAbi } from "viem"
import { privateKeyToAccount } from "viem/accounts"

export const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mantle.xyz"] } },
})

export const AGENT_ADDRESS = "0xd933c28d0fc2283cca10f4361226c75f7ffeb39e" as const
export const AGENT_TOKEN_ID = 1n

export const AGENT_ABI = parseAbi([
  "function agents(uint256) view returns (string name, string agentType, address owner, uint256 mintedAt, uint256 totalExecutions, uint256 successfulExecutions, int256 reputationScore, bool active)",
  "function getSkills(uint256) view returns (string[])",
  "function successRate(uint256) view returns (uint256)",
  "function recordExecution(uint256 tokenId, string skill, bool success, bytes32 dataHash)",
])

export const publicClient = createPublicClient({
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
})

let _walletClient: ReturnType<typeof createWalletClient> | null = null
function getWalletClient() {
  if (_walletClient) return _walletClient
  const raw = process.env.AGENT_PRIVATE_KEY
  if (!raw) return null
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`
  const account = privateKeyToAccount(pk)
  _walletClient = createWalletClient({ account, chain: mantle, transport: http("https://rpc.mantle.xyz") })
  return _walletClient
}

export async function recordExecution(
  skill: string,
  success: boolean,
  payload: string,
): Promise<`0x${string}` | null> {
  const wallet = getWalletClient()
  if (!wallet) return null
  try {
    const dataHash = keccak256(toBytes(payload.slice(0, 4096)))
    const hash = await wallet.writeContract({
      address: AGENT_ADDRESS,
      abi: AGENT_ABI,
      functionName: "recordExecution",
      args: [AGENT_TOKEN_ID, skill, success, dataHash],
      chain: mantle,
      account: wallet.account!,
    })
    return hash
  } catch (e) {
    console.error("[agent] recordExecution failed:", (e as Error).message)
    return null
  }
}

export async function getAgentInfo() {
  const [raw, skills, rate] = await Promise.all([
    publicClient.readContract({
      address: AGENT_ADDRESS,
      abi: AGENT_ABI,
      functionName: "agents",
      args: [AGENT_TOKEN_ID],
    }),
    publicClient.readContract({
      address: AGENT_ADDRESS,
      abi: AGENT_ABI,
      functionName: "getSkills",
      args: [AGENT_TOKEN_ID],
    }),
    publicClient.readContract({
      address: AGENT_ADDRESS,
      abi: AGENT_ABI,
      functionName: "successRate",
      args: [AGENT_TOKEN_ID],
    }).catch(() => 0n),
  ])

  return {
    name: raw[0],
    type: raw[1],
    owner: raw[2],
    mintedAt: Number(raw[3]),
    totalExecutions: raw[4].toString(),
    successfulExecutions: raw[5].toString(),
    reputationScore: raw[6].toString(),
    active: raw[7],
    skills: skills as string[],
    successRate: rate.toString(),
    contractAddress: AGENT_ADDRESS,
    tokenId: Number(AGENT_TOKEN_ID),
  }
}
