# 🦞 NexusClaw AutoCompounder Agent v1.0.0

Autonomous staking agent for the [NexusClaw Protocol](https://nexusclaw.tech) on Base Mainnet.

Every 5 minutes it:
1. Checks your pending $NEXUSCLAW rewards
2. Claims them automatically when above the minimum threshold
3. Re-stakes the claimed tokens (auto-compound)
4. Logs every action with timestamp

Your agent appears on the [public leaderboard](https://nexusclaw.tech/leaderboard) automatically.

---

## Requirements

| | |
|---|---|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **MetaMask** | [metamask.io](https://metamask.io) |
| **$NEXUSCLAW tokens** | [Earn free via X Challenge](https://nexusclaw.tech/start-agent) |
| **0.005+ ETH on Base** | For gas (~$0.001 per transaction) |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run the setup wizard
#    Checks your environment, generates .env, and guides you through launch
node setup.js

# 3. Open .env in a text editor and fill in your private key
#    (The wizard tells you exactly how to export it from MetaMask)

# 4. Launch your agent
node agent-core.js
```

---

## What the setup wizard does

`node setup.js` will automatically:

- ✓ Verify Node.js 18+ is installed
- ✓ Install all dependencies (`npm install`)
- ✓ Test your connection to Base Mainnet
- ✓ Generate your `.env` file from the template
- ✓ Show clear instructions for adding your private key

**Your private key is never requested by the wizard.**
You add it manually to `.env` in your own text editor — it never touches the script.

---

## Security

| Rule | Why |
|---|---|
| **Dedicated wallet only** | Isolate agent funds from your main wallet |
| **Never commit `.env`** | Already in `.gitignore` — double-check before any push |
| **Never share your private key** | Anyone with it controls the agent wallet |
| **Minimum ETH needed** | ~0.005 ETH covers weeks of gas at $0.001/tx |

Your private key stays on your machine. The agent calls the NexusClaw contracts directly — no intermediary server.

---

## Run 24/7 with pm2 (optional)

```bash
npm install -g pm2
pm2 start agent-core.js --name nexusclaw-agent
pm2 save
pm2 startup
```

---

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| $NEXUSCLAW Token | [0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6](https://basescan.org/address/0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6) |
| Staking | [0xD209c27375D1B5916f677F39d5f320E67DD4FaFe](https://basescan.org/address/0xD209c27375D1B5916f677F39d5f320E67DD4FaFe) |

---

## Get $NEXUSCLAW

Complete the **X Challenge** at [nexusclaw.tech/start-agent](https://nexusclaw.tech/start-agent) to receive 1,000 $NEXUSCLAW for free.

---

## Links

- Website: [nexusclaw.tech](https://nexusclaw.tech)
- Leaderboard: [nexusclaw.tech/leaderboard](https://nexusclaw.tech/leaderboard)
- X: [@nexusclawbot](https://x.com/nexusclawbot)
- Telegram: [t.me/nexusclaw](https://t.me/nexusclaw)

---

## License

MIT — use freely, build on top, just don't rug.
