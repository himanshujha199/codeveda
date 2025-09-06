// src/blockchain/regulator.ts
import { BrowserProvider, Contract } from "ethers";
import claimsAbi from "@/abis/CarbonClaims.json";
import { CLAIMS_ADDR, LOCAL_CHAIN_ID } from "@/blockchain/addresses";

declare global { interface Window { ethereum?: any } }

function provider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new BrowserProvider(window.ethereum);
}
async function getSignerChecked() {
  const p = provider();
  const [acc] = await p.send("eth_requestAccounts", []);
  const net = await p.getNetwork();
  if (Number(net.chainId) !== LOCAL_CHAIN_ID) console.warn(`Connect to ${LOCAL_CHAIN_ID}`);
  return { signer: await p.getSigner(), account: acc as string, provider: p };
}
function contract(conn: any) {
  return new Contract(CLAIMS_ADDR, (claimsAbi as any).abi, conn);
}

export type Claim = {
  id: number;
  claimant: string;
  tokenId: number;       // 0 if new-project claim
  vintageYear: number;
  cap: string;
  metadataURI: string;
  requested: string;     // credits
  status: number;        // 0=pending,1=approved,2=rejected
  note: string;
};

export async function fetchClaims() {
  const p = provider();
  const c = contract(p);
  const next: bigint = await c.nextClaimId();
  const out: Claim[] = [];
  for (let i = 1n; i < next; i++) {
    const raw: any = await c.getClaim(i);
    out.push({
      id: Number(i),
      claimant: raw.claimant,
      tokenId: Number(raw.tokenId),
      vintageYear: Number(raw.vintageYear),
      cap: raw.cap?.toString?.() ?? "0",
      metadataURI: raw.metadataURI,
      requested: raw.requested?.toString?.() ?? "0",
      status: Number(raw.status),
      note: raw.note,
    });
  }
  out.sort((a, b) => b.id - a.id);
  return out;
}

export async function approveClaim(id: number, beneficiary: string, amount: number, note = "ok") {
  const { signer } = await getSignerChecked();
  const c = contract(signer);
  const tx = await c.approve(BigInt(id), beneficiary, BigInt(amount), note);
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function rejectClaim(id: number, reason: string) {
  const { signer } = await getSignerChecked();
  const c = contract(signer);
  const tx = await c.reject(BigInt(id), reason);
  const rc = await tx.wait();
  return rc?.hash as string;
}
