// src/pages/regulator.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useWallet } from "@/blockchain/useWallet";
import { useIsRegulator } from "@/blockchain/useRegulator";
import { LOCAL_CHAIN_ID, CARBON_ADDR } from "@/blockchain/addresses";

import type { Proposal } from "@/blockchain/funding";
import { fetchProposals, approveProposal, rejectProposal } from "@/blockchain/funding";

import type { Claim } from "@/blockchain/regulator";
import { fetchClaims, approveClaim, rejectClaim } from "@/blockchain/regulator";

import carbonAbi from "@/abis/CarbonCredit1155.json";
import { Contract } from "ethers";

// helpers
function timeLeft(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff <= 0) return "ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h`;
}
const FALLBACK =
  "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=60";

const RegulatorPage: React.FC = () => {
  // ✅ make sure we use the LOCAL hardhat chain id (31337)
  const { provider, account, connect } = useWallet(BigInt(LOCAL_CHAIN_ID));
  const isReg = useIsRegulator();

  const [tab, setTab] = useState<"projects" | "claims">("projects");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // projects
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [poolCredits, setPoolCredits] = useState<Record<number, string>>({});
  const [rejReasonByProject, setRejReasonByProject] = useState<Record<number, string>>({});

  // claims
  const [claims, setClaims] = useState<Claim[]>([]);
  const [note, setNote] = useState<Record<number, string>>({});
  const [rej, setRej] = useState<Record<number, string>>({});

  async function loadAll() {
    setLoading(true);
    try {
      const [prs, cls] = await Promise.all([fetchProposals(), fetchClaims()]);
      setProposals(prs);
      setClaims(cls);
      setStatus(`Loaded ${prs.length} projects, ${cls.length} claims`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  // only proposals that are neither approved nor rejected
  const pendingProjects = useMemo(
    () => proposals.filter((p) => !p.approved && !p.rejected),
    [proposals]
  );
  // only waiting claims (status = 0)
  const pendingClaims = useMemo(
    () => claims.filter((c) => c.status === 0),
    [claims]
  );

  if (!isReg) {
    return (
      <>
        <Header />
        <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16">
          <div className="max-w-4xl mx-auto text-center text-[#B0B8D1]">
            Regulator access only.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16">
        <div className="max-w-7xl mx-auto">
          {/* top bar */}
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold">Regulator Console</h1>
            <div className="ml-4 flex gap-2">
              <Button
                variant={tab === "projects" ? "default" : "outline"}
                className={tab === "projects" ? "bg-[#0DF6A9] text-[#10182A]" : "text-[#0DF6A9] border-[#0DF6A9]"}
                onClick={() => setTab("projects")}
              >
                Projects
              </Button>
              <Button
                variant={tab === "claims" ? "default" : "outline"}
                className={tab === "claims" ? "bg-[#A259FF]" : "text-[#A259FF] border-[#A259FF]"}
                onClick={() => setTab("claims")}
              >
                Claims
              </Button>
            </div>
            <span className="ml-auto text-xs text-[#B0B8D1]">Status: {status || (loading ? "Loading…" : "—")}</span>
            <Button
              variant="outline"
              className="text-[#0DF6A9] border-[#0DF6A9] hover:bg-[#0DF6A9]/10"
              onClick={loadAll}
            >
              Refresh
            </Button>
          </div>

          {/* PROJECTS */}
          {tab === "projects" && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-3">Pending Approvals</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pendingProjects.map((p) => {
                    const img = /image:(https?:\/\/\S+)/i.exec(p.metadataURI || "")?.[1] || FALLBACK;
                    return (
                      <Card key={p.id} className="bg-[#181F36] rounded-2xl shadow-md border-0 overflow-hidden">
                        <img src={img} alt={p.title} className="w-full h-40 object-cover" />
                        <CardHeader>
                          <CardTitle className="text-lg">{p.title}</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="text-sm text-[#B0B8D1]">{p.metadataURI || "—"}</div>
                          <div className="text-xs text-[#B0B8D1]">
                            Goal: <b className="text-[#0DF6A9]">{Number(p.goalEth).toFixed(4)} ETH</b> ·
                            Raised: <b className="text-[#FFD600]">{Number(p.raisedEth).toFixed(4)} ETH</b> ·
                            Deadline: <b>{timeLeft(p.deadline)}</b>
                          </div>

                          {/* Approve: auto-create token + set credits pool */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="credits pool"
                                type="number"
                                value={poolCredits[p.id] || ""}
                                onChange={(e) => setPoolCredits((s) => ({ ...s, [p.id]: e.target.value }))}
                                className="bg-[#10182A] border-[#232B45] text-white w-36"
                              />
                              <Button
                                className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                                onClick={async () => {
                                  if (!account) await connect();
                                  if (!provider) { setStatus("No provider"); return; }
                                  const credits = Number(poolCredits[p.id] || 0);
                                  if (!credits) { setStatus("Enter credits"); return; }

                                  try {
                                    setStatus("Creating project token…");
                                    const signer = await provider.getSigner();
                                    const carbon = new Contract(CARBON_ADDR, (carbonAbi as any).abi, signer);

                                    const vintage = new Date().getFullYear();
                                    const cap = BigInt(credits);
                                    const uri = `${p.title} | auto:${p.id}`;

                                    // 1) Create ERC-1155 series
                                    const tx1 = await (carbon as any).createProject(vintage, cap, uri);
                                    const rc1 = await tx1.wait();

                                    // 2) Parse ProjectCreated(id)
                                    let tokenId: bigint | undefined;
                                    for (const log of rc1.logs) {
                                      try {
                                        const parsed = (carbon.interface as any).parseLog({
                                          topics: (log as any).topics,
                                          data: (log as any).data,
                                        });
                                        if (parsed?.name === "ProjectCreated") {
                                          tokenId = parsed.args.id as bigint;
                                          break;
                                        }
                                      } catch {}
                                    }
                                    if (!tokenId) { setStatus("Could not get tokenId"); return; }

                                    // 3) Approve proposal with tokenId + pool
                                    setStatus(`Approving with tokenId ${tokenId.toString()}…`);
                                    await approveProposal(p.id, Number(tokenId), credits);

                                    // optimistic update so card disappears immediately
                                    setProposals(prev =>
                                      prev.map(row =>
                                        row.id === p.id
                                          ? { ...row, approved: true, projectTokenId: Number(tokenId), assignedCredits: credits }
                                          : row
                                      )
                                    );

                                    setStatus("Approved");
                                    await loadAll();
                                  } catch (e: any) {
                                    setStatus(e?.shortMessage || e?.message || "Approve failed");
                                  }
                                }}
                              >
                                Approve (auto-create token)
                              </Button>
                            </div>
                            <div className="text-xs text-[#B0B8D1]">
                              A new carbon-credit series is created and linked. Credits auto-distribute to funders pro-rata when goal is reached.
                            </div>
                          </div>

                          {/* Reject */}
                          <div className="border-t border-[#232B45] pt-3">
                            <div className="text-xs text-[#B0B8D1] mb-1">Reject</div>
                            <div className="flex items-center gap-2">
                              <Textarea
                                placeholder="Reason for rejection"
                                value={rejReasonByProject[p.id] || ""}
                                onChange={(e) => setRejReasonByProject(s => ({ ...s, [p.id]: e.target.value }))}
                                className="bg-[#10182A] border-[#232B45] text-white flex-1"
                              />
                              <Button
                                variant="outline"
                                className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                                onClick={async () => {
                                  if (!account) await connect();
                                  const reason = (rejReasonByProject[p.id] || "not approved").trim();
                                  setStatus("Rejecting…");
                                  try {
                                    await rejectProposal(p.id, reason);
                                    // optimistic
                                    setProposals(prev =>
                                      prev.map(row => row.id === p.id ? { ...row, rejected: true } : row)
                                    );
                                    setStatus("Rejected");
                                    await loadAll();
                                  } catch (e: any) {
                                    setStatus(e?.shortMessage || e?.message || "Reject failed");
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!pendingProjects.length && (
                    <div className="text-[#B0B8D1] sm:col-span-2 lg:col-span-3">No pending projects.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* CLAIMS */}
          {tab === "claims" && (
            <div className="grid md:grid-cols-2 gap-6">
              {pendingClaims.map((c) => (
                <Card key={c.id} className="bg-[#181F36] rounded-2xl shadow-md border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Claim #{c.id} · tokenId {c.tokenId || "(new)"} · req {c.requested}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-[#B0B8D1]">
                      Requested: <b>{c.requested}</b> credit(s) · <span className="opacity-80">approval mints requested amount</span>
                    </div>

                    {/* Approve */}
                    <div className="border-t border-[#232B45] pt-3">
                      <div className="text-xs text-[#B0B8D1] mb-1">Approve</div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="approval note (optional)"
                          value={note[c.id] || ""}
                          onChange={(e) => setNote(s => ({ ...s, [c.id]: e.target.value }))}
                          className="bg-[#10182A] border-[#232B45] text-white flex-1"
                        />
                        <Button
                          className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                          onClick={async () => {
                            if (!account) await connect();
                            const req = Number(c.requested || 0);
                            if (!req) { setStatus("Requested amount is zero"); return; }
                            setStatus("Approving…");
                            try {
                              await approveClaim(c.id, c.claimant, req, note[c.id] || "approved");
                              setStatus("Approved");
                              await loadAll();
                            } catch (e: any) {
                              setStatus(e?.shortMessage || e?.message || "Approve failed");
                            }
                          }}
                        >
                          Approve & Mint {c.requested} credit(s)
                        </Button>
                      </div>
                    </div>

                    {/* Reject */}
                    <div className="border-t border-[#232B45] pt-3">
                      <div className="text-xs text-[#B0B8D1] mb-1">Reject</div>
                      <div className="flex items-center gap-2">
                        <Textarea
                          placeholder="Reason"
                          value={rej[c.id] || ""}
                          onChange={(e) => setRej(s => ({ ...s, [c.id]: e.target.value }))}
                          className="bg-[#10182A] border-[#232B45] text-white flex-1"
                        />
                        <Button
                          variant="outline"
                          className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                          onClick={async () => {
                            if (!account) await connect();
                            setStatus("Rejecting…");
                            try {
                              await rejectClaim(c.id, rej[c.id] || "insufficient evidence");
                              setStatus("Rejected");
                              await loadAll();
                            } catch (e: any) {
                              setStatus(e?.shortMessage || e?.message || "Reject failed");
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!pendingClaims.length && !loading && (
                <div className="text-[#B0B8D1] md:col-span-2">No pending claims 🎉</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RegulatorPage;
