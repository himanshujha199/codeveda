// scripts/createProject.ts
import { JsonRpcProvider, Wallet, Contract } from "ethers";
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

async function main() {
  if (!PK) throw new Error("Set PK1 env var");
  const CARBON_ADDR = loadAddr("CARBON_ADDR");
  const carbonArt = loadArtifact("./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json");

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);
  const carbon = new Contract(CARBON_ADDR, carbonArt.abi, wallet);

  const tx = await carbon.createProject(2024, 100_000, "ipfs://demo");
  console.log("Creating project…", tx.hash);
  await tx.wait();
  console.log("Project created (on a fresh node this is tokenId=1).");
}
main().catch((e) => { console.error(e); process.exit(1); });
