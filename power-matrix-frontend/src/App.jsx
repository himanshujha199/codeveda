import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { Wallet, ShoppingCart, Leaf, PlugZap, Store, LogOut, RefreshCcw, Factory, BadgeHelp } from "lucide-react";
import carbonAbiJson from "./abis/CarbonCredit1155.json";
import marketAbiJson from "./abis/CarbonMarketplace.json";
import { CARBON_ADDR, MARKET_ADDR, LOCAL_CHAIN_ID } from "./config";
import { theme as t } from "./theme";

const hasMM = typeof window.ethereum !== "undefined";

export default function App() {
  // ---------------- state
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState(hasMM ? "disconnected" : "install MetaMask");

  const [tokenId, setTokenId] = useState(1);
  const [bal, setBal] = useState("-");
  const [retired, setRetired] = useState("-");

  const [listAmount, setListAmount] = useState(5);
  const [listPriceEth, setListPriceEth] = useState("0.1");
  const [lastListingId, setLastListingId] = useState(null);
  const [buyListingId, setBuyListingId] = useState("");

  // ---------------- provider + contracts
  const provider = useMemo(() => (hasMM ? new BrowserProvider(window.ethereum) : null), []);
  const carbon   = useMemo(() => (provider ? new Contract(CARBON_ADDR, carbonAbiJson.abi, provider) : null), [provider]);
  const market   = useMemo(() => (provider ? new Contract(MARKET_ADDR, marketAbiJson.abi, provider) : null), [provider]);

  // ---------------- wallet helpers
  async function readNetwork() {
    const net = await provider.getNetwork();
    const cid = Number(net.chainId);
    setChainId(cid);
    setStatus(cid !== LOCAL_CHAIN_ID ? "wrong network: switch to Localhost 8545 (31337)" : "connected");
  }
  async function connect() {
    try {
      if (!provider) throw new Error("MetaMask not found");
      const accs = await provider.send("eth_requestAccounts", []);
      setAccount(accs[0] ?? null);
      await readNetwork();
    } catch (e) { setStatus(e?.message || "connect failed"); }
  }
  async function switchAccount() {
    try {
      if (!provider) throw new Error("MetaMask not found");
      try { await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]); }
      catch { await provider.send("eth_requestAccounts", []); }
      const accs = await provider.send("eth_accounts", []);
      setAccount(accs[0] ?? null);
      await readNetwork(); await refresh();
    } catch (e) { setStatus(e?.message || "switch failed"); }
  }
  function disconnect() {
    setAccount(null); setBal("-"); setRetired("-"); setStatus("disconnected");
  }
  useEffect(() => {
    if (!hasMM) return;
    const onAcc = async (accs)=>{ setAccount(accs[0] ?? null); if (!accs[0]) return disconnect(); await readNetwork(); await refresh(); };
    const onChain = async (id)=>{ const cid = Number(id); setChainId(cid); setStatus(cid!==LOCAL_CHAIN_ID?"wrong network: switch to Localhost 8545 (31337)":"connected"); await refresh(); };
    window.ethereum.on("accountsChanged", onAcc);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAcc);
      window.ethereum?.removeListener("chainChanged", onChain);
    };
  }, [provider]);

  // ---------------- contract actions
  async function refresh() {
    if (!carbon || !account) return;
    try {
      const b = await carbon.balanceOf(account, BigInt(tokenId)); setBal(b.toString());
      const p = await carbon.projects(BigInt(tokenId)); const r = p?.retired ?? p?.[4] ?? 0n; setRetired(r.toString());
    } catch (e) { setStatus(e?.message || "read failed"); }
  }
  async function retireOne() {
    if (!provider || !carbon || !account) return;
    try { const signer = await provider.getSigner(); const c = carbon.connect(signer);
      setStatus("retiring 1…"); await (await c.retire(BigInt(tokenId), 1n)).wait();
      setStatus("retired 1"); await refresh();
    } catch (e) { setStatus(e?.message || "tx failed"); }
  }
  async function approveMarket() {
    if (!provider || !carbon || !account) return;
    try { const signer = await provider.getSigner(); const c = carbon.connect(signer);
      setStatus("approving…"); await (await c.setApprovalForAll(MARKET_ADDR,true)).wait(); setStatus("approved");
    } catch (e) { setStatus(e?.message || "approve failed"); }
  }
  async function listLot() {
    if (!provider || !market || !account) return;
    try { const signer = await provider.getSigner(); const m = market.connect(signer);
      setStatus("listing…"); const priceWei = parseEther(String(listPriceEth));
      await (await m.list(BigInt(tokenId), BigInt(listAmount), priceWei)).wait();
      const nextId = await market.nextListingId(); const id = (nextId-1n).toString();
      setLastListingId(id); setBuyListingId(id); setStatus(`listed as #${id}`);
    } catch (e) { setStatus(e?.message || "list failed"); }
  }
  async function buyLot() {
    if (!provider || !market || !account) return;
    try { const signer = await provider.getSigner(); const m = market.connect(signer);
      const priceWei = parseEther(String(listPriceEth)); setStatus(`buying #${buyListingId}…`);
      await (await m.buy(BigInt(buyListingId), { value: priceWei })).wait();
      setStatus("bought"); await refresh();
    } catch (e) { setStatus(e?.message || "buy failed"); }
  }

  // ---------------- UI
  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-10 backdrop-blur bg-bg/60 border-b border-bg-border">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlugZap className="size-5 text-brand" />
            <span className="font-semibold">Power Matrix</span>
            <span className="text-white/50 text-sm hidden md:block">· Carbon Market</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:block ${t.kbd}`}>{CARBON_ADDR.slice(0,6)}…{CARBON_ADDR.slice(-4)}</span>
            <span className={`hidden md:block ${t.kbd}`}>{MARKET_ADDR.slice(0,6)}…{MARKET_ADDR.slice(-4)}</span>
            <button onClick={connect} className={`${t.btn} ${t.btnPrimary} flex items-center gap-2`}><Wallet className="size-4"/>Connect</button>
            <button onClick={switchAccount} className={`${t.btn} ${t.btnGhost}`}>Switch</button>
            <button onClick={disconnect} className={`${t.btn} ${t.btnGhost}`}><LogOut className="size-4"/></button>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto max-w-7xl px-4 py-8 grid gap-6 md:grid-cols-12">
        {/* left column */}
        <section className="md:col-span-8 space-y-6">
          {/* project card */}
          <div className={t.card}>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Leaf className="size-5 text-brand" />
                <h3 className="font-semibold">Project / Token</h3>
              </div>
              <span className={`${t.kbd}`}>Chain: {chainId ?? "-"}</span>
            </div>
            <div className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
              <label className="text-sm text-white/70">Token ID
                <input className={`${t.input} w-full mt-1`} type="number" value={tokenId} onChange={e=>setTokenId(Number(e.target.value))}/>
              </label>
              <div className="flex gap-2 items-end">
                <button onClick={refresh} className={`${t.btn} ${t.btnGhost} flex items-center gap-2`}><RefreshCcw className="size-4"/>Refresh</button>
                <button onClick={retireOne} className={`${t.btn} ${t.btnPrimary}`}>Retire 1</button>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-bg-muted border border-bg-border">
                  <div className="text-xs text-white/60">My balance</div>
                  <div className="text-2xl font-semibold mt-1">{bal}</div>
                </div>
                <div className="p-4 rounded-xl bg-bg-muted border border-bg-border">
                  <div className="text-xs text-white/60">Total retired</div>
                  <div className="text-2xl font-semibold mt-1">{retired}</div>
                </div>
              </div>
            </div>
          </div>

          {/* marketplace */}
          <div className={t.card}>
            <div className="p-5 flex items-center gap-3">
              <Store className="size-5 text-brand"/><h3 className="font-semibold">Marketplace</h3>
            </div>
            <div className="px-5 pb-5 grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-bg-muted border border-bg-border">
                <b>1) Approve</b>
                <p className="text-sm text-white/60 mt-1">Allow the market to move your credits.</p>
                <button onClick={approveMarket} className={`${t.btn} ${t.btnGhost} mt-3`}>Approve</button>
              </div>
              <div className="p-4 rounded-xl bg-bg-muted border border-bg-border">
                <b>2) List</b>
                <label className="block text-sm mt-2">Amount
                  <input className={`${t.input} w-full mt-1`} type="number" value={listAmount} onChange={e=>setListAmount(Number(e.target.value))}/>
                </label>
                <label className="block text-sm mt-2">Price (ETH)
                  <input className={`${t.input} w-full mt-1`} value={listPriceEth} onChange={e=>setListPriceEth(e.target.value)}/>
                </label>
                <button onClick={listLot} className={`${t.btn} ${t.btnPrimary} mt-3 flex items-center gap-2`}><Factory className="size-4"/>List</button>
                {lastListingId && <div className="text-sm text-white/70 mt-2">Listed as: #{lastListingId}</div>}
              </div>
              <div className="p-4 rounded-xl bg-bg-muted border border-bg-border">
                <b>3) Buy</b>
                <label className="block text-sm mt-2">Listing ID
                  <input className={`${t.input} w-full mt-1`} value={buyListingId} onChange={e=>setBuyListingId(e.target.value)}/>
                </label>
                <label className="block text-sm mt-2">Price (ETH)
                  <input className={`${t.input} w-full mt-1`} value={listPriceEth} onChange={e=>setListPriceEth(e.target.value)}/>
                </label>
                <button onClick={buyLot} className={`${t.btn} ${t.btnGhost} mt-3 flex items-center gap-2`}><ShoppingCart className="size-4"/>Buy</button>
              </div>
            </div>
          </div>

          {/* status */}
          <div className={`${t.card} p-5 flex items-center gap-2 text-white/80`}>
            <BadgeHelp className="size-4 text-brand"/><span>Status:</span><span className="font-medium">{status}</span>
          </div>
        </section>

        {/* right column (room for your estimator or charts) */}
        <aside className="md:col-span-4 space-y-6">
          <div className={`${t.card} p-5`}>
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="list-disc ml-4 text-white/70 text-sm space-y-1">
              <li>List as Seller, then switch to Buyer and press Buy.</li>
              <li>Use Token ID 1 for the demo you seeded.</li>
              <li>Retire proves usage and prevents re-sale.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
