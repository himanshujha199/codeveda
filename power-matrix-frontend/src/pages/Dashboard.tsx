import React, { useEffect, useMemo, useState } from "react";
import {
  FaBolt, FaLeaf, FaWallet, FaTrophy, FaCalendarAlt,
  FaCloud, FaSyncAlt, FaArrowRight
} from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";

// --- 🔗 chain wiring ---
import { BrowserProvider, Contract, keccak256, toUtf8Bytes } from "ethers";
import carbonAbi from "@/abis/CarbonCredit1155.json";
import claimsAbi from "@/abis/CarbonClaims.json";
import { CARBON_ADDR, CLAIMS_ADDR, LOCAL_CHAIN_ID } from "@/blockchain/addresses";

type CarbonC = Contract & {
  retire(id: bigint, amount: bigint): Promise<any>;
  projects(id: bigint): Promise<[bigint, bigint, string, boolean, bigint]>;
  balanceOf(owner: string, id: bigint): Promise<bigint>;
};

type ClaimsC = Contract & {
  submitExisting(id: bigint, requested: bigint, evidenceHash: string): Promise<any>;
};

declare global {
  interface Window { ethereum?: any; }
}

const tabs = ["Daily", "Weekly", "Monthly", "Yearly"] as const;
type Tab = (typeof tabs)[number];

// === Simple mock for energy data (replace with your IoT later) ===
const GRID_EF_KG_PER_KWH = 0.6; // demo factor for CO₂ estimate
function mockEnergy(tab: Tab) {
  // light, deterministic-ish ranges per tab
  const base =
    tab === "Daily" ? 180 + Math.floor(Math.random() * 40) :
    tab === "Weekly" ? 1200 + Math.floor(Math.random() * 400) :
    tab === "Monthly" ? 5200 + Math.floor(Math.random() * 1500) :
    60000 + Math.floor(Math.random() * 12000);
  const deltaPct = (Math.random() * 18 - 4).toFixed(0); // -4% .. +14%
  const claimable = Math.max(0, Math.floor(base * 0.6)); // 60% demo claimable
  const co2kg = Math.round(base * GRID_EF_KG_PER_KWH);
  return { kwh: base, deltaPct, claimable, co2kg };
}

// === Small helpers ===
const DEFAULT_PROJECT_ID = 1n; // show project #1 on the dashboard
const hasMM = typeof window !== "undefined" && !!window.ethereum;

function getProvider(): BrowserProvider {
  if (!hasMM) throw new Error("MetaMask not found");
  return new BrowserProvider(window.ethereum);
}
async function ensureLocalChain(provider: BrowserProvider) {
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== LOCAL_CHAIN_ID) {
    // gentle hint; we keep UI intact
    console.warn(`Connect to chain ${LOCAL_CHAIN_ID} (Hardhat)`);
  }
}
function fmt(n: number | string) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Daily");

  // wallet / chain
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  // project & balances
  const [pmgtBalance, setPmgtBalance] = useState<number>(0);
  const [projectRetired, setProjectRetired] = useState<number>(0);

  // energy mock for the active tab
  const [energy, setEnergy] = useState(() => mockEnergy("Daily"));

  // inputs
  const [claimKwh, setClaimKwh] = useState<number>(10);
  const [retireAmt, setRetireAmt] = useState<number>(1);

  // status line
  const [status, setStatus] = useState<string>("");

  // contracts (lazy)
  const carbon = useMemo<CarbonC | null>(
    () =>
      provider
        ? (new Contract(CARBON_ADDR, (carbonAbi as any).abi, provider) as unknown as CarbonC)
        : null,
    [provider]
  );

  const claims = useMemo<ClaimsC | null>(
    () =>
      provider
        ? (new Contract(CLAIMS_ADDR, (claimsAbi as any).abi, provider) as unknown as ClaimsC)
        : null,
    [provider]
  );


  // boot: pick provider if MM is present and capture current account (no popup)
  useEffect(() => {
    if (!hasMM) return;
    const p = getProvider();
    setProvider(p);
    (async () => {
      try {
        await ensureLocalChain(p);
        const accs: string[] = await p.send("eth_accounts", []);
        if (accs[0]) setAccount(accs[0]);
      } catch (e) {
        console.warn(e);
      }
    })();

    const onAcc = (arr: string[]) => setAccount(arr?.[0] ?? null);
    const onChain = () => setTimeout(handleRefresh, 300);
    window.ethereum.on?.("accountsChanged", onAcc);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAcc);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // whenever tab changes, refresh mock
  useEffect(() => setEnergy(mockEnergy(activeTab)), [activeTab]);

  async function connectWallet() {
    if (!provider) return;
    const accs: string[] = await provider.send("eth_requestAccounts", []);
    setAccount(accs[0] ?? null);
    await ensureLocalChain(provider);
    await handleRefresh();
  }

  async function handleRefresh() {
    if (!provider || !account || !carbon) {
      setStatus("Connect wallet to load balances");
      return;
    }
    try {
      const bal: bigint = await carbon.balanceOf(account, DEFAULT_PROJECT_ID);
      setPmgtBalance(Number(bal));
      const proj = await carbon.projects(DEFAULT_PROJECT_ID);
      // proj = (vintage, cap, uri, active, retired)
      setProjectRetired(Number(proj?.[4] ?? 0n));
      setStatus("Refreshed");
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Read failed");
    }
  }

  async function handleClaim() {
    if (!provider || !account || !claims) {
      setStatus("Connect wallet first");
      await connectWallet();
      return;
    }
    // convert kWh → credits (simple: kWh * EF / 1000)
    const estimateCredits = Math.floor((claimKwh * GRID_EF_KG_PER_KWH) / 1000);
    if (estimateCredits <= 0) {
      setStatus("Claim too small for a whole credit");
      return;
    }
    try {
      const signer = await provider.getSigner();
      const evidence = {
        tab: activeTab,
        kwh: claimKwh,
        gridEF: GRID_EF_KG_PER_KWH,
        ts: Date.now(),
        note: "demo evidence bundle",
      };
      const evHash = keccak256(toUtf8Bytes(JSON.stringify(evidence)));
      setStatus("Submitting claim…");
      const claimsW = (claims!.connect(signer) as ClaimsC);
      const tx = await claimsW.submitExisting(
        DEFAULT_PROJECT_ID,
        BigInt(estimateCredits),
        evHash
      );
      await tx.wait();
      setStatus(`Claim submitted for ~${estimateCredits} credits (await regulator approval)`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Claim failed");
    }
  }

  async function handleRetire() {
    if (!provider || !account || !carbon) {
      setStatus("Connect wallet first");
      await connectWallet();
      return;
    }
    if (retireAmt <= 0 || retireAmt > pmgtBalance) {
      setStatus("Invalid retire amount");
      return;
    }
    try {
      const signer = await provider.getSigner();
      setStatus("Retiring…");
      const carbonW = (carbon!.connect(signer) as CarbonC);
      const tx = await carbonW.retire(DEFAULT_PROJECT_ID, BigInt(retireAmt));
      await tx.wait();
      setStatus("Retired successfully");
      await handleRefresh();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Retire failed");
    }
  }

  return (
    <div className="bg-[#10182A] min-h-screen text-white font-inter p-8">
      <Header />

      <div className="mt-10">
        <h1 className="text-4xl font-bold text-[#4F8CFF] m-0">
          Your <span className="text-[#A259FF]">Dashboard</span>
        </h1>
        <p className="text-[#B0B8D1] mt-2 mb-8 text-lg">
          Welcome back! Here's your sustainable energy portfolio at a glance.
        </p>

        {/* tiny status + connect */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[#B0B8D1]">Status: {status || "—"}</span>
          {!account && hasMM && (
            <button
              onClick={connectWallet}
              className="rounded-lg px-3 py-1 text-sm bg-[#0DF6A9] text-[#10182A] font-semibold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-6 py-2 font-semibold text-base transition-all
              ${
                activeTab === tab
                  ? "bg-[#0DF6A9] text-[#10182A]"
                  : "bg-transparent text-[#0DF6A9] hover:bg-[#0DF6A9]/10"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top Stats */}
      <div className="flex gap-6 mb-8 flex-wrap">
        {/* Energy Generated */}
        <Card className="bg-[#181F36] rounded-2xl flex-1 min-w-[220px] shadow-md flex flex-col justify-center border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaBolt color="#0DF6A9" size={22} />
            <span className="font-semibold text-lg">Energy Generated</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-[#0DF6A9]">{fmt(energy.kwh)} kWh</div>
            <div className="text-[#6EE7B7] text-sm mt-2">{energy.deltaPct}% from last period</div>
          </CardContent>
        </Card>

        {/* Carbon Offset */}
        <Card className="bg-[#181F36] rounded-2xl flex-1 min-w-[220px] shadow-md flex flex-col justify-center border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaLeaf color="#A259FF" size={22} />
            <span className="font-semibold text-lg">Carbon Offset</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-[#A259FF]">{fmt(energy.co2kg)} kg</div>
            <div className="text-[#B0B8D1] text-sm mt-2">CO₂ equivalent</div>
          </CardContent>
        </Card>

        {/* Claimable Energy → Claim credits */}
        <Card className="bg-[#181F36] rounded-2xl flex-1 min-w-[260px] shadow-md flex flex-col justify-center border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaBolt color="#0DF6A9" size={22} />
            <span className="font-semibold text-lg">Claimable Energy</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-[#0DF6A9]">{fmt(energy.claimable)} kWh</div>
            <div className="text-[#6EE7B7] text-sm mt-2 flex items-center gap-2">
              kWh
              <input
                type="number"
                min={1}
                max={energy.claimable}
                value={claimKwh}
                onChange={(e) => setClaimKwh(Number(e.target.value))}
                className="bg-[#10182A] border border-[#0DF6A9] rounded-lg px-2 py-1 text-white w-20 focus:outline-none focus:ring-2 focus:ring-[#0DF6A9]"
              />
              <button
                onClick={handleClaim}
                className="bg-[#0DF6A9] text-[#10182A] rounded-lg px-4 py-1 font-semibold text-sm hover:bg-[#0DF6A9]/80 transition disabled:opacity-60"
                disabled={!hasMM}
              >
                Claim
              </button>
            </div>
            <div className="text-xs text-[#B0B8D1] mt-2">
              ≈ {Math.max(0, Math.floor((claimKwh * GRID_EF_KG_PER_KWH) / 1000))} credit(s) (estimate)
            </div>
          </CardContent>
        </Card>

        {/* PMGT (your carbon credits) */}
        <Card className="bg-[#181F36] rounded-2xl flex-1 min-w-[260px] shadow-md flex flex-col justify-center border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaWallet color="#FFD600" size={22} />
            <span className="font-semibold text-lg">PMGT Balance</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-[#FFD600]">{fmt(pmgtBalance)}</div>
            <div className="text-[#FFD600] text-sm mt-2">Project #{DEFAULT_PROJECT_ID.toString()} · Retired total: {fmt(projectRetired)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Section */}
      <div className="flex gap-6 flex-wrap">
        {/* Live Energy & Earnings Tracker (visuals remain mock) */}
        <Card className="bg-[#181F36] rounded-2xl flex-2 min-w-0 flex-1 shadow-md border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaBolt color="#0DF6A9" size={20} />
            <span className="font-semibold text-xl">Live Energy & Earnings Tracker</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-[#B0B8D1] text-sm mb-6">
              Real-time solar energy production and earnings data
            </div>
            <div className="flex gap-6">
              <div className="bg-[#10182A] rounded-xl p-4 min-w-[120px] flex flex-col items-center gap-1 shadow">
                <FaBolt color="#0DF6A9" size={18} />
                <div className="text-lg text-[#0DF6A9] font-bold">{fmt(energy.kwh)} kWh</div>
                <div className="text-[#B0B8D1] text-xs">Total Energy</div>
              </div>
              <div className="bg-[#10182A] rounded-xl p-4 min-w-[120px] flex flex-col items-center gap-1 shadow">
                <FaCalendarAlt color="#FFD600" size={18} />
                <div className="text-lg text-[#FFD600] font-bold">
                  {(energy.kwh * GRID_EF_KG_PER_KWH / 1000).toFixed(2)} PMGT
                </div>
                <div className="text-[#B0B8D1] text-xs">Est. Earned</div>
              </div>
              <div className="bg-[#10182A] rounded-xl p-4 min-w-[120px] flex flex-col items-center gap-1 shadow">
                <FaCloud color="#A259FF" size={18} />
                <div className="text-lg text-[#A259FF] font-bold">
                  {Number(energy.deltaPct) >= 0 ? "+" : ""}{energy.deltaPct}%
                </div>
                <div className="text-[#B0B8D1] text-xs">Weather Impact</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PMGT Token Monitor */}
        <Card className="bg-[#181F36] rounded-2xl flex-1 min-w-0 shadow-md border-0">
          <CardHeader className="flex-row items-center space-y-0 gap-2 pb-2">
            <FaWallet color="#FFD600" size={20} />
            <span className="font-semibold text-xl">PMGT Token Monitor</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-[#B0B8D1] text-sm mb-4">Available Balance</div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-[#FFD600]">{fmt(pmgtBalance)} PMGT</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={pmgtBalance || 0}
                  value={retireAmt}
                  onChange={(e) => setRetireAmt(Number(e.target.value))}
                  className="bg-[#10182A] border border-[#FFD600] rounded-lg px-2 py-1 text-white w-20 focus:outline-none focus:ring-2 focus:ring-[#FFD600]"
                  aria-label="Retire PMGT amount"
                />
                <button
                  onClick={handleRetire}
                  className="bg-[#FFD600] text-[#10182A] rounded-lg px-4 py-1 font-semibold text-sm hover:bg-[#FFD600]/80 transition disabled:opacity-60"
                  disabled={!hasMM}
                >
                  Retire
                </button>
              </div>
            </div>
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleRefresh}
                className="bg-[#10182A] text-[#0DF6A9] rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-[#0DF6A9]/10 transition"
              >
                <FaSyncAlt /> Refresh
              </button>
              <button className="bg-[#10182A] text-[#0DF6A9] rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-[#0DF6A9]/10 transition">
                <FaArrowRight /> View Transactions
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
