// scripts/deployLocal.ts
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import fs from "fs";

async function main() {
  const RPC = "http://127.0.0.1:8545";
  const PK = process.env.PK1;
  if (!PK) throw new Error("Set PK1 env var with a local-node private key.");

  // load compiled artifact (ABI + bytecode)
  const artifactPath = "./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json";
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact not found. Run 'npx hardhat compile' first.");
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log("Deployer:", wallet.address);
  console.log("CarbonCredit1155 address:", await contract.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
