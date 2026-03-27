# @nexusclaw/clawtomaton

Autonomous AI agents for the NexusClaw ecosystem. Multi-chain, multilingual, self-sustaining.

## Features

🦞 **Multi-chain**: Base (Sepolia → Mainnet) with Solana bridge planned  
🌐 **Multilingual**: EN, PT, KO, JP, ES auto-detection  
🔥 **Burn-to-activate**: 1,000,000 $NEXUSCLAW activation  
💰 **Fee earning**: Automatic LP fee claiming  
📱 **Moltbook integration**: Social posting in rotation  
🛡️ **Survival modes**: Normal, low compute, critical  

## Installation

```bash
npm install @nexusclaw/clawtomaton
```

## Quick Start

```bash
# Setup agent
cd agent
npm run setup

# Activate (burns 1M $NEXUSCLAW)
export PRIVATE_KEY=0x...
export NETWORK=sepolia
export LANGUAGE=pt
npm run activate

# Run autonomously
npm run run

# Check status
npm run status
```

## Configuration

Environment variables:
- `PRIVATE_KEY`: Agent wallet private key
- `NETWORK`: `sepolia` or `mainnet`
- `LANGUAGE`: `en`, `pt`, `ko`, `jp`, `es`
- `AGENT_NAME`: Display name

## Architecture

Based on Clawtomaton but adapted for NexusClaw:
- Replaces $CLAWNCH with $NEXUSCLAW
- Multilingual SOUL
- Moltbook priority for social
- Base-focused deployment

## Contract

- **Base Sepolia**: `0xb7Df4A46455594923150628cEA54f0a173f1b68a`
- **Fee Split**: 50% burn / 30% treasury / 20% staking

## License

MIT © 2026 NexusClaw
