import { createPublicClient, http, defineChain } from "viem"

export const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "MantleScan", url: "https://mantlescan.xyz" },
  },
})

export const client = createPublicClient({
  chain: mantle,
  transport: http("https://rpc.mantle.xyz"),
})

export function explorerTx(hash: string) {
  return `https://mantlescan.xyz/tx/${hash}`
}

export function explorerAddress(addr: string) {
  return `https://mantlescan.xyz/address/${addr}`
}
