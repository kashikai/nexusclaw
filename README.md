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

## Agent Office (`/agent-office`)

An isometric live view of the Polyagent team (Scanner, Analyst, Executor, Reporter). It is a pure render of one JSON file: nothing on the page moves unless that file says an agent is working.

**How it works**

- `frontend/app/agent-office/AgentOfficeContent.tsx` polls the public state every 60 s via `lib/agent-office/useOfficeState.ts`.
- `lib/agent-office/validate.ts` parses it: unknown fields are dropped, and the whole file is rejected if the raw text contains anything that looks like a secret (0x addresses/hashes, 64-char hex, 30+ digit ids, PEM keys, `private_key`/`passphrase`/`mnemonic`/`api_secret`).
- If `updated_at` is older than 3 hours the page shows **Data stale** and renders every agent as idle and gray.
- `mode: "dry_run"` shows a non-dismissible **DRY RUN, simulated, no real funds** banner; `live` shows a red one.
- Win rate is hidden behind "insufficient data (n resolved)" until `resolved_trades >= 20`. Gains and losses use the same size, only the colour differs.
- Scene: plain SVG + CSS (`components/agent-office/`), no new dependencies. Narrow screens get a card list instead of the scene. Animations are off under `prefers-reduced-motion`.
- Strings live in `lib/agent-office/strings.ts` (EN default, PT via `?lang=pt`).

**JSON contract** (`/public_state.json`)

```json
{
  "updated_at": "ISO8601",
  "mode": "dry_run | live",
  "survival_tier": "normal | cautious | low_compute | critical",
  "agents": [
    { "id": "scanner | analyst | executor | reporter", "status": "idle | working | error",
      "label": "max 60 chars", "last_event_at": "ISO8601" }
  ],
  "portfolio": {
    "total_pnl_usd": 0, "daily_pnl_usd": 0, "total_trades": 0, "resolved_trades": 0,
    "win_rate": null, "open_positions": 0, "profits_transferred_usd": 0
  },
  "recent_events": [{ "ts": "ISO8601", "agent": "scanner | analyst | executor | reporter | system", "text": "max 140 chars" }]
}
```

Never put private keys, wallet addresses, order details or market ids of open positions in this file — the page will refuse to render it.

**Mock vs real data**

- In `next dev` the page defaults to `public/agent-office/public_state.mock.json` (scenarios `idle`, `working`, `error`, `stale`; timestamps are rebased to "now" on load). A dev-only panel switches scenarios; `?source=mock:error` or `?source=live` also works.
- Production builds always read the real file from `NEXT_PUBLIC_AGENT_OFFICE_STATE_URL` (default `/public_state.json`). A cross-origin URL must send CORS headers; Supabase Storage public objects do.

**Real data: the Polyagent exporter**

The exporter lives next to the bot, outside this repo: `agents/polyagent/export_public_state.py` (logic in `agents/polyagent/public_export/`, tests in `agents/polyagent/tests/`). It only reads the bot's `logs/agent.log` and `logs/portfolio_state.json`; it never writes to them and never touches trading.

- **Delayed:** it publishes the state as of *now − 15 min* (`AGENT_OFFICE_DELAY_MINUTES`). Anything logged after that cutoff is invisible.
- **Aggregated:** portfolio numbers come from the bot's own `PORTFOLIO SUMMARY` log blocks, so they match the bot's reports. Resolved trades and win rate come from `Position closed` lines since the ledger was last started fresh.
- **Sanitized:** every published string comes from a fixed template. Raw log text, market ids, trade ids, prices, sizes and addresses are never copied. The analyst's bubble can name the market it is analyzing, except markets with an open position. Before publishing, the whole file is scanned with the same forbidden patterns as the frontend validator, and nothing is published if one matches.
- **Status rules:** an agent is `working` while it has an unfinished task and the log is alive (an unfinished task with more than 10 min of log silence does not count), or if it logged activity in the 2 min before the cutoff. `error` stays until that agent starts its next task. `updated_at` is the time of the bot's last log line, so a stopped bot goes stale after 3 h.
- **Mode:** `live` if `DRY_RUN = False` in the bot config, or if anything live (CLOB client, live order, treasury transfer) was logged since the ledger was last started fresh. Otherwise `dry_run`.

Setup with Supabase Storage:

1. In Supabase Storage, create a **public** bucket named `agent-office`.
2. On the bot machine, set `AGENT_OFFICE_SUPABASE_URL` (project URL) and `AGENT_OFFICE_SUPABASE_KEY` (service role or `sb_secret_` key). The key stays on that machine and is never written into the JSON.
3. Next to the bot, run `python export_public_state.py --loop`. It rebuilds every 60 s and uploads only when something changed.
4. In Vercel, set `NEXT_PUBLIC_AGENT_OFFICE_STATE_URL=https://<project>.supabase.co/storage/v1/object/public/agent-office/public_state.json` and redeploy. `NEXT_PUBLIC_` variables are inlined at build time.

Local check: `python export_public_state.py --print` shows what would be published. `--out <repo>/frontend/public/public_state.json` feeds a local `next dev` (that path is gitignored), and the page's "Live file" source reads it.

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
