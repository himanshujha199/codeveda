// scripts/marketFlow.ts
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
import { readFileSync } from "node:fs";

async function main() {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");

  const verifier = new Wallet(process.env.PK1!, provider);
  const seller   = new Wallet(process.env.PK2!, provider);
  const buyer    = new Wallet(process.env.PK3!, provider);

  // --- paste addresses ---
  const CARBON_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MARKET_ADDR = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  // code-exists checks
  const [codeC, codeM] = await Promise.all([
    provider.getCode(CARBON_ADDR),
    provider.getCode(MARKET_ADDR),
  ]);
  if (codeC === "0x") throw new Error("No code at Carbon addr");
  if (codeM === "0x") throw new Error("No code at Market addr");

  // load ABIs
  const carbonAbi = JSON.parse(readFileSync("./artifacts/contracts/CarbonCredit1155.sol/CarbonCredit1155.json","utf8")).abi;
  const marketAbi = JSON.parse(readFileSync("./artifacts/contracts/CarbonMarketplace.sol/CarbonMarketplace.json","utf8")).abi;

  const carbon = new Contract(CARBON_ADDR, carbonAbi, provider) as any;
  const market = new Contract(MARKET_ADDR, marketAbi, provider) as any;

  console.log("Verifier:", verifier.address);
  console.log("Seller:  ", seller.address);
  console.log("Buyer:   ", buyer.address);

  // track nonces (robust on HH node)
  let vNonce = await provider.getTransactionCount(verifier.address, "pending");
  let sNonce = await provider.getTransactionCount(seller.address, "pending");
  let bNonce = await provider.getTransactionCount(buyer.address,   "pending");

  const tokenId = 1n;

  // Seed credits if seller has zero
  let balSeller: bigint = await carbon.balanceOf(seller.address, tokenId);
  if (balSeller === 0n) {
    const tx1 = await carbon.connect(verifier).createProject(2024, 100n, "ipfs://demo", { nonce: vNonce++ });
    await tx1.wait();
    const tx2 = await carbon.connect(verifier).mint(seller.address, tokenId, 40n, "0x", { nonce: vNonce++ });
    await tx2.wait();
    balSeller = await carbon.balanceOf(seller.address, tokenId);
  }
  console.log("Seller balance before listing:", balSeller.toString());

  // Approve marketplace & list 20 credits for 0.1 ETH
  const approve = await carbon.connect(seller).setApprovalForAll(MARKET_ADDR, true, { nonce: sNonce++ });
  await approve.wait();

  const priceWei = parseEther("0.1");
  const listTx = await market.connect(seller).list(tokenId, 20n, priceWei, { nonce: sNonce++ });
  await listTx.wait();

  // listingId = nextListingId - 1
  const nextId: bigint = await market.nextListingId();
  const listingId = Number(nextId - 1n);
  console.log("Listed listingId:", listingId);

  // Buyer purchases
  const buyTx = await market.connect(buyer).buy(listingId, { value: priceWei, nonce: bNonce++ });
  await buyTx.wait();

  const balBuyer: bigint = await carbon.balanceOf(buyer.address, tokenId);
  const balSellerAfter: bigint = await carbon.balanceOf(seller.address, tokenId);
  console.log("Buyer balance after buy:", balBuyer.toString());       // expect 20
  console.log("Seller balance after buy:", balSellerAfter.toString()); // expect previous - 20

  // Buyer retires 5
  const retireTx = await carbon.connect(buyer).retire(tokenId, 5n, { nonce: bNonce++ });
  await retireTx.wait();
  const balBuyerAfterRetire: bigint = await carbon.balanceOf(buyer.address, tokenId);
  const proj: any = await carbon.projects(tokenId);
  const retired = (proj.retired ?? proj[4]) as bigint;

  console.log("Buyer balance after retire:", balBuyerAfterRetire.toString()); // expect 15
  console.log("Total retired:", retired.toString()); // >= 5 (plus any earlier retires)
}

main().catch(e => { console.error(e); process.exit(1); });
