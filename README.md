# NexusClaw 🦞

## Overview
NexusClaw is a multi-chain crypto project revolutionizing agent-to-agent marketplaces and self-improving AI ecosystems. Built for scalability across EVM-compatible chains, with focus on tokenomics, risk mitigation, and maximum fees capture.

### Key Features
- **Multi-Chain Deployment**: Live on Base Sepolia, Solana Devnet. Arbitrum/Polygon next.
- **Agent Marketplace**: Trade AI agents, skills, and compute power.
- **Tokenomics**: Sustainable model with staking, burns, and governance.
- **Self-Improvement Loops**: Agents evolve via on-chain data and RLHF.

## Deployments (LIVE ✅)

### Base Sepolia (Real Network)
- **Contract**: [0x502C37f56CC77F9455490c28a45a34bED225D110](https://sepolia.basescan.org/address/0x502c37f56cc77f9455490c28a45a34bed225d110)
- **Supply**: 100B $NEXUSCLAW
- **Treasury Alloc**: 10B (10%)
- **Verified**: ✅ Pass
- **Block**: 39293607

### Solana Devnet (MVP)
- **Program ID**: 31HhAozjw37xz9Cj9MudxPJVLuRwDReTiUvHpqpPJoKH
- **IDL Account**: DWDCDf1aQbQg24XQVujutdHQyxdqvLyih3BMNpNVhTTF

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
