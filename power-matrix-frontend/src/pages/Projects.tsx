import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useWallet, shortAddr } from "@/blockchain/useWallet";
import { useIsRegulator } from "@/blockchain/useRegulator";

import type { Proposal } from "@/blockchain/funding";
import {
  fetchProposals,
  createProposal,
  fundProposal,
  withdrawOwner,
  refundContributor,
} from "@/blockchain/funding";

// ---- helpers ----
function timeLeft(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff <= 0) return "ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h`;
}
function pct(raisedEth: string, goalEth: string) {
  const r = Number(raisedEth || 0);
  const g = Number(goalEth || 0);
  if (!g) return 0;
  return Math.min(100, Math.floor((r / g) * 100));
}
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=60";

const Projects: React.FC = () => {
  const { account, connect, refreshBalances } = useWallet(1n);
  const isRegulator = useIsRegulator();

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [proposals, setProposals] = useState<Proposal[]>([]);

  // create form
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
    goalEth: "",
    duration: 7,
  });

  // per-card controls
  const [fundAmt, setFundAmt] = useState<Record<number, string>>({});

  // load proposals
  async function load() {
    setLoading(true);
    try {
      const rows = await fetchProposals();
      setProposals(rows);
      setStatus(`Loaded ${rows.length} proposal(s)`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // hide pending from non-regulators
  const visible = useMemo(
    () => (isRegulator ? proposals : proposals.filter((p) => p.approved)),
    [proposals, isRegulator]
  );

  // ---- actions ----
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!account) await connect();
    const { title, description, image, goalEth, duration } = form;
    if (!title || !goalEth || !duration) {
      setStatus("Fill all required fields");
      return;
    }
    const metadata = image
      ? `${description} | image:${image}`
      : description || "ipfs://meta";
    try {
      setStatus("Creating proposal…");
      await createProposal(title, metadata, goalEth, Number(duration));
      setForm({ title: "", description: "", image: "", goalEth: "", duration: 7 });
      setOpen(false);
      setStatus("Created");
      await load();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Create failed");
    }
  }

  async function onFund(p: Proposal) {
    if (!account) await connect();
    const amt = fundAmt[p.id] || "";
    if (!amt || Number(amt) <= 0) {
      setStatus("Enter ETH amount");
      return;
    }
    try {
      setStatus("Funding…");
      await fundProposal(p.id, amt);
      setStatus("Funded");
      setFundAmt((s) => ({ ...s, [p.id]: "" }));
      await load();
      await refreshBalances();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Fund failed");
    }
  }

  async function onWithdraw(p: Proposal) {
    try {
      setStatus("Withdrawing…");
      await withdrawOwner(p.id);
      setStatus("Withdrawn to owner");
      await load();
      await refreshBalances();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Withdraw failed");
    }
  }

  async function onRefund(p: Proposal) {
    try {
      setStatus("Refunding…");
      await refundContributor(p.id);
      setStatus("Refund sent");
      await load();
      await refreshBalances();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Refund failed");
    }
  }

  return (
    <>
      <Header />
      <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold">Support Social Impact Projects</h1>
            <span className="ml-auto text-xs text-[#B0B8D1]">
              Status: {status || (loading ? "Loading…" : "—")}
            </span>
            <Button
              variant="outline"
              className="text-[#0DF6A9] border-[#0DF6A9] hover:bg-[#0DF6A9]/10"
              onClick={load}
            >
              Refresh
            </Button>
          </div>

          {/* CREATE PROJECT (visible to everyone) */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="mb-8 bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90">
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#181F36] text-white border-0">
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <Input
                  placeholder="Project Title"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  required
                />
                <Textarea
                  placeholder="Description (optionally include 'image:https://...')"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                />
                <Input
                  placeholder="Image URL (optional)"
                  value={form.image}
                  onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Target in ETH"
                    type="number"
                    step="0.001"
                    value={form.goalEth}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, goalEth: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="Duration (days)"
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, duration: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
                {!account ? (
                  <Button
                    type="button"
                    onClick={connect}
                    className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                  >
                    Connect Wallet
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                  >
                    Request
                  </Button>
                )}
              </form>
            </DialogContent>
          </Dialog>

          {/* GRID */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visible.map((p) => {
              // attempt to parse an image from metadata
              const imgFromMeta =
                /image:(https?:\/\/\S+)/i.exec(p.metadataURI || "")?.[1];
              const img = imgFromMeta || FALLBACK_IMG;

              const progress = pct(p.raisedEth, p.goalEth);
              const ended = timeLeft(p.deadline) === "ended";
              const success = ended && Number(p.raisedEth) >= Number(p.goalEth);
              const failed = ended && Number(p.raisedEth) < Number(p.goalEth);
              const reached = Number(p.raisedEth) >= Number(p.goalEth);
              const isOwner =
                account?.toLowerCase() === p.owner.toLowerCase();
              const canFund = p.approved && !reached && !isOwner;

              return (
                <Card
                  key={p.id}
                  className="bg-[#181F36] rounded-2xl shadow-md border-0 overflow-hidden"
                >
                  <img src={img} alt={p.title} className="w-full h-40 object-cover" />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{p.title}</CardTitle>
                      <div className="ml-4 flex flex-col items-end">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#A259FF]/20">
                          <span className="text-xs text-[#B0B8D1]">Credits Pool:</span>
                          <b className="text-[#A259FF] text-base">{p.assignedCredits}</b>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-[#B0B8D1]">
                      {p.metadataURI || "—"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="text-sm mb-2 text-[#B0B8D1]">
                      Raised{" "}
                      <span className="text-[#FFD600] font-semibold">
                        {Number(p.raisedEth).toFixed(4)}
                      </span>{" "}
                      /{" "}
                      <span className="text-[#0DF6A9] font-semibold">
                        {Number(p.goalEth).toFixed(4)}
                      </span>{" "}
                      ETH
                    </div>
                    <Progress value={progress} />
                    <div className="mt-2 text-xs text-[#B0B8D1]">
                      Deadline: <b>{timeLeft(p.deadline)}</b>{" "}
                      {p.approved ? (
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#0DF6A9]/15 text-[#0DF6A9]">
                          Approved
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#FFD600]/15 text-[#FFD600]">
                          Pending
                        </span>
                      )}
                      {p.projectTokenId ? (
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#A259FF]/15 text-[#A259FF]">
                          tokenId: {p.projectTokenId}
                        </span>
                      ) : null}
                      {success ? (
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#0DF6A9]/15 text-[#0DF6A9]">
                          Successful
                        </span>
                      ) : failed ? (
                        <span className="ml-2 px-2 py-0.5 rounded bg-[#FF6B6B]/15 text-[#FF6B6B]">
                          Failed
                        </span>
                      ) : null}
                    </div>

                    {/* Fund action (approved & active; but NOT owner and NOT reached) */}
                    {canFund ? (
                      <div className="flex items-center gap-2 mt-3">
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="ETH amount"
                          value={fundAmt[p.id] || ""}
                          onChange={(e) =>
                            setFundAmt((s) => ({
                              ...s,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="bg-[#10182A] border-[#232B45] text-white"
                        />
                        <Button
                          onClick={() => onFund(p)}
                          className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                        >
                          Fund
                        </Button>
                      </div>
                    ) : (
                      p.approved && (
                        <div className="mt-3 text-xs text-[#B0B8D1]">
                          {reached
                            ? "Funding goal reached"
                            : isOwner
                            ? "Owner cannot fund"
                            : "Funding disabled"}
                        </div>
                      )
                    )}

                    {/* Owner withdraw / contributor refund */}
                    {ended && success && account?.toLowerCase() === p.owner.toLowerCase() && !p.withdrawn && (
                      <div className="mt-3">
                        <Button
                          onClick={() => onWithdraw(p)}
                          className="bg-[#A259FF] hover:bg-[#A259FF]/85"
                        >
                          Withdraw to Owner
                        </Button>
                      </div>
                    )}
                    {ended && failed && (
                      <div className="mt-3">
                        <Button
                          onClick={() => onRefund(p)}
                          className="bg-[#232B45] hover:bg-[#232B45]/80"
                        >
                          Claim Refund
                        </Button>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xs text-[#B0B8D1]">Owner: {shortAddr(p.owner)}</span>
                    <span className="text-xs text-[#B0B8D1]">ID: {p.id}</span>
                  </CardFooter>
                </Card>
              );
            })}

            {!visible.length && !loading && (
              <div className="text-[#B0B8D1] col-span-full text-center">
                {isRegulator
                  ? "No proposals yet."
                  : "No approved projects yet. Check back soon!"}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#B0B8D1] mt-10">
            Fund with ETH. If a project reaches its goal before the deadline, the owner can withdraw; credits are
            <b> auto-distributed pro-rata</b> to investors. Otherwise, contributors can refund after the deadline. (Regulator sets
            tokenId and credits pool during approval — see Regulator console.)
          </p>
        </div>
      </div>
    </>
  );
};

export default Projects;
