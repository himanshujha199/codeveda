// src/blockchain/funding.ts
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import fundAbi from "@/abis/GreenFunding.json";
import carbonAbi from "@/abis/CarbonCredit1155.json";
import { FUNDING_ADDR, CARBON_ADDR, LOCAL_CHAIN_ID } from "@/blockchain/addresses";

declare global { interface Window { ethereum?: any } }

function provider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new BrowserProvider(window.ethereum);
}
export async function getSignerChecked() {
  const p = provider();
  const [acc] = await p.send("eth_requestAccounts", []);
  const net = await p.getNetwork();
  if (Number(net.chainId) !== LOCAL_CHAIN_ID) {
    console.warn(`Connect to ${LOCAL_CHAIN_ID} (Hardhat)`);
  }
  return { signer: await p.getSigner(), account: acc as string, provider: p };
}
export function contracts(conn: any) {
  const funding = new Contract(FUNDING_ADDR, (fundAbi as any).abi, conn);
  const carbon  = new Contract(CARBON_ADDR, (carbonAbi as any).abi, conn);
  return { funding, carbon };
}

export type Proposal = {
  id: number;
  owner: string;
  title: string;
  metadataURI: string;
  goalWei: string;
  goalEth: string;
  deadline: number;
  approved: boolean;
  rejected: boolean;        // 👈 NEW
  withdrawn: boolean;
  raisedWei: string;
  raisedEth: string;
  projectTokenId: number;
  distributed: boolean;
  assignedCredits: number;  // credits pool assigned at approval
};

export async function fetchProposals(): Promise<Proposal[]> {
  const p = provider();
  const { funding } = contracts(p);
  const next: bigint = await funding.nextId();
  const rows: Proposal[] = [];
  for (let i = 1n; i < next; i++) {
    const raw: any = await funding.proposals(i);
    if (!raw || Number(raw.id) === 0) continue;
    rows.push({
      id: Number(raw.id),
      owner: raw.owner,
      title: raw.title,
      metadataURI: raw.metadataURI,
      goalWei: raw.goal.toString(),
      goalEth: formatEther(raw.goal),
      deadline: Number(raw.deadline),
      approved: Boolean(raw.approved),
      rejected: Boolean(raw.rejected ?? false), // 👈 read flag
      withdrawn: Boolean(raw.withdrawn),
      raisedWei: raw.raised.toString(),
      raisedEth: formatEther(raw.raised),
      projectTokenId: Number(raw.projectTokenId),
      distributed: Boolean(raw.distributed),
      assignedCredits: Number(raw.assignedCredits ?? 0),
    });
  }
  rows.sort((a, b) => b.id - a.id);
  return rows;
}

export async function createProposal(title: string, metadataURI: string, goalEth: string, durationDays: number) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  const tx = await funding.create(title, metadataURI, parseEther(goalEth), BigInt(durationDays));
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function fundProposal(id: number, amountEth: string) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  // Contract should cap or revert if funding would exceed goal.
  const tx = await funding.fund(BigInt(id), { value: parseEther(amountEth) });
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function withdrawOwner(id: number) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  const tx = await funding.withdraw(BigInt(id));
  const rc = await tx.wait();
  return rc?.hash as string;
}

export async function refundContributor(id: number) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  const tx = await funding.refund(BigInt(id));
  const rc = await tx.wait();
  return rc?.hash as string;
}

/** Regulator approval with tokenId + credits pool */
export async function approveProposal(id: number, tokenId: number, credits: number) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  // Force exact fragment in case an older ABI lingers
  const fn = (funding as any)["approve(uint256,uint256,uint256)"] || (funding as any).approve;
  const tx = await fn(BigInt(id), BigInt(tokenId), BigInt(credits));
  const rc = await tx.wait();
  return rc?.hash as string;
}

/** 👇 NEW: Regulator rejection with reason */
export async function rejectProposal(id: number, reason: string) {
  const { signer } = await getSignerChecked();
  const { funding } = contracts(signer);
  // assumes GreenFunding has: function reject(uint256 id, string calldata reason) external onlyRegulator
  const fn = (funding as any)["reject(uint256,string)"] || (funding as any).reject;
  const tx = await fn(BigInt(id), reason);
  const rc = await tx.wait();
  return rc?.hash as string;
}
