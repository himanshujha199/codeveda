// scripts/grantRoles.ts
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

async function ensureRole(carbon: Contract, who: string, label: string) {
  const role: string = await carbon.VERIFIER_ROLE();
  const has: boolean = await carbon.hasRole(role, who);
  if (!has) {
    const tx = await carbon.grantRole(role, who);
    console.log(`Granting VERIFIER_ROLE to ${label}…`, tx.hash);
    await tx.wait();
  }
  console.log(`${label} has role:`, await carbon.hasRole(role, who));
}

async function main() {
  if (!PK) throw new Error("Set PK1 env var with a local-node private key.");

  const CARBON_ADDR = loadAddr("CARBON_ADDR");
  const CLAIMS_ADDR = loadAddr("CLAIMS_ADDR");
  const FUNDING_ADDR = loadAddr("FUNDING_ADDR");

  const carbonArt = loadArtifact("./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json");

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);
  const carbon = new Contract(CARBON_ADDR, carbonArt.abi, wallet);

  await ensureRole(carbon, CLAIMS_ADDR, "Claims");
  await ensureRole(carbon, FUNDING_ADDR, "Funding");
}
main().catch((e) => { console.error(e); process.exit(1); });
