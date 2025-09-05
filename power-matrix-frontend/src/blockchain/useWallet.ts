// src/blockchain/useWallet.ts
import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";
import carbonAbi from "@/abis/CarbonCredit1155.json";
import { CARBON_ADDR } from "@/blockchain/addresses";

declare global { interface Window { ethereum?: any } }

const CONNECT_FLAG = "pmx_wallet_connected";

export function useWallet(defaultTokenId: bigint = 1n) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount]   = useState<string | null>(null);
  const [chainId, setChainId]   = useState<number | null>(null);
  const [ethBalance, setEthBal] = useState<string>("0.0");
  const [pmgtBalance, setPmg]   = useState<number>(0);

  // boot: create provider, but DO NOT auto-connect unless user opted in before
  useEffect(() => {
    if (!window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    setProvider(p);

    (async () => {
      const net = await p.getNetwork();
      setChainId(Number(net.chainId));

      // only repopulate account if user had explicitly connected before
      const shouldReconnect = localStorage.getItem(CONNECT_FLAG) === "true";
      if (!shouldReconnect) return;

      const accs: string[] = await p.send("eth_accounts", []);
      if (accs[0]) {
        setAccount(accs[0]);
        await refreshBalancesInternal(p, accs[0], defaultTokenId);
      }
    })();

    const onAcc = async (arr: string[]) => {
      const a = arr?.[0] ?? null;
      setAccount(a);
      if (!a) {
        localStorage.removeItem(CONNECT_FLAG);
        setEthBal("0.0");
        setPmg(0);
      } else if (provider) {
        await refreshBalancesInternal(provider, a, defaultTokenId);
      }
    };
    const onChain = async () => {
      const net = await p.getNetwork();
      setChainId(Number(net.chainId));
      if (account) await refreshBalancesInternal(p, account, defaultTokenId);
    };

    window.ethereum.on?.("accountsChanged", onAcc);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAcc);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalancesInternal = useCallback(
    async (prov: BrowserProvider, addr: string, tokenId: bigint) => {
      const eth = await prov.getBalance(addr);
      setEthBal(formatEther(eth));
      const carbon = new Contract(CARBON_ADDR, (carbonAbi as any).abi, prov);
      const pmgt: bigint = await (carbon as any).balanceOf(addr, tokenId);
      setPmg(Number(pmgt));
    },
    []
  );

  const refreshBalances = useCallback(async (tokenId: bigint = defaultTokenId) => {
    if (!provider || !account) return;
    await refreshBalancesInternal(provider, account, tokenId);
  }, [provider, account, defaultTokenId, refreshBalancesInternal]);

  const connect = useCallback(async () => {
    if (!provider) throw new Error("MetaMask not found");
    // opens MM connect window; user picks accounts
    const accs: string[] = await provider.send("eth_requestAccounts", []);
    const a = accs[0] ?? null;
    setAccount(a);
    localStorage.setItem(CONNECT_FLAG, a ? "true" : "false");
    const net = await provider.getNetwork();
    setChainId(Number(net.chainId));
    if (a) await refreshBalancesInternal(provider, a, defaultTokenId);
  }, [provider, defaultTokenId, refreshBalancesInternal]);

  const disconnect = useCallback(async () => {
    // best-effort: revoke site permission so refresh won't auto-connect
    try {
      await window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // some wallets don’t support revoke; clearing the flag prevents our auto-reconnect
    }
    localStorage.removeItem(CONNECT_FLAG);
    setAccount(null);
    setEthBal("0.0");
    setPmg(0);
  }, []);

  const switchAccount = useCallback(async () => {
    if (!provider) return;
    // open the MetaMask “choose accounts” permission UI
    try {
      await window.ethereum?.request?.({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // ignore; user may cancel
    }
    // then read the newly selected account
    const accs: string[] = await provider.send("eth_requestAccounts", []);
    const a = accs[0] ?? null;
    setAccount(a);
    localStorage.setItem(CONNECT_FLAG, a ? "true" : "false");
    if (a) await refreshBalancesInternal(provider, a, defaultTokenId);
  }, [provider, defaultTokenId, refreshBalancesInternal]);

  return {
    provider,
    account,
    chainId,
    ethBalance,
    pmgtBalance,
    connect,
    disconnect,
    switchAccount,
    refreshBalances,
  };
}

export function shortAddr(addr?: string | null, size = 4) {
  if (!addr) return "";
  return addr.slice(0, 2 + size) + "…" + addr.slice(-size);
}
