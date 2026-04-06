# NexusClaw AutoCompounder Agent v1 🦞

Autonomous staking rewards compounder for NEXUSCLAW protocol.

## 🚀 Features

- ✅ Automatic claim of staking rewards
- ✅ Automatic restaking
- ✅ Gas optimization checks
- ✅ Reward threshold validation
- ✅ Comprehensive logging
- ✅ Error handling & recovery

## 📋 Prerequisites

- Node.js >= 18.0.0
- Private key for agent wallet (DO NOT use main wallet)
- Access to Base Mainnet RPC

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`
2. Update configuration:
   - `RPC_URL`: Base Mainnet RPC endpoint
   - `PRIVATE_KEY_AGENT`: Agent wallet private key
   - `STAKING_ADDRESS`: NEXUSCLAW Staking contract
   - `TOKEN_ADDRESS`: NEXUSCLAW Token contract
   - `MIN_REWARD_CLAW`: Minimum reward to claim
   - `MAX_OPERATION_CLAW`: Maximum stake amount
   - `POLL_INTERVAL_MINUTES`: Check interval

## 🏃 Running

```bash
npm start
```

## 📁 Structure

- `agent-core.js` - Main agent logic
- `config/agent.config.js` - Configuration
- `utils/logger.js` - Logging utilities
- `abis/staking.json` - Staking contract ABI
- `abis/token.json` - Token contract ABI
- `logs/agent.log` - Agent logs

## ⚠️ Security

- Never use main wallet private key
- Consider hardware wallet for production
- Review all code before running with real funds
