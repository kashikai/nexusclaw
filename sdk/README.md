# @nexusclaw/clawtomaton

**NexusClaw SDK v0.2.0+ MVP** 🦞

Multi-chain agent wallet, token deploy, self-evolve, and multi-swap framework for the NexusClaw ecosystem.

## Features ✨

- **BIP39 Multi-Chain Wallets**: Generate HD wallets supporting EVM (Base, Ethereum) and Solana
- **Auto Token Deploy**: Deploy $NEXUSCLAW contracts with a single call
- **Self-Evolve**: Generate new skills via OpenClaw `/evolve` endpoint
- **Multi-Swap**: Token swaps across chains (Uniswap V2/V3, BaseSwap)
- **Chain Support**: Base Sepolia, Solana Devnet (extensible)

## Installation

```bash
npm install @nexusclaw/clawtomaton
```

or from repo:

```bash
cd sdk
npm install
```

## Quick Start

### 1. Generate a Wallet

```javascript
const Clawtomaton = require('@nexusclaw/clawtomaton');

const claw = new Clawtomaton();
const wallet = claw.generateWallet();

console.log('Mnemonic:', wallet.mnemonic);
console.log('EVM Address:', wallet.evm.address);
console.log('Solana Address:', wallet.solana.address);
```

### 2. Deploy $NEXUSCLAW Token

```javascript
const result = await claw.deployToken(
  'baseSepolia',
  wallet.evm.privateKey,
  '0xTreasuryAddress'
);

console.log('Token deployed at:', result.address);
console.log('TX Hash:', result.txHash);
```

### 3. Self-Evolve (Create New Skill)

```javascript
const skill = await claw.evolve(
  'Create a new arbitrage detection skill for multi-chain DEX monitoring'
);

console.log('Skill ID:', skill.skillId);
console.log('Skill Path:', skill.skillPath);
```

### 4. Perform Multi-Swap

```javascript
const swap = await claw.swap('baseSepolia', wallet.evm.privateKey, {
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',  // USDC
  tokenOut: '0x4200000000000000000000000000000000000006',   // WETH on Base
  amountIn: 100,
  slippage: 0.005  // 0.5%
});

console.log('Swapped:', swap.amountIn, '→', swap.amountOut);
console.log('TX Hash:', swap.txHash);
```

## API Reference

### `new Clawtomaton(options)`

Create a new Clawtomaton instance.

**Options:**
- `baseRpc` (string): Base Sepolia RPC URL
- `solanaRpc` (string): Solana Devnet RPC URL

```javascript
const claw = new Clawtomaton({
  baseRpc: 'https://sepolia.base.org',
  solanaRpc: 'https://api.devnet.solana.com'
});
```

### `generateWallet(mnemonic?)`

Generate a multi-chain wallet from BIP39 seed phrase.

**Returns:**
```json
{
  "mnemonic": "word1 word2 ... word12",
  "evm": {
    "privateKey": "0x...",
    "address": "0x...",
    "viemAccount": { ... }
  },
  "solana": {
    "privateKey": "0x...",
    "publicKey": "...",
    "address": "..."  // Base58 encoded
  },
  "seed": "..."
}
```

### `deployToken(chainKey, privateKey, treasury, bytecodeJson?)`

Deploy $NEXUSCLAW token contract.

**Parameters:**
- `chainKey` (string): `'baseSepolia'` or `'solanaDev'`
- `privateKey` (string): Deployer's private key
- `treasury` (string): Treasury address (receives initial supply)
- `bytecodeJson` (object): Optional compiled bytecode from `forge build`

**Returns:**
```json
{
  "address": "0x...",
  "txHash": "0x...",
  "chainId": 84532,
  "chain": "baseSepolia",
  "treasury": "0x...",
  "status": "deployed"
}
```

### `evolve(skillPrompt, opencrawUrl?)`

Create a new skill via OpenClaw API or local simulation.

**Parameters:**
- `skillPrompt` (string): Description of new skill (min 10 chars)
- `opencrawUrl` (string): OpenClaw API endpoint (default: `http://localhost:3333`)

**Returns:**
```json
{
  "skillId": "skill_1710280400...",
  "skillPath": "/skills/skill_1710280400.../SKILL.md",
  "evolveHash": "abc123...",
  "prompt": "Create a new...",
  "status": "created" | "simulated"
}
```

### `swap(chainKey, privateKey, swapParams)`

Execute a token swap on DEX.

**Parameters:**
- `chainKey` (string): `'baseSepolia'`
- `privateKey` (string): Swapper's private key
- `swapParams` (object):
  - `tokenIn` (string): Input token address
  - `tokenOut` (string): Output token address
  - `amountIn` (number): Amount in (natural units)
  - `slippage` (number): Slippage tolerance (default: 0.005 = 0.5%)

**Returns:**
```json
{
  "txHash": "0x...",
  "amountIn": "100",
  "amountOut": "95",
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "route": ["0x...", "0x..."],
  "slippage": "0.50%",
  "chainId": 84532,
  "chain": "baseSepolia",
  "status": "simulated" | "confirmed"
}
```

### `getBalance(chainKey, address)`

Get wallet balance on chain.

**Returns:**
```json
{
  "address": "0x...",
  "balance": "1.5",
  "chainId": 84532,
  "chain": "baseSepolia",
  "unit": "ETH"
}
```

### `listChains()`

List all supported chains.

**Returns:**
```json
[
  {
    "name": "baseSepolia",
    "id": 84532,
    "rpc": "https://sepolia.base.org",
    "shortName": "base-sepolia"
  },
  { ... }
]
```

## Examples

See `examples/` directory:

- `wallet-gen.js` - Generate new wallet
- `deploy-base.js` - Deploy token to Base Sepolia
- `evolve.js` - Create new skill
- `swap.js` - Perform token swap

Run examples:

```bash
# Generate wallet
node examples/wallet-gen.js

# Deploy token (requires env vars)
PRIVATE_KEY=0x... TREASURY=0x... node examples/deploy-base.js

# Create skill
node examples/evolve.js "Your skill prompt..."

# Simulate swap
node examples/swap.js
```

## Testing

Run full test suite:

```bash
npm run test:all
```

Output:
```
🦞 Clawtomaton MVP Test Suite

✅ Initialize Clawtomaton
✅ Generate BIP39 wallet
✅ Generate wallet with custom mnemonic
...
📊 Results: 13 passed, 0 failed
```

## Roadmap

- [x] BIP39 wallet generation (EVM + Solana)
- [x] Token deploy with bytecode injection
- [x] Self-evolve endpoint integration
- [x] Multi-swap simulation
- [x] Test suite (13/13 ✅)
- [ ] Solana Anchor integration
- [ ] On-chain swap execution
- [ ] DEX aggregation (0x, 1inch)
- [ ] Agent marketplace bidding

## Security ⚠️

**This is MVP code for testnet use only.**

- Never hardcode private keys in production
- Use environment variables or secure key management
- Test thoroughly on testnet before mainnet
- Review smart contracts with professional auditors

## Contributing

PRs welcome! Issues & discussions in repo.

## License

MIT © 2026 Tiago & Hanna 🦞

---

**Built for NexusClaw ecosystem** 
**v0.2.0-mvp | Updated 2026-03-12**
