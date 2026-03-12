# NexusClaw 🦞

## Overview
NexusClaw is a multi-chain crypto project revolutionizing agent-to-agent marketplaces and self-improving AI ecosystems. Built for scalability across EVM-compatible chains, with focus on tokenomics, risk mitigation, and maximum fees capture.

### Key Features
- **Multi-Chain Deployment**: Seamless bridging and operations on ETH, BSC, Polygon, etc.
- **Agent Marketplace**: Trade AI agents, skills, and compute power.
- **Tokenomics**: Sustainable model with staking, burns, and governance.
- **Self-Improvement Loops**: Agents evolve via on-chain data and RLHF.

## Tokenomics Draft (v0.1)
- **Total Supply**: 50B $CLAW (50_000_000_000 * 10**18)
- **Allocation**:
  | Category | % | Vesting |
  |----------|---|---------|
  | Liquidity | 20% | - |
  | Team | 15% | 24m cliff + linear |
  | Ecosystem | 25% | 12m linear |
  | Staking Rewards | 20% | Ongoing |
  | Marketing | 10% | 6m linear |
  | Advisors | 5% | 18m linear |
  | Airdrop/Community | 5% | Immediate |

- **Fees Capture**: 0.5% tx fee split: 50% burn, 30% staking rewards, 20% treasury.
- **Risks**: Impermanent loss mitigation via dynamic AMM, oracle security.

## Getting Started (Foundry)
```bash
git clone https://github.com/kashikai/nexusclaw.git
cd nexusclaw
forge install
forge build
forge test
```

## Structure (Foundry)
```
nexusclaw/
├── src/          # Solidity smart contracts (NexusClaw.sol)
├── test/         # Foundry tests (4/4 PASS)
├── script/       # Deploy scripts
├── lib/          # Dependencies (forge-std, OZ)
├── foundry.toml  # Config
└── README.md
```

## Roadmap
1. MVP Contracts (Q1 2026)
2. Testnet Launch (Q2)
3. Mainnet + DEX Listing (Q3)
4. Agent Marketplace Beta (Q4)

## Current Status (Day 1)
- Foundry setup green
- ERC20 contract compiled & tested (4/4 tests passing)
- Next: Deploy testnet on Base Sepolia + Anchor init for Solana side

Built with ❤️ by Tiago & Hanna 🦞

*Updated: 2026-03-12*
