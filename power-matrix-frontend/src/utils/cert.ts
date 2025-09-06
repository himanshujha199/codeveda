// src/utils/cert.ts
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type RetireCertInput = {
  account: string;                 // 0x...
  tokenId: number | string | bigint;
  amount: number | string | bigint;
  txHash: string;                  // 0x...
  timestamp?: number;              // seconds
  chainName?: string;              // e.g., "Hardhat (31337)"
  projectTitle?: string;           // optional label
};

function short(addrOrHash: string, head = 6, tail = 4) {
  if (!addrOrHash?.startsWith("0x") || addrOrHash.length <= head + tail + 2) return addrOrHash;
  return `${addrOrHash.slice(0, 2 + head)}…${addrOrHash.slice(-tail)}`;
}

export async function generateRetirePDF(input: RetireCertInput) {
  const {
    account,
    tokenId,
    amount,
    txHash,
    timestamp = Math.floor(Date.now() / 1000),
    chainName = "Hardhat (31337)",
    projectTitle = "Carbon Credit Series",
  } = input;

  const dateStr = new Date(timestamp * 1000).toLocaleString();

  // Build QR payload – for local dev we embed JSON (no explorer)
  const qrPayload = JSON.stringify({
    type: "retirement",
    txHash,
    tokenId: String(tokenId),
    amount: String(amount),
    account,
    chain: chainName,
    ts: timestamp,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Background bar
  doc.setFillColor("#10182A"); doc.rect(0, 0, W, 80, "F");
  doc.setFillColor("#0DF6A9"); doc.rect(0, 80, W, 6, "F");

  // Heading
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(20);
  doc.text("Power Matrix", 40, 50);
  doc.setFontSize(14);
  doc.text("Carbon Credit Retirement Certificate", 40, 72);

  // Body
  doc.setTextColor("#000000");
  doc.setFontSize(18);
  doc.text("Certificate of Retirement", 40, 130);
  doc.setFontSize(12);
  doc.text(
    "This certifies that the following carbon credits have been permanently retired on-chain.",
    40, 150
  );

  // Details box
  const y0 = 180;
  doc.setDrawColor("#E5E7EB");
  doc.roundedRect(36, y0 - 20, W - 72, 200, 8, 8);

  doc.setFontSize(12);
  const rows: Array<[string, string]> = [
    ["Holder", account],
    ["Token ID", String(tokenId)],
    ["Amount Retired", String(amount)],
    ["Transaction", txHash],
    ["Timestamp", dateStr],
    ["Network", chainName],
    ["Series", projectTitle],
  ];
  let yy = y0;
  rows.forEach(([k, v]) => {
    doc.setTextColor("#374151"); doc.text(`${k}`, 50, yy);
    doc.setTextColor("#111827"); doc.text(`${short(v)}`, 220, yy);
    yy += 26;
  });

  // QR code
  doc.addImage(qrDataUrl, "PNG", W - 200, y0 - 10, 140, 140);
  doc.setFontSize(10);
  doc.setTextColor("#6B7280");
  doc.text("Scan to verify (payload includes tx, token, chain).", W - 200, y0 + 140 + 14);

  // Footer
  doc.setDrawColor("#0DF6A9"); doc.line(40, 430, 240, 430);
  doc.setTextColor("#111827"); doc.text("Verifier", 40, 446);
  doc.setTextColor("#6B7280");
  doc.text("Power Matrix – Sustainable Markets", 40, 500);

  const file = `PMX-Retire-${short(txHash, 8, 6)}.pdf`;
  doc.save(file);
}
