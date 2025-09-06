# Power Matrix - Carbon Credit Trading & Funding Platform

A full-stack prototype for a carbon-credit marketplace on Ethereum. Users can **claim**, **trade**, and **retire** carbon credits and crowdfund **green projects** that automatically distribute credits to investors when funded.

> **Stack:** Solidity (Hardhat v3 + ethers v6) • React + Vite + Tailwind • MetaMask  
> **Contracts:** `CarbonCredit1155`, `CarbonClaims`, `GreenFunding`, `CarbonMarketplace`

---

## ✨ Features

- **ERC-1155 Carbon Credits**  
  Roles: `DEFAULT_ADMIN_ROLE`, `VERIFIER_ROLE`. `retire()` burns + tracks retired supply.
- **Claims** (`CarbonClaims`)  
  Users submit claims from energy data → Regulator **approves** (mints requested amount) or **rejects** (reason).
- **Project Funding** (`GreenFunding`)  
  Create proposals; **Regulator approves** with an **auto-created tokenId** + **credits pool**.  
  Users fund in ETH (owner/regulator cannot fund).  
  **Auto-distribute credits pro-rata** to investors when goal is reached. Owner withdraws ETH after success; contributors refund on failure.
- **Marketplace** (`CarbonMarketplace`)  
  Sellers list credits (tokenId/qty/price in ETH). Buyers purchase: **ETH → seller**, **credits → buyer**.
- **Dashboard**  
  Mock energy + claims; credit balance + **Retire → PDF badge** (tokenId, tx hash, timestamp).
- **Regulator Console (role-gated)**  
  Approve/reject **projects** & **claims**.

---


## 🚀 Local Setup

### Prerequisites
- Node.js **≥ 18**
- Git
- MetaMask browser extension

### 1) Install dependencies
```bash
# backend
cd pmx-backend
npm install

# frontend
cd ../power-matrix-ui
npm install
```


### 2) Start a local blockchain
```bash
cd ../pmx-backend
npx hardhat node
```

Keep this terminal open (it shows funded test accounts/private keys).

### 3) Compile contracts
```bash
npx hardhat compile
```

### 4) Set environment variables (do not share keys)
```bash
PowerShell (Windows):

$env:RPC="http://127.0.0.1:8545"
$env:PK1="<PASTE_FIRST_ACCOUNT_PRIVKEY_FROM_HARDHAT_NODE>"
$env:PK2="<OPTIONAL_SECOND_ACCOUNT_PK>"
$env:PK3="<OPTIONAL_THIRD_ACCOUNT_PK>"


bash/zsh:

export RPC="http://127.0.0.1:8545"
export PK1="<PASTE_FIRST_ACCOUNT_PRIVKEY_FROM_HARDHAT_NODE>"
export PK2="<OPTIONAL_SECOND_ACCOUNT_PK>"
export PK3="<OPTIONAL_THIRD_ACCOUNT_PK>"

```
Use private keys only from your local Hardhat node for development.

### 5) Deploy contracts (local)
```bash
# Deploy ERC-1155 Carbon
npx hardhat run ./scripts/deployLocal.ts --network localhost

# Deploy Claims + Funding
npx hardhat run ./scripts/deployClaimsFunding.ts --network localhost

# Deploy Marketplace
npx hardhat run ./scripts/deployMarket.ts --network localhost

# Grant roles to Claims & Funding (must run as deployer/admin)
npx hardhat run ./scripts/grantRoles.ts --network localhost
```

These scripts write addresses to pmx-backend/deployments.local.json.

### 6) Copy ABIs to the frontend
```bash
Copy these files from pmx-backend/artifacts/.../*.json to power-matrix-ui/src/abis/:

    - CarbonCredit1155.json

    - CarbonClaims.json

    - GreenFunding.json

    - CarbonMarketplace.json

```
Copy only the artifacts that contain abi & bytecode (the top-level JSON under the contract file path).

### 7) Configure frontend environment
Create power-matrix-ui/.env.local:
```bash
VITE_CHAIN_ID=31337
VITE_CARBON_ADDR=<ADDRESS_FROM_deployments.local.json>
VITE_CLAIMS_ADDR=<ADDRESS_FROM_deployments.local.json>
VITE_FUNDING_ADDR=<ADDRESS_FROM_deployments.local.json>
VITE_MARKET_ADDR=<ADDRESS_FROM_deployments.local.json>
```

### 8) Run the frontend
```bash
cd power-matrix-ui
npm run dev
```


## In MetaMask:

- Add/Use Localhost 8545 (chainId 31337).

- Import the dev accounts you want (from the Hardhat node output).

- Connect to the app and test flows.


## Roles

- Regulator = account with DEFAULT_ADMIN_ROLE and/or VERIFIER_ROLE on CarbonCredit1155.
Granted by scripts/grantRoles.ts.
Access to Regulator Console (projects & claims).

## Troubleshooting

- Wrong network: Switch MetaMask to 31337 (Localhost 8545).

- ABI mismatch / “no matching fragment”: Re-compile backend, re-copy ABIs, restart frontend.

- Funding beyond goal: The contract rejects contributions exceeding remaining amount. Re-deploy if you used an older version.

- Auto-distribution didn’t mint: Ensure project was approved with a non-zero credits pool and the funding exactly reached goal; verify Claims & Funding have VERIFIER_ROLE.


&copy; Made for Fun but with ❤️