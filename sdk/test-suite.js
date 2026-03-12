#!/usr/bin/env node

/**
 * Clawtomaton Test Suite (MVP)
 * Tests: wallet generation, token deploy, self-evolve, multi-swap
 */

const Clawtomaton = require('./index.js');
const bip39 = require('bip39');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🦞 Clawtomaton MVP Test Suite\n');
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// ============= TESTS =============

test('Initialize Clawtomaton', () => {
  const claw = new Clawtomaton();
  if (!claw.chains) throw new Error('Chains not initialized');
  if (!claw.chains.baseSepolia) throw new Error('Base Sepolia not configured');
  if (!claw.chains.solanaDev) throw new Error('Solana Devnet not configured');
});

test('Generate BIP39 wallet', () => {
  const claw = new Clawtomaton();
  const wallet = claw.generateWallet();
  
  if (!wallet.mnemonic) throw new Error('No mnemonic');
  if (!bip39.validateMnemonic(wallet.mnemonic)) throw new Error('Invalid mnemonic');
  if (!wallet.evm.address) throw new Error('No EVM address');
  if (!wallet.evm.privateKey) throw new Error('No EVM private key');
  if (!wallet.solana.address) throw new Error('No Solana address');
});

test('Generate wallet with custom mnemonic', () => {
  const claw = new Clawtomaton();
  const mnemonic = bip39.generateMnemonic();
  const wallet = claw.generateWallet(mnemonic);
  
  if (wallet.mnemonic !== mnemonic) throw new Error('Mnemonic mismatch');
  if (!wallet.evm.address) throw new Error('No EVM address');
});

test('Reject invalid mnemonic', () => {
  const claw = new Clawtomaton();
  try {
    claw.generateWallet('invalid mnemonic phrase that is not real');
    throw new Error('Should have rejected invalid mnemonic');
  } catch (err) {
    if (!err.message.includes('Invalid')) throw err;
  }
});

test('Wallet consistency (same mnemonic = same keys)', () => {
  const claw1 = new Clawtomaton();
  const claw2 = new Clawtomaton();
  const mnemonic = bip39.generateMnemonic();
  
  const wallet1 = claw1.generateWallet(mnemonic);
  const wallet2 = claw2.generateWallet(mnemonic);
  
  if (wallet1.evm.address !== wallet2.evm.address) {
    throw new Error('EVM addresses differ');
  }
  if (wallet1.solana.address !== wallet2.solana.address) {
    throw new Error('Solana addresses differ');
  }
});

test('List supported chains', () => {
  const claw = new Clawtomaton();
  const chains = claw.listChains();
  
  if (!Array.isArray(chains)) throw new Error('Chains not array');
  if (chains.length < 2) throw new Error('Missing chains');
  
  const baseChain = chains.find(c => c.name === 'baseSepolia');
  if (!baseChain) throw new Error('Base Sepolia not in list');
  if (!baseChain.rpc) throw new Error('Base Sepolia missing RPC');
});

test('Evolve: Prompt validation', async () => {
  const claw = new Clawtomaton();
  try {
    await claw.evolve('short'); // Too short
    throw new Error('Should reject short prompt');
  } catch (err) {
    if (!err.message.includes('at least 10 characters')) throw err;
  }
});

test('Evolve: Generate skill (simulated)', async () => {
  const claw = new Clawtomaton();
  const result = await claw.evolve('Create a new multi-chain arbitrage skill for detecting price gaps', 'http://localhost:0');
  
  if (!result.skillId) throw new Error('No skill ID');
  if (!result.skillPath) throw new Error('No skill path');
  if (!result.prompt) throw new Error('Prompt not stored');
  if (result.status !== 'simulated') throw new Error('Expected simulated status (OpenClaw unavailable)');
});

test('Swap params validation', async () => {
  const claw = new Clawtomaton();
  try {
    await claw.swap('baseSepolia', '0x' + '1'.repeat(64), {
      tokenIn: '0xETH',
      // Missing tokenOut
      amountIn: 1.5
    });
    throw new Error('Should validate swap params');
  } catch (err) {
    if (!err.message.includes('Missing required')) throw err;
  }
});

test('Swap: Simulate transaction', async () => {
  const claw = new Clawtomaton();
  const result = await claw.swap('baseSepolia', '0x' + '1'.repeat(64), {
    tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    tokenOut: '0x4200000000000000000000000000000000000006', // WETH on Base
    amountIn: 100,
    slippage: 0.005
  });
  
  if (!result.txHash) throw new Error('No tx hash');
  if (!result.amountOut) throw new Error('No amount out');
  if (result.chainId !== 84532) throw new Error('Wrong chain ID');
  if (result.status !== 'simulated') throw new Error('Expected simulated status');
});

test('Get deployment info (none yet)', () => {
  const claw = new Clawtomaton();
  const dep = claw.getDeployment('baseSepolia');
  if (dep !== null) throw new Error('Should return null before deploy');
});

test('Validate chain support', async () => {
  const claw = new Clawtomaton();
  try {
    await claw.swap('unsupportedChain', '0x1234', {
      tokenIn: '0xA',
      tokenOut: '0xB',
      amountIn: 1
    });
    throw new Error('Should reject unknown chain');
  } catch (err) {
    if (!err.message.includes('Unknown chain')) throw err;
  }
});

test('Initialize with custom RPC URLs', () => {
  const customRpc = 'https://custom.rpc.endpoint';
  const claw = new Clawtomaton({
    baseRpc: customRpc,
    solanaRpc: customRpc
  });
  
  if (claw.chains.baseSepolia.rpc !== customRpc) {
    throw new Error('Custom Base RPC not set');
  }
});

// Run all tests
runTests();
