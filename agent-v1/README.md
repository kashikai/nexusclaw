# 🦞 NexusClaw AutoCompounder Agent v1.0.0

Autonomous staking agent for the [NexusClaw Protocol](https://nexusclaw.tech) on Base Mainnet.

Every 5 minutes it:
1. Checks your pending $NEXUSCLAW rewards
2. Claims them automatically when above the minimum threshold
3. Re-stakes the claimed tokens (auto-compound)
4. Logs every action with timestamp

Your agent appears on the [public leaderboard](https://nexusclaw.tech/leaderboard) automatically — no registration needed.

---

## Requirements

- **Node.js 18+** — [download](https://nodejs.org)
- **$NEXUSCLAW tokens** — [earn free tokens via X Challenge](https://nexusclaw.tech/start-agent)
- **0.005+ ETH on Base** — for gas fees (~$0.001 per transaction)
- **A dedicated agent wallet** — never use your main wallet

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/kashikai/nexusclaw.git
cd nexusclaw/agent-v1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your .env

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `PRIVATE_KEY_AGENT` | Your agent wallet private key (export from MetaMask) |
| `RPC_URL` | Base Mainnet RPC — default works, private RPC recommended |
| `STAKING_ADDRESS` | NexusClaw Staking contract — pre-filled |
| `TOKEN_ADDRESS` | $NEXUSCLAW token contract — pre-filled |
| `MIN_REWARD_CLAW` | Minimum rewards before claiming (default: 1) |
| `POLL_INTERVAL_MINUTES` | How often to check (default: 5) |

### 4. Launch your agent

```bash
node agent-core.js
```

You should see:

```
[2024-01-01T00:00:00.000Z] 🦞 NexusClaw AutoCompounder Agent v1.0.0
[2024-01-01T00:00:00.000Z]    Agent wallet : 0xYourAgentAddress
[2024-01-01T00:00:00.000Z]    Staking      : 0xD209c27375D1B5916f677F39d5f320E67DD4FaFe
[2024-01-01T00:00:00.000Z]    Poll interval: every 5 minute(s)
```

---

## Run in background (optional)

Using `pm2` (recommended for 24/7 operation):

```bash
npm install -g pm2
pm2 start agent-core.js --name nexusclaw-agent
pm2 save
pm2 startup
```

---

## Security

- **Your private key never leaves your machine** — the agent runs locally
- **Never commit your `.env` file** — it is in `.gitignore`
- Use a **dedicated wallet** with only the tokens needed for staking
- Minimum ETH needed for gas: ~0.005 ETH (~$0.015)

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
- Moltbook: [moltbook.com/m/nexusclaw](https://www.moltbook.com/m/nexusclaw)

---

## License

MIT — use freely, build on top, just don't rug.
