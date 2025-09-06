import { useEffect, useState } from "react";
import { Contract } from "ethers";
import carbonAbi from "@/abis/CarbonCredit1155.json";
import { CARBON_ADDR } from "@/blockchain/addresses";
import { useWallet } from "@/blockchain/useWallet";

export function useIsRegulator() {
  const { provider, account } = useWallet(1n);
  const [isReg, setIsReg] = useState(false);

  useEffect(() => {
    (async () => {
      if (!provider || !account) { setIsReg(false); return; }
      try {
        const carbon = new Contract(CARBON_ADDR, (carbonAbi as any).abi, provider);
        const vr: string = await (carbon as any).VERIFIER_ROLE();
        const ar: string = await (carbon as any).DEFAULT_ADMIN_ROLE?.().catch?.(() => "0x");
        const hasVr: boolean = await (carbon as any).hasRole(vr, account);
        const hasAr: boolean = ar && ar !== "0x" ? await (carbon as any).hasRole(ar, account) : false;
        setIsReg(Boolean(hasVr || hasAr));
      } catch {
        setIsReg(false);
      }
    })();
  }, [provider, account]);

  return isReg;
}
