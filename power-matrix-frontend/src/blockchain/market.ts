// src/blockchain/market.ts
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import mAbi from "@/abis/CarbonMarketplace.json";
import cAbi from "@/abis/CarbonCredit1155.json";
import { MARKET_ADDR, CARBON_ADDR, LOCAL_CHAIN_ID } from "@/blockchain/addresses";

declare global { interface Window { ethereum?: any } }

function provider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new BrowserProvider(window.ethereum);
}

async function getSignerChecked() {
  const p = provider();
  const [acc] = await p.send("eth_requestAccounts", []);
  const net = await p.getNetwork();
  if (Number(net.chainId) !== LOCAL_CHAIN_ID) {
    console.warn(`Connect to chain ${LOCAL_CHAIN_ID} (Hardhat)`);
  }
  return { signer: await p.getSigner(), account: acc as string, provider: p };
}

function getContracts(conn: any) {
  const market = new Contract(MARKET_ADDR, (mAbi as any).abi, conn);
  const carbon = new Contract(CARBON_ADDR, (cAbi as any).abi, conn);
  return { market, carbon };
}

// ---------- READS ----------
export async function fetchListings(startId = 1, max = 200) {
  const p = provider();
  const { market } = getContracts(p);
  const arr = await market.activeListings(startId, max);
  return (arr as any[]).map((l) => ({
    id: Number(l.id),
    seller: l.seller as string,
    tokenId: Number(l.tokenId),
    amount: Number(l.amount),
    priceWei: l.priceWei.toString(),
    priceEth: formatEther(l.priceWei),
  }));
}

// optional helper
export async function myBalance(tokenId = 1) {
  const { provider, account } = await getSignerChecked();
  const { carbon } = getContracts(provider);
  const bal: bigint = await carbon.balanceOf(account, BigInt(tokenId));
  return Number(bal);
}

// ---------- WRITES ----------
export async function ensureApprovalForAll() {
  const { signer, account } = await getSignerChecked();
  const { carbon } = getContracts(signer);
  const approved = await carbon.isApprovedForAll(account, MARKET_ADDR);
  if (!approved) {
    const tx = await carbon.setApprovalForAll(MARKET_ADDR, true);
    await tx.wait();
  }
  return true;
}

// priceEthTotal must be TOTAL ETH for the whole bundle
export async function listCredits(tokenId: number, amount: number, priceEthTotal: string) {
  const { signer } = await getSignerChecked();
  const { market } = getContracts(signer);
  await ensureApprovalForAll();
  const tx = await market.list(BigInt(tokenId), BigInt(amount), parseEther(priceEthTotal));
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function buyListing(listingId: number, priceEthTotal: string) {
  const { signer } = await getSignerChecked();
  const { market } = getContracts(signer);
  const tx = await market.buy(BigInt(listingId), { value: parseEther(priceEthTotal) });
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function cancelListing(listingId: number) {
  const { signer } = await getSignerChecked();
  const { market } = getContracts(signer);
  const tx = await market.cancel(BigInt(listingId));
  const rc = await tx.wait();
  return rc?.hash as string;
}
