/**
 * NexusClaw AutoCompounder Agent v1.0.0
 * ======================================
 * Autonomous staking agent for the NexusClaw Protocol on Base Mainnet.
 *
 * What it does:
 *  - Polls the staking contract every POLL_INTERVAL_MINUTES
 *  - If pending rewards >= MIN_REWARD_CLAW, claims them automatically
 *  - Re-stakes the claimed rewards (auto-compound)
 *  - Logs every action with timestamp
 *
 * Requirements: Node.js >= 18
 * Setup: copy .env.example → .env, fill in your values, then: node agent-core.js
 */

import { createPublicClient, createWalletClient, http, formatUnits, isAddress, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const {
  RPC_URL = 'https://mainnet.base.org',
  PRIVATE_KEY_AGENT,
  STAKING_ADDRESS,
  TOKEN_ADDRESS,
  MIN_REWARD_CLAW = '1',
  POLL_INTERVAL_MINUTES = '5',
} = process.env;

function requireAddress(name, value) {
  if (!value) throw new Error(`${name} is required in .env`);
  if (!isAddress(value)) throw new Error(`${name} must be a valid EVM address`);
}

function requirePrivateKey(value) {
  if (!value) throw new Error('PRIVATE_KEY_AGENT is required in .env');
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('PRIVATE_KEY_AGENT must be a 0x-prefixed 32-byte hex private key');
  }
}

function parsePositiveInteger(name, value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number(value);
}

function parseRewardThreshold(value) {
  try {
    const threshold = parseUnits(value, 18);
    if (threshold <= 0n) throw new Error('threshold must be greater than zero');
    return threshold;
  } catch (err) {
    throw new Error(`MIN_REWARD_CLAW must be a positive token amount: ${err.message}`);
  }
}

requirePrivateKey(PRIVATE_KEY_AGENT);
requireAddress('STAKING_ADDRESS', STAKING_ADDRESS);
requireAddress('TOKEN_ADDRESS', TOKEN_ADDRESS);

const POLL_MS  = parsePositiveInteger('POLL_INTERVAL_MINUTES', POLL_INTERVAL_MINUTES) * 60 * 1000;
const MIN_WEI  = parseRewardThreshold(MIN_REWARD_CLAW);
const account  = privateKeyToAccount(PRIVATE_KEY_AGENT);

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const STAKING_ABI = [
  { inputs: [{ name: 'user', type: 'address' }], name: 'pendingReward',  outputs: [{ type: 'uint256' }], stateMutability: 'view',        type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'stakes',         outputs: [{ name: 'amount', type: 'uint256' }, { name: 'stakedAt', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [],                                   name: 'claimRewards',   outputs: [],                    stateMutability: 'nonpayable',  type: 'function' },
  { inputs: [{ name: 'amount', type: 'uint256' }], name: 'stake',         outputs: [],                    stateMutability: 'nonpayable',  type: 'function' },
  { inputs: [],                                   name: 'totalStakers',   outputs: [{ type: 'uint256' }], stateMutability: 'view',        type: 'function' },
  { inputs: [],                                   name: 'totalStaked',    outputs: [{ type: 'uint256' }], stateMutability: 'view',        type: 'function' },
];

const TOKEN_ABI = [
  { inputs: [{ name: 'account', type: 'address' }],                            name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view',       type: 'function' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve',   outputs: [{ type: 'bool' }],    stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ type: 'uint256' }], stateMutability: 'view',       type: 'function' },
];

// ─── Clients ──────────────────────────────────────────────────────────────────

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: base, transport: http(RPC_URL), account });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function fmt(wei) {
  return parseFloat(formatUnits(wei, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ─── Core loop ────────────────────────────────────────────────────────────────

async function tick() {
  log('━━━ Polling ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Read pending reward
    const pending = await publicClient.readContract({
      address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'pendingReward', args: [account.address],
    });
    log(`Pending reward: ${fmt(pending)} $NEXUSCLAW  (min threshold: ${MIN_REWARD_CLAW})`);

    if (pending < MIN_WEI) {
      log('Below threshold — skipping cycle.');
      return;
    }

    // 2. Claim rewards
    log('Claiming rewards...');
    const claimHash = await walletClient.writeContract({
      address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards', args: [],
    });
    log(`Claim tx: ${claimHash}`);
    await publicClient.waitForTransactionReceipt({ hash: claimHash });
    log('Claim confirmed.');

    // 3. Check token balance
    const balance = await publicClient.readContract({
      address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'balanceOf', args: [account.address],
    });
    log(`Token balance after claim: ${fmt(balance)} $NEXUSCLAW`);

    if (balance === 0n) {
      log('Balance is 0 after claim — nothing to re-stake.');
      return;
    }

    // 4. Approve staking contract if needed
    const allowance = await publicClient.readContract({
      address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'allowance', args: [account.address, STAKING_ADDRESS],
    });

    if (allowance < balance) {
      log(`Approving ${fmt(balance)} $NEXUSCLAW for staking contract...`);
      const approveHash = await walletClient.writeContract({
        address: TOKEN_ADDRESS, abi: TOKEN_ABI, functionName: 'approve', args: [STAKING_ADDRESS, balance],
      });
      log(`Approve tx: ${approveHash}`);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      log('Approve confirmed.');
    }

    // 5. Re-stake (auto-compound)
    log(`Re-staking ${fmt(balance)} $NEXUSCLAW...`);
    const stakeHash = await walletClient.writeContract({
      address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [balance],
    });
    log(`Stake tx: ${stakeHash}`);
    await publicClient.waitForTransactionReceipt({ hash: stakeHash });
    log(`✅ Auto-compound complete — staked ${fmt(balance)} $NEXUSCLAW`);

    // 6. Print updated position
    const [staked] = await publicClient.readContract({
      address: STAKING_ADDRESS, abi: STAKING_ABI, functionName: 'stakes', args: [account.address],
    });
    log(`Total staked position: ${fmt(staked)} $NEXUSCLAW`);

  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main() {
  log('🦞 NexusClaw AutoCompounder Agent v1.0.0');
  log(`   Agent wallet : ${account.address}`);
  log(`   Staking      : ${STAKING_ADDRESS}`);
  log(`   Token        : ${TOKEN_ADDRESS}`);
  log(`   Min reward   : ${MIN_REWARD_CLAW} $NEXUSCLAW`);
  log(`   Poll interval: every ${POLL_INTERVAL_MINUTES} minute(s)`);
  log('');

  // Initial check
  await tick();

  // Recurring loop
  setInterval(tick, POLL_MS);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
