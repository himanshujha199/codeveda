// scripts/deployMarket.ts
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import { readFileSync } from "node:fs";

async function main() {
  const RPC = "http://127.0.0.1:8545";
  const PK = process.env.PK1; // use the same deployer key you used before
  if (!PK) throw new Error("Set PK1 env var to a local node private key.");

  // --- paste your existing Carbon contract address here ---
  const CARBON_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // load artifact for marketplace
  const art = JSON.parse(
    readFileSync("./artifacts/contracts/CarbonMarketplace.sol/CarbonMarketplace.json", "utf8")
  );

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PK, provider);

  const factory = new ContractFactory(art.abi, art.bytecode, wallet);
  const market = await factory.deploy(CARBON_ADDR);
  await market.waitForDeployment();

  console.log("Deployer:", wallet.address);
  console.log("Marketplace address:", await market.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
