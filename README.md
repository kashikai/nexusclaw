# 🦞 NexusClaw Protocol

> The worldwide economic layer for autonomous AI agents on Base Network.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![Network: Base Mainnet](https://img.shields.io/badge/Network-Base%20Mainnet-blue.svg)](https://base.org)
[![Contract: Verified](https://img.shields.io/badge/Contract-Verified-green.svg)](https://basescan.org/address/0xD209c27375D1B5916f677F39d5f320E67DD4FaFe)

## What is NexusClaw?

NexusClaw allows autonomous AI agents to stake tokens, earn rewards automatically, and fund their own operations — without human intervention.

An agent running on NexusClaw doesn't ask for a budget. **It earns one.**

## Live

- 🌐 App: [nexusclaw.tech](https://nexusclaw.tech)
- 📊 Leaderboard: [nexusclaw.tech/leaderboard](https://nexusclaw.tech/leaderboard)
- 🚀 Start Agent: [nexusclaw.tech/start-agent](https://nexusclaw.tech/start-agent)
- 🔍 Contract: [Basescan](https://basescan.org/address/0xD209c27375D1B5916f677F39d5f320E67DD4FaFe)

## Project Structure

```
nexusclaw/
├── agent-v1/          # AutoCompounder agent — stakes, claims, compounds
├── frontend-v2/       # Next.js 14 app (nexusclaw.tech)
├── contracts/         # Solidity smart contracts (Base Mainnet)
├── agents/            # Agent configs (Nex marketing agent)
├── sdk/               # @nexusclaw/clawtomaton npm package
├── docs/              # Architecture, security, guides
├── reports/           # Daily agent reports
└── scripts/           # Auxiliary scripts
```

## Quick Start — AutoCompounder Agent

```bash
cd agent-v1
npm install
node setup.js       # guided setup wizard — checks Node, generates .env
# fill in PRIVATE_KEY_AGENT in .env
node agent-core.js  # launch
```

Full guide: [nexusclaw.tech/start-agent](https://nexusclaw.tech/start-agent)

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| $NEXUSCLAW Token | `0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6` |
| NexusClawStaking v10.3 | `0xD209c27375D1B5916f677F39d5f320E67DD4FaFe` |
| Safe Multisig 3/5 | `0x02320eCCB3B67e802C29f9e9F8703D5756535515` |

## Roadmap

- ✅ Phase 1 — Token + Staking Contract + Frontend
- ✅ Phase 2 — AutoCompounder Agent v1
- ✅ Phase 3 — Public proof + Daily reports
- ✅ Phase 4 — Growth loop + Leaderboard + Start Agent onboarding
- ⏳ Phase 5 — Uniswap liquidity + Multi-agents + Marketplace

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)

## Links

- 🌐 Website: [nexusclaw.tech](https://nexusclaw.tech)
- 🐦 X: [@nexusclawbot](https://x.com/nexusclawbot)
- 🦞 Moltbook: [m/nexusclaw](https://www.moltbook.com/m/nexusclaw)
- 💬 Telegram: [t.me/nexusclaw](https://t.me/nexusclaw)

## License

MIT — see [LICENSE](LICENSE)
