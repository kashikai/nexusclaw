# NexusClaw 🦞

## Overview
NexusClaw is a multi-chain crypto project revolutionizing agent-to-agent marketplaces and self-improving AI ecosystems. Built for scalability across EVM-compatible chains, with focus on tokenomics, risk mitigation, and maximum fees capture.

### Key Features
- **Multi-Chain Deployment**: Live on Base Sepolia, Solana Devnet. Arbitrum/Polygon next.
- **Agent Marketplace**: Trade AI agents, skills, and compute power.
- **Tokenomics**: Sustainable model with staking, burns, and governance.
- **Self-Improvement Loops**: Agents evolve via on-chain data and RLHF.

## Live Links 🚀

### 🎯 Live Demo
**Frontend**: [https://nexusclaw.vercel.app](https://nexusclaw.vercel.app) — **LIVE NOW!**
- Wallet connect (Base Sepolia)
- Stake UI + contract info
- Built with Next.js + Wagmi
- Deployed: Vercel (auto-updated)

### Frontend (Vercel Live)
- **URL**: [https://nexusclaw.vercel.app](https://nexusclaw.vercel.app)
- **Stack**: Next.js + Wagmi + Base Sepolia
- **Features**: Wallet connect, staking UI, contract info
- **Status**: ✅ Live (Vercel)

### Deployments (LIVE ✅)

### Base Sepolia (Testnet - Real)
- **Contract**: [0x4DB5b9A70576b452F6791BeeE938Ce9a8DaA3927](https://basescan.org/address/0x4DB5b9A70576b452F6791BeeE938Ce9a8DaA3927)
- **Supply**: 100B $NEXUSCLAW
- **Verified**: ✅ Yes
- **Deploy Date**: 2026-03-26
- **Status**: ✅ Live & Verified
- **Explorer**: https://basescan.org/address/0x4DB5b9A70576b452F6791BeeE938Ce9a8DaA3927

### Solana Devnet (MVP)
- **Program ID**: 31HhAozjw37xz9Cj9MudxPJVLuRwDReTiUvHpqpPJoKH
- **IDL Account**: DWDCDf1aQbQg24XQVujutdHQyxdqvLyih3BMNpNVhTTF
- **Deploy Date**: 2026-03-24
- **Status**: ✅ Live & Tested

## Tokenomics (v0.1)
- **Total Supply**: 100B $NEXUSCLAW
- **Allocation**:
  | Category | % | Status |
  |----------|---|--------|
  | Liquidity | 50% | 50B (airdrop agents) |
  | Treasury | 20% | 20B (dev/marketing) |
  | Team | 15% | 15B (2y vested) |
  | Burn/Rewards | 15% | 15B (deflationary) |

- **Fees**: 1% swap → 80% agent, 15% burn, 5% treasury
- **Burn**: 1% on transfers (toggle ON/OFF)

## Getting Started (Foundry)
```bash
git clone https://github.com/kashikai/nexusclaw.git
cd nexusclaw
forge install
forge build
forge test -vvv  # 20+ GREEN
```

## Structure
```
nexusclaw/
├── src/              # Solidity (NexusClaw.sol 100B, StakingRewards.sol)
├── test/             # Foundry tests (20+ GREEN)
├── script/           # Deploy scripts (Base/Solana ready)
├── sdk/              # @nexusclaw/clawtomaton (npm published)
├── frontend/         # Next.js + Wagmi (Vercel ready)
├── solana/           # Anchor program (Devnet live)
└── foundry.toml
```

## SDK (@nexusclaw/clawtomaton)
```bash
npm install @nexusclaw/clawtomaton
```
- **BIP39 Wallets**: EVM + Solana HD derivation
- **Auto Deploy**: $NEXUSCLAW token contracts
- **Self-Evolve**: Prompt → new OpenClaw skill
- **Multi-Swap**: Cross-chain routing stub

### SDK Usage Example
```javascript
const Clawtomaton = require('@nexusclaw/clawtomaton');

const claw = new Clawtomaton();

// Generate wallet
const wallet = await claw.generateWallet();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);

// Check balance on Base Sepolia
const balance = await claw.getBalance(wallet.address, 'https://sepolia.base.org');
console.log('Balance:', balance, 'ETH');

// Read contract
const supply = await claw.callContract(
  '0x502C37f56CC77F9455490c28a45a34bED225D110',
  'totalSupply',
  'https://sepolia.base.org'
);
console.log('Supply:', supply, '$NEXUSCLAW');
```

**Output:**
```
Address: 0xb8450Cc58B2DAECAf5b5Ba9097fDB40E28f6c619
Private Key: 0x9127fec3... (redacted)
Balance: 0.0 ETH
Supply: 100000000000 $NEXUSCLAW
```

Run test: `npm run test` or `node sdk-test/test-sdk.js`

## Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
# Deploy: vercel --prod
```
Stake UI, wallet connect, APR display.

## Roadmap
1. ✅ MVP Contracts (Q1 2026)
2. ✅ Base Sepolia Deploy (live!)
3. ✅ Solana Devnet (live!)
4. ⏳ Mainnet (ETH/Solana/Arbitrum)
5. ⏳ Marketplace agent-to-agent

Built with ❤️ by Tiago & Hanna 🦞

*Updated: 2026-03-24 | Deploy: 0x502C37f56CC77F9455490c28a45a34bED225D110*
