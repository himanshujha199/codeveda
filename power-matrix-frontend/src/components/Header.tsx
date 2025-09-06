import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Sun } from "lucide-react";
import { useWallet, shortAddr } from "../blockchain/useWallet";
import { useIsRegulator } from "@/blockchain/useRegulator";

const Header = () => {
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const { account, chainId, connect, disconnect, switchAccount, ethBalance, pmgtBalance, refreshBalances } = useWallet(1n);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    setUser(stored ? JSON.parse(stored) : null);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  };

  const isRegulator = useIsRegulator();
  // persist simple role flag for router guards
  useEffect(() => {
    try {
      sessionStorage.setItem("pmx_is_reg", isRegulator ? "true" : "false");
    } catch {}
  }, [isRegulator]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Sun className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Power Matrix</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {!isRegulator && (
            <a href="/dashboard" className="text-foreground/80 hover:text-primary transition-colors font-medium">Dashboard</a>
          )}
          <a href="/projects" className="text-foreground/80 hover:text-primary transition-colors font-medium">Projects</a>
          <a href="/marketplace" className="text-foreground/80 hover:text-primary transition-colors font-medium">Marketplace</a>
          <a href="/community" className="text-foreground/80 hover:text-primary transition-colors font-medium">Community</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!account ? (
            <Button variant="connect" size="sm" onClick={connect}>
              Connect Wallet
            </Button>
          ) : (
            <div className="relative">
              <button
                className="px-3 py-2 rounded-lg bg-[#0DF6A9] text-[#10182A] font-semibold shadow hover:bg-[#0DF6A9]/90"
                onClick={() => setShowWalletMenu(v => !v)}
                title={account}
              >
                {shortAddr(account)} <span className="ml-1 text-xs opacity-80">({chainId ?? "?"})</span>
              </button>

              {showWalletMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#181F36] border border-[#232B45] rounded shadow-lg z-50">
                  <div className="px-3 py-2 text-xs text-[#B0B8D1]">
                    ETH: <span className="text-[#0DF6A9]">{Number(ethBalance).toFixed(4)}</span> · PMGT: <span className="text-[#FFD600]">{pmgtBalance}</span>
                  </div>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-[#0DF6A9]/10"
                    onClick={async () => { await refreshBalances(); setShowWalletMenu(false); }}
                  >
                    Refresh Balances
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-[#0DF6A9]/10"
                    onClick={async () => { await switchAccount(); setShowWalletMenu(false); }}
                  >
                    Switch Account
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-[#0DF6A9]/10"
                    onClick={() => { navigator.clipboard.writeText(account); setShowWalletMenu(false); }}
                  >
                    Copy Address
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 text-red-300 hover:bg-red-400/10"
                    onClick={() => { disconnect(); setShowWalletMenu(false); }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}

            {isRegulator && (
            <Button variant="hero" size="sm">
              <a href="/regulator" className="text-foreground/80 hover:text-primary transition-colors font-medium">
              Regulator
              </a>
            </Button>
            )}

          {!user ? (
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/login")}>
              Login
            </Button>
          ) : (
            <div className="relative flex items-center gap-2">
              <span
                className="font-semibold text-foreground/90 cursor-pointer px-2 py-1 rounded hover:bg-muted transition"
                onClick={() => setShowLogout((prev) => !prev)}
              >
                {user.name}
              </span>
              {showLogout && (
                <div className="absolute top-full right-0 mt-2 bg-[#181F36] border border-[#232B45] rounded shadow-lg z-10">
                  <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
