// scripts/deployMarket.ts
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import fs from "fs";

const RPC = process.env.RPC || "http://127.0.0.1:8545";
const PK = process.env.PK1 as string;

function loadArtifact(p: string) {
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function loadAddr(tag: string) {
  const file = "./deployments.local.json";
  const map = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!map[tag]) throw new Error(`Address ${tag} not found in ${file}`);
  return map[tag];
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
  const CARBON_ADDR = loadAddr("CARBON_ADDR");

  const art = loadArtifact("./artifacts/contracts/CarbonMarketplace.sol/CarbonMarketplace.json");
  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);

  const F = new ContractFactory(art.abi, art.bytecode, wallet);
  const m = await F.deploy(CARBON_ADDR);
  await m.waitForDeployment();
  const MARKET_ADDR = await m.getAddress();

  console.log("CarbonMarketplace:", MARKET_ADDR);
  saveAddr("MARKET_ADDR", MARKET_ADDR);
}
main().catch((e) => { console.error(e); process.exit(1); });
