import { JsonRpcProvider, Wallet, Contract } from "ethers";
import fs from "fs";

const RPC = process.env.RPC || "http://127.0.0.1:8545";
const PK  = process.env.PK1 as string;

function loadArtifact(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function loadAddr(tag: string) {
  const map = JSON.parse(fs.readFileSync("./deployments.local.json", "utf8"));
  return map[tag] as string;
}

async function main() {
  if (!PK) throw new Error("Set PK1 env var");
  const CLAIMS = loadAddr("CLAIMS_ADDR");

  const claimsArt = loadArtifact("./artifacts/contracts/CarbonClaims.sol/CarbonClaims.json");
  const provider  = new JsonRpcProvider(RPC);
  const wallet    = new Wallet(PK, provider);
  const claims    = new Contract(CLAIMS, claimsArt.abi, wallet);

  const id = 4n; // approve first claim for demo
  const c = await claims.getClaim(id);
  const beneficiary = c.claimant;         // mint to claimant
  const amount = c.requested;             // full requested amount
  const tx = await claims.approve(id, beneficiary, amount, "ok");
  console.log("Approving…", tx.hash);
  await tx.wait();
  console.log("Approved & minted");
}
main().catch((e)=>{ console.error(e); process.exit(1); });
