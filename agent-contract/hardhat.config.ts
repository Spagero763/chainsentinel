import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-ethers"
import dotenv from "dotenv"

dotenv.config()

const pk = process.env.PRIVATE_KEY
  ? `0x${process.env.PRIVATE_KEY}`
  : "0x0000000000000000000000000000000000000000000000000000000000000001"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    mantle: {
      url: "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: [pk],
    },
  },
}

export default config
