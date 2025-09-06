import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../blockchain/useWallet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import {
  fetchListings,
  listCredits,
  buyListing,
  ensureApprovalForAll,
} from "@/blockchain/market";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Row = { id: number; seller: string; tokenId: number; amount: number; priceEth: string };

const MarketPlace: React.FC = () => {
  const { account, ethBalance, pmgtBalance, connect, refreshBalances } = useWallet(1n);
  const [tab, setTab] = useState<"Buy" | "Sell">("Buy");

  // on-chain book
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // buy modal
  const [selectedBuy, setSelectedBuy] = useState<Row | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // sell form (we use "price per credit (ETH)" and compute total for the bundle)
  const [sellQty, setSellQty] = useState<string>("");
  const [sellUnitEth, setSellUnitEth] = useState<string>("");

  // demo datasets for exchange-style view
  const priceHistory = [
    { time: "09:00", price: 1.12 },
    { time: "10:00", price: 1.18 },
    { time: "11:00", price: 1.15 },
    { time: "12:00", price: 1.22 },
    { time: "13:00", price: 1.2 },
    { time: "14:00", price: 1.27 },
  ];
  const orderBookDemo = {
    bids: [
      { price: 1.24, amount: 50 },
      { price: 1.23, amount: 40 },
      { price: 1.22, amount: 60 },
      { price: 1.21, amount: 70 },
      { price: 1.2, amount: 30 },
    ],
    asks: [
      { price: 1.26, amount: 50 },
      { price: 1.27, amount: 35 },
      { price: 1.28, amount: 65 },
      { price: 1.29, amount: 45 },
      { price: 1.3, amount: 55 },
    ],
  };
  const tradeHistory = [
    { time: "13:55:10", price: 1.26, amount: 5, side: "buy" as const },
    { time: "13:54:55", price: 1.25, amount: 3, side: "sell" as const },
    { time: "13:54:40", price: 1.25, amount: 2, side: "buy" as const },
    { time: "13:54:20", price: 1.27, amount: 1, side: "sell" as const },
    { time: "13:54:05", price: 1.26, amount: 4, side: "buy" as const },
  ];

  const bestAsk = useMemo(() => {
    if (!rows.length) return "--";
    const sorted = [...rows].sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
    return sorted[0]?.priceEth ?? "--";
  }, [rows]);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchListings(1, 500);
      // sort low → high by total ETH for readability
      list.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
      setRows(list);
      setStatus(`Loaded ${list.length} listing(s)`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Failed loading listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------- BUY ----------
  const handleBuyClick = (r: Row) => {
    setSelectedBuy(r);
    setShowConfirm(true);
  };

  async function handleConfirmBuy() {
    if (!selectedBuy) return;
    try {
      setStatus("Buying…");
      await buyListing(selectedBuy.id, selectedBuy.priceEth);
      setShowConfirm(false);
      setSelectedBuy(null);
      setStatus("Purchase confirmed on-chain");
      await load();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Buy failed");
    }
  }

  // ---------- SELL ----------
  function totalEth(): string {
    const qty = Number(sellQty || 0);
    const unit = Number(sellUnitEth || 0);
    if (!qty || !unit) return "0";
    // NOTE: Marketplace expects TOTAL price for the whole bundle
    return (qty * unit).toString();
  }

  async function handleSellSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(sellQty);
    const unit = Number(sellUnitEth);
    if (!qty || !unit) {
      setStatus("Enter quantity and unit price (ETH)");
      return;
    }
    try {
      setStatus("Approving marketplace…");
      await ensureApprovalForAll();
      setStatus("Listing on-chain…");
      await listCredits(1, qty, totalEth()); // tokenId=1 (dashboard bucket)
      setSellQty("");
      setSellUnitEth("");
      setStatus("Listed successfully");
      await load();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "List failed");
    }
  }

  return (
    <>
      <Header />
      <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16">
        <div className="max-w-7xl mx-auto">
          {/* exchange style demo section */}
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {/* chart */}
            <Card className="bg-[#181F36] rounded-2xl shadow-md border-0 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <XAxis dataKey="time" stroke="#B0B8D1" />
                      <YAxis stroke="#B0B8D1" domain={[1.1, 1.3]} />
                      <Tooltip
                        contentStyle={{ background: "#232B45", border: "none" }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#0DF6A9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* order book and trades */}
            <div className="space-y-8">
              <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Order Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* bids */}
                    <table className="w-full text-left">
                      <tbody>
                        {orderBookDemo.bids.map((o, i) => (
                          <tr key={`bid-${i}`} className="text-[#0DF6A9]">
                            <td>{o.price.toFixed(4)}</td>
                            <td>{o.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* asks */}
                    <table className="w-full text-right">
                      <tbody>
                        {orderBookDemo.asks.map((o, i) => (
                          <tr key={`ask-${i}`} className="text-[#FF5A5F]">
                            <td>{o.price.toFixed(4)}</td>
                            <td>{o.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-xl">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#B0B8D1]">
                        <th className="text-left">Time</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((t, i) => (
                        <tr key={`trade-${i}`} className="border-t border-[#232B45]">
                          <td>{t.time}</td>
                          <td
                            className={`text-right ${
                              t.side === "buy" ? "text-[#0DF6A9]" : "text-[#FF5A5F]"
                            }`}
                          >
                            {t.price.toFixed(4)}
                          </td>
                          <td className="text-right">{t.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* tabs */}
          <div className="flex items-center gap-4 mb-2">
            <button
              className={`px-4 py-2 rounded-lg font-semibold ${
                tab === "Buy"
                  ? "bg-[#0DF6A9] text-[#10182A] shadow-lg"
                  : "bg-[#181F36] text-[#0DF6A9] border border-[#0DF6A9]"
              }`}
              onClick={() => setTab("Buy")}
            >
              Buy
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold ${
                tab === "Sell"
                  ? "bg-[#A259FF] text-[#181F36] shadow-lg"
                  : "bg-[#181F36] text-[#A259FF] border border-[#A259FF]"
              }`}
              onClick={() => setTab("Sell")}
            >
              Sell
            </button>

            <div className="ml-auto text-xs text-[#B0B8D1]">
              Status: {status || (loading ? "Loading…" : "—")}
            </div>
            <button
              onClick={load}
              className="ml-2 px-3 py-1 rounded bg-[#10182A] border border-[#0DF6A9] text-[#0DF6A9] text-xs"
            >
              Refresh
            </button>
          </div>

          <br />

          {/* Wallet balances bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
            {!account ? (
              <button
                onClick={connect}
                className="px-4 py-2 rounded-lg bg-[#0DF6A9] text-[#10182A] font-semibold"
              >
                Connect Wallet
              </button>
            ) : (
              <>
                <div className="px-3 py-2 rounded-lg bg-[#181F36] border border-[#232B45]">
                  <span className="text-[#B0B8D1] mr-2">ETH</span>
                  <span className="text-[#0DF6A9] font-semibold">{Number(ethBalance).toFixed(4)}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#181F36] border border-[#232B45]">
                  <span className="text-[#B0B8D1] mr-2">PMGT</span>
                  <span className="text-[#FFD600] font-semibold">{pmgtBalance}</span>
                </div>
                <button
                  onClick={() => refreshBalances()}
                  className="px-3 py-2 rounded-lg bg-[#10182A] border border-[#0DF6A9] text-[#0DF6A9] text-sm"
                >
                  Refresh
                </button>
              </>
            )}
          </div>

          {/* Side by side */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT */}
            <div className="flex-1">
              <Card className="bg-[#181F36] rounded-2xl shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {tab === "Buy" ? "Order Book" : "Sell Carbon Credits"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tab === "Sell" ? (
                    <form onSubmit={handleSellSubmit}>
                      <div className="mb-4">
                        <label className="block text-[#B0B8D1] mb-1">Quantity (credits)</label>
                        <input
                          type="number"
                          value={sellQty}
                          onChange={(e) => setSellQty(e.target.value)}
                          min={1}
                          placeholder="Enter quantity"
                          className="w-full bg-[#10182A] rounded-lg px-4 py-2 text-white border border-[#232B45] focus:outline-none"
                          required
                        />
                      </div>
                      <div className="mb-1">
                        <label className="block text-[#B0B8D1] mb-1">Price per credit (ETH)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={sellUnitEth}
                          onChange={(e) => setSellUnitEth(e.target.value)}
                          placeholder="e.g. 0.004"
                          className="w-full bg-[#10182A] rounded-lg px-4 py-2 text-white border border-[#232B45] focus:outline-none"
                          required
                        />
                      </div>
                      <div className="text-xs text-[#B0B8D1] mb-3">
                        Total: <span className="text-[#0DF6A9] font-semibold">{totalEth()}</span> ETH
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#A259FF] text-white font-bold py-3 rounded-lg mt-2 transition hover:bg-[#A259FF]/80"
                      >
                        Sell Credits
                      </button>
                    </form>
                  ) : (
                    <div>
                      <div className="text-[#B0B8D1] text-sm mb-2">Sell Orders</div>
                      <table className="w-full text-left mb-4 border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-[#B0B8D1] text-xs">
                            <th className="py-2">Price (ETH, total)</th>
                            <th className="py-2">Quantity</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="bg-[#232B45] rounded-lg hover:bg-[#0DF6A9]/10 transition">
                              <td className="py-2 font-semibold text-[#0DF6A9]">{Number(r.priceEth).toFixed(6)}</td>
                              <td className="py-2">{r.amount}</td>
                              <td className="py-2">
                                <button
                                  className="bg-[#0DF6A9] text-[#10182A] px-3 py-1 rounded font-bold hover:bg-[#0DF6A9]/80"
                                  onClick={() => handleBuyClick(r)}
                                >
                                  Buy
                                </button>
                              </td>
                            </tr>
                          ))}
                          {!rows.length && !loading && (
                            <tr><td className="text-[#B0B8D1] py-3" colSpan={3}>No active listings</td></tr>
                          )}
                        </tbody>
                      </table>
                      <div className="flex justify-between text-xs text-[#B0B8D1] mt-2">
                        <span>Best Ask: {bestAsk}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BUY CONFIRM MODAL */}
          {showConfirm && selectedBuy && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-[#181F36] rounded-xl p-8 shadow-lg w-full max-w-sm border border-[#0DF6A9]">
                <h2 className="text-lg font-bold mb-4">Confirm Purchase</h2>
                <p className="mb-2">
                  Buy <b>{selectedBuy.amount}</b> credits for total{" "}
                  <b>{Number(selectedBuy.priceEth).toFixed(6)} ETH</b>?
                </p>
                <div className="flex gap-4 mt-6">
                  <button
                    className="bg-[#0DF6A9] text-[#10182A] px-4 py-2 rounded font-bold flex-1"
                    onClick={handleConfirmBuy}
                  >
                    Confirm
                  </button>
                  <button
                    className="bg-[#232B45] text-white px-4 py-2 rounded font-bold flex-1"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MarketPlace;