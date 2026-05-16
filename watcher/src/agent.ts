import { createWalletClient, http, keccak256, toBytes, parseAbi } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { mantle } from "./chain"

const AGENT_ADDRESS = "0xd933c28d0fc2283cca10f4361226c75f7ffeb39e" as const
const AGENT_TOKEN_ID = 1n

const ABI = parseAbi([
  "function recordExecution(uint256 tokenId, string skill, bool success, bytes32 dataHash)",
])

let _wallet: ReturnType<typeof createWalletClient> | null = null
function wallet() {
  if (_wallet) return _wallet
  const raw = process.env.PRIVATE_KEY
  if (!raw) return null
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`
  const account = privateKeyToAccount(pk)
  _wallet = createWalletClient({ account, chain: mantle, transport: http("https://rpc.mantle.xyz") })
  return _wallet
}

export async function recordExecution(skill: string, success: boolean, data: string) {
  const w = wallet()
  if (!w) return null
  try {
    const dataHash = keccak256(toBytes(data.slice(0, 4096)))
    const hash = await w.writeContract({
      address: AGENT_ADDRESS,
      abi: ABI,
      functionName: "recordExecution",
      args: [AGENT_TOKEN_ID, skill, success, dataHash],
      chain: mantle,
      account: w.account!,
    })
    return hash
  } catch (e) {
    console.error("[agent] recordExecution failed:", (e as Error).message)
    return null
  }
}
