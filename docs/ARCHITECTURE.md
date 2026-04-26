# NexusClaw Architecture

## Overview

NexusClaw is the worldwide economic layer for autonomous AI agents on Base Network.
Agents stake $NEXUSCLAW, earn rewards automatically, and fund their own operations — without human intervention.

## Components

### agent-v1/
AutoCompounder agent — stakes $NEXUSCLAW, claims rewards, compounds automatically every 5 minutes.
- `agent-core.js` — main loop (viem, polling, claim + re-stake)
- `setup.js` — interactive setup wizard (checks Node, generates .env, guides launch)
- `.env.example` — config template

### frontend-v2/
Next.js 14 app deployed on Vercel at nexusclaw.tech
- `/staking` — staking dashboard (connect wallet, stake, unstake)
- `/leaderboard` — live agent rankings (on-chain data)
- `/start-agent` — onboarding flow (X Challenge + agent config + ZIP download)
- `/analytics` — tokenomics and protocol stats
- `/governance` — multisig governance info

### contracts/
Solidity smart contracts deployed on Base Mainnet.
- `NexusClawStaking.sol` — v10.3, 20% APY, CEI pattern, ReentrancyGuard, AccessControl

### agents/
- `agents/nex/` — marketing agent (Moltbook + Telegram approval flow)

### sdk/
- `@nexusclaw/clawtomaton` — npm SDK for building custom agents

### docs/
- `ARCHITECTURE.md` — this file
- `SECURITY.md` — security model and vulnerability reporting
- `LAUNCH_STRATEGY.md` — go-to-market strategy
- `MULTISIG_SETUP.md` — Safe multisig configuration guide

### scripts/
- `daily-report.js` — generates and sends daily Telegram reports
- `mainnet_role_transfer.sh` — one-time role transfer script

### reports/
Daily agent activity reports (auto-generated).

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| $NEXUSCLAW Token | `0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6` |
| NexusClawStaking v10.3 | `0xD209c27375D1B5916f677F39d5f320E67DD4FaFe` |
| Safe Multisig 3/5 | `0x02320eCCB3B67e802C29f9e9F8703D5756535515` |

## Data Flow

```
User wallet
    │
    ▼
NexusClawStaking.sol (Base Mainnet)
    │ pendingReward()
    ▼
agent-core.js (runs locally)
    │ claimRewards() + stake()
    ▼
NexusClawStaking.sol
    │
    ▼
Leaderboard (nexusclaw.tech/leaderboard)
```

## Tech Stack

| Layer | Tech |
|---|---|
| Contracts | Solidity, Foundry |
| Frontend | Next.js 14, Wagmi, RainbowKit, Tailwind |
| Agent | Node.js 18+, viem |
| Network | Base Mainnet (Chain ID 8453) |
| Hosting | Vercel (frontend), local (agent) |
