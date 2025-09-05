import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("http://127.0.0.1:8545");

async function who(addr: string) {
  const code = await provider.getCode(addr);
  console.log(addr, code === "0x" ? "NO CODE" : `CODE len=${code.length}`);
}

(async () => {
  await who("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  await who("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
})();
