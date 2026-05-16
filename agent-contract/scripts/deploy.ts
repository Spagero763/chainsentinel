import { ethers } from "hardhat"
import fs from "fs"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(`deploying AgentIdentity from ${deployer.address}`)
  console.log(`balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MNT\n`)

  const factory = await ethers.getContractFactory("AgentIdentity")
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log(`AgentIdentity deployed at: ${address}`)
  console.log(`https://explorer.sepolia.mantle.xyz/address/${address}\n`)

  // Save address for agent to use
  fs.writeFileSync("deployment.json", JSON.stringify({ address, deployer: deployer.address, network: "mantleSepolia" }, null, 2))
  console.log("saved to deployment.json")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
