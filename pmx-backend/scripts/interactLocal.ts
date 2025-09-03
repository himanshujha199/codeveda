// scripts/interactLocal.ts
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import { readFileSync } from "node:fs";

async function main() {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");

  const verifier = new Wallet(process.env.PK1!, provider);
  const seller   = new Wallet(process.env.PK2!, provider);
  const buyer    = new Wallet(process.env.PK3!, provider);

  const CARBON_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // load ABI
  const artifactPath = "./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json";
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const carbon = new Contract(CARBON_ADDR, artifact.abi, provider) as any;

  // sanity: code exists
  const code = await provider.getCode(CARBON_ADDR);
  if (code === "0x") throw new Error("No contract code at CARBON_ADDR. Restart node, redeploy, and update address.");

  console.log("Verifier:", verifier.address);
  console.log("Seller:  ", seller.address);
  console.log("Buyer:   ", buyer.address);

  // ---- NONCE TRACKING (robust) ----
  // start from each account's *pending* nonce and bump locally
  let vNonce = await provider.getTransactionCount(verifier.address, "pending");
  let sNonce = await provider.getTransactionCount(seller.address, "pending");

  // 1) Create project #1 (vintage=2024, cap=100)
  const tx1 = await carbon.connect(verifier).createProject(2024, 100n, "ipfs://demo", { nonce: vNonce++ });
  await tx1.wait();
  console.log("Project created (tokenId = 1)");

  // 2) Mint 40 credits to seller (verifier only)
  const tx2 = await carbon.connect(verifier).mint(seller.address, 1n, 40n, "0x", { nonce: vNonce++ });
  await tx2.wait();
  const balAfterMint = await carbon.balanceOf(seller.address, 1n);
  console.log("Seller balance after mint:", balAfterMint.toString()); // expect 40

  // 3) Seller retires 10 credits
  const tx3 = await carbon.connect(seller).retire(1n, 10n, { nonce: sNonce++ });
  await tx3.wait();
  const balAfterRetire = await carbon.balanceOf(seller.address, 1n);
  const proj = await carbon.projects(1n);
  console.log("Seller balance after retire:", balAfterRetire.toString()); // expect 30
  console.log("Total retired (contract state):", (proj.retired ?? proj[4]).toString()); // expect 10
}

main().catch(e => { console.error(e); process.exit(1); });
