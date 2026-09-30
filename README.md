# Ipin

A share is a share. Paid once.

Team USDC pots on **Arc testnet**. Pour money in. Cut the shares. The contract will not pay the same member twice in one round.

Copyright © 2026 Superfly. MIT.

## Why Arc

Gas is USDC. A small payout stays a small payout. Finality is immediate, so paid means paid.

This build is **testnet**. Mainnet is a config change once there is real USDC to spare.

## Network

| | |
|---|---|
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | https://testnet.arcscan.app |
| USDC (ERC-20, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| Faucet | https://faucet.circle.com |
| Publisher wallet | `0xc28ad0564edf25b517fae206a84063b5a0b2489a` |

Anyone can create a pot. The creator owns **that pot only**. Anyone can fund. Only the pot owner can pay.

## 1. Faucet

1. Open [Circle Faucet](https://faucet.circle.com).
2. Pick **Arc Testnet**.
3. Paste `0xc28ad0564edf25b517fae206a84063b5a0b2489a` (or the wallet you will use in Remix).
4. Request USDC. You need it for gas and for a tiny demo deposit.

Add Arc Testnet in MetaMask if it is missing:

- Network name: Arc Testnet
- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Symbol: USDC
- Explorer: `https://testnet.arcscan.app`

## 2. Deploy with Remix (preferred)

1. Open [remix.ethereum.org](https://remix.ethereum.org).
2. Create a file `Ipin.sol` and paste the contents of [`contracts/Ipin.sol`](contracts/Ipin.sol).
3. Compiler: `0.8.24` or later. Enable optimization (200 runs).
4. Deploy tab → Environment **Injected Provider — MetaMask**.
5. Confirm MetaMask is on **Arc Testnet (5042002)** and the account is `0xc28ad0564edf25b517fae206a84063b5a0b2489a`.
6. Next to Deploy, the constructor asks for `usdc_`.
   Paste:

   `0x3600000000000000000000000000000000000000`

7. Click **Deploy**. Confirm the wallet prompt.
8. Copy the contract address Remix prints.

### Verify on the explorer

1. Open `https://testnet.arcscan.app/address/<YOUR_CONTRACT>`.
2. Contract → **Verify & Publish**.
3. Compiler `v0.8.24`, optimization on, 200 runs, MIT.
4. Paste `contracts/Ipin.sol` (single file, no imports).
5. Wait for the green check.

## 3. Website on Vercel

1. Import this GitHub repo into Vercel.
2. Framework: Next.js.
3. Environment variable:

   `NEXT_PUBLIC_IPIN_ADDRESS=0xYourDeployedContract`

4. Deploy.
5. Open the site → Connect wallet → Create a pot → Approve → Fund → Cut shares.

Logo later: drop `logo.svg` or `logo.png` in [`public/logo/`](public/logo/).

## 4. What judges should feel

1. Connect any Arc testnet wallet.
2. Create their own pot (they become owner of that pot).
3. Fund 1 USDC.
4. Pay a member. Explorer link works.
5. Pay the same member again — it reverts: already paid.

## Mainnet later

When you have mainnet USDC:

- Chain ID `5042`
- RPC `https://rpc.mainnet.arc.io`
- Explorer `https://explorer.arc.io`
- USDC is still `0x3600000000000000000000000000000000000000`
- Redeploy the same `Ipin.sol` and point `NEXT_PUBLIC_IPIN_ADDRESS` at the new address.
