// scripts/deployLocal.ts
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import fs from "fs";

const RPC = process.env.RPC || "http://127.0.0.1:8545";
const PK = process.env.PK1 as string;

function loadArtifact(path: string) {
  if (!fs.existsSync(path)) throw new Error(`Artifact not found: ${path}. Run 'npx hardhat compile' first.`);
  return JSON.parse(fs.readFileSync(path, "utf8"));
}
function saveAddr(tag: string, addr: string) {
  const file = "./deployments.local.json";
  let data: Record<string, string> = {};
  if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8"));
  data[tag] = addr;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Saved ${tag} -> ${addr} to ${file}`);
}

async function main() {
  if (!PK) throw new Error("Set PK1 env var with a local-node private key.");
  const artifact = loadArtifact("./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json");

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();

  console.log("CarbonCredit1155:", addr);
  saveAddr("CARBON_ADDR", addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
