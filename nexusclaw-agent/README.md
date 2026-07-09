# NexusClaw AutoCompounder Agent v1 🦞

Autonomous staking rewards compounder for NEXUSCLAW protocol.

## 🚀 Features

- ✅ Automatic claim of staking rewards
- ✅ Automatic restaking (compound)
- ✅ Gas optimization checks
- ✅ Reward threshold validation
- ✅ Comprehensive logging
- ✅ Error handling & recovery

## 📋 Prerequisites

- Node.js >= 18.0.0
- Private key for agent wallet (DO NOT use main wallet)
- Access to Base Mainnet or Base Sepolia RPC

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

### Environment Variables

1. **Mainnet Setup** (Production):
```bash
cp .env.example .env
# Edit .env with mainnet contracts and keys
```

2. **Sepolia Testnet Setup**:
```bash
cp .env.sepolia .env
# .env.sepolia already configured with testnet values
# Staking address: TBD (add to .env.sepolia)
# Token address: TBD (add to .env.sepolia)
```

### Config File

Edit `config/agent.config.js`:

```javascript
network: {
  name: 'base-mainnet',  // or 'base-sepolia'
  chainId: 8453,         // 8453 for mainnet, 84532 for sepolia
  rpcUrl: 'https://mainnet.base.org',  // or 'https://sepolia.base.org'
},

contracts: {
  staking: '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe',  // Mainnet
  token: '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6',
},

strategy: {
  minRewardClaw: '50',
  maxOperationClaw: '500',
  gasMarginMultiplier: 2,
  minEthBalance: 0.001,  // in ETH
},
```

## 🏃 Running

### Mainnet (Production)

```bash
node agent-core.js
```

### Sepolia (Testnet)

```bash
cp .env.sepolia .env
node agent-core.js
```

## 📁 Structure

```
nexusclaw-agent/
├── agent-core.js      # Main agent logic
├── config/
│   └── agent.config.js  # Configuration
├── utils/
│   └── logger.js       # Logging utilities
├── abis/
│   ├── staking.json    # Staking contract ABI
│   └── token.json      # Token contract ABI
├── logs/              # Agent logs (auto-created)
├── .env              # Environment variables (keep secret!)
├── .env.example      # Environment template
├── .env.sepolia      # Sepolia testnet config
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Testing (Sepolia)

### 1. Get Testnet ETH
- Base Sepolia Faucet: https://sepolia.base.org/faucet

### 2. Get Testnet Tokens
- TBD: Token distribution method

### 3. Test Configuration
```bash
cd nexusclaw-agent
node agent-core.js  # Test connection to Sepolia RPC
```

### 4. Check Logs
```bash
tail -f logs/agent.log
```

## 🛡️ Security

- **NEVER** use main wallet private key
- **NEVER** commit `.env` to git (already in .gitignore)
- **ALWAYS** test with Sepolia before Mainnet
- **ALWAYS** verify gas costs before executing
- **CONSIDER** hardware wallet for production

## 📊 Performance

- **Poll Interval**: Configurable (default: 5 minutes)
- **Min Gas Price**: 500 Gwei (prevents spikes)
- **Gas Margin**: 2x multiplier (safety buffer)
- **Error Recovery**: Max 5 consecutive errors before shutdown

## 📝 Logging

Logs are written to `logs/agent.log` with:
- Structured JSON format
- Colored console output
- Transaction details
- Profitability metrics
- Error tracking

## ⚠️ TODO

- [ ] Add support for multiple chain deployments
- [ ] Implement price oracle integration
- [ ] Add support for gas fee optimization
- [ ] Add support for custom staking strategies
- [ ] Add support for multi-agent orchestration