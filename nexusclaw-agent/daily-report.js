#!/usr/bin/env node
/**
 * NexusClaw Daily Report Generator
 * Runs daily at 09:00 JST
 * Generates report and sends to Telegram
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

// Config
const STAKING_ADDRESS = process.env.STAKING_ADDRESS;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const AGENT_ADDRESS = process.env.AGENT_ADDRESS;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID;
const REPORTS_DIR = path.join(__dirname, 'reports');

// ABIs
const stakingAbi = [
  { "type": "function", "name": "totalStaked", "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "rewardPool", "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "getPendingRewards", "inputs": [{ "type": "address" }], "outputs": [{ "type": "uint256" }] }
];
const tokenAbi = [
  { "type": "function", "name": "balanceOf", "inputs": [{ "type": "address" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "decimals", "outputs": [{ "type": "uint8" }] }
];

// Parse agent log for stats
function parseAgentStats() {
  const logPath = path.join(__dirname, 'logs', 'agent.log');
  if (!fs.existsSync(logPath)) {
    return { cycles: 0, totalClaimed: '0', totalCompounded: '0', totalGasSpent: '0', runtimeMinutes: 0 };
  }
  
  const logContent = fs.readFileSync(logPath, 'utf-8');
  const lines = logContent.split('\n');
  
  let stats = { cycles: 0, totalClaimed: '0', totalCompounded: '0', totalGasSpent: '0', runtimeMinutes: 0, lastUpdate: null };
  
  for (const line of lines) {
    // Match cycle completed
    const cycleMatch = line.match(/"cycles":(\d+).*"runtimeMinutes":(\d+)/);
    if (cycleMatch) {
      stats.cycles = parseInt(cycleMatch[1]);
      stats.runtimeMinutes = parseInt(cycleMatch[2]);
    }
    
    // Match total stats
    const claimedMatch = line.match(/"totalClaimedCLAW":"([^"]+)"/);
    const compoundedMatch = line.match(/"totalCompoundedCLAW":"([^"]+)"/);
    const gasMatch = line.match(/"totalGasSpentETH":"([^"]+)"/);
    
    if (claimedMatch) stats.totalClaimed = claimedMatch[1];
    if (compoundedMatch) stats.totalCompounded = compoundedMatch[1];
    if (gasMatch) stats.totalGasSpent = gasMatch[1];
    
    // Last timestamp
    const tsMatch = line.match(/^.*"timestamp":"([^"]+)"/);
    if (tsMatch) stats.lastUpdate = tsMatch[1];
  }
  
  return stats;
}

// Format number with commas
function formatNumber(num, decimals = 2) {
  const n = parseFloat(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Get on-chain data
async function getOnChainData() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_URL || 'https://base-mainnet.public.blastapi.io')
  });
  
  const [totalStaked, rewardPool, tokenDecimals] = await Promise.all([
    publicClient.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStaked' }),
    publicClient.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'rewardPool' }),
    publicClient.readContract({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'decimals' })
  ]);
  
  return {
    totalStaked: formatNumber(totalStaked / BigInt(10 ** tokenDecimals)),
    rewardPool: formatNumber(rewardPool / BigInt(10 ** tokenDecimals)),
    tokenDecimals
  };
}

// Send Telegram message
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TIAGO_CHAT_ID, text: message, parse_mode: 'Markdown' })
  });
  return response.ok;
}

// Generate report markdown
function generateReport(stats, onChain) {
  const today = new Date().toISOString().split('T')[0];
  const runtimeHours = Math.floor(stats.runtimeMinutes / 60);
  const runtimeDays = (stats.runtimeMinutes / 60 / 24).toFixed(1);
  
  // Calculate ROI (assuming initial stake of 971.16 CLAW)
  const initialStake = 971.16;
  const currentStake = parseFloat(onChain.totalStaked.replace(/,/g, ''));
  const compounded = parseFloat(stats.totalCompounded);
  const roi = currentStake > 0 ? ((currentStake - initialStake + compounded) / initialStake * 100) : 0;
  
  return `# 📊 NexusClaw Daily Report — ${today}

## 🤖 Agent Status
| Metric | Value |
|--------|-------|
| Status | 🟢 Online |
| Runtime | ${runtimeHours}h (${runtimeDays} days) |
| Cycles Executed | ${stats.cycles.toLocaleString()} |
| Last Update | ${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : 'N/A'} |

## 💰 Staking Metrics
| Metric | Value |
|--------|-------|
| Total Staked | ${onChain.totalStaked} $NEXUSCLAW |
| Reward Pool | ${onChain.rewardPool} $NEXUSCLAW |

## 📈 Performance
| Metric | Value |
|--------|-------|
| Total Claimed | ${formatNumber(stats.totalClaimed)} CLAW |
| Total Compounded | ${formatNumber(stats.totalCompounded)} CLAW |
| Gas Spent | ${parseFloat(stats.totalGasSpent).toFixed(6)} ETH |
| ROI (est.) | ${roi.toFixed(2)}% |

## 🔗 Links
- 🌐 Frontend: https://nexusclaw.vercel.app
- 🔍 BaseScan: https://basescan.org/address/${STAKING_ADDRESS}
- 📊 Token: https://basescan.org/address/${TOKEN_ADDRESS}

---
*Report generated by NexusClaw Agent v1 • ${new Date().toISOString()}*
`;
}

// Main
async function main() {
  console.log('📊 Generating Daily Report...');
  
  try {
    // Parse stats from logs
    const stats = parseAgentStats();
    console.log('Stats parsed:', stats);
    
    // Get on-chain data
    const onChain = await getOnChainData();
    console.log('On-chain data:', onChain);
    
    // Generate report
    const report = generateReport(stats, onChain);
    
    // Save report
    const today = new Date().toISOString().split('T')[0];
    const reportPath = path.join(REPORTS_DIR, `daily-${today}.md`);
    fs.writeFileSync(reportPath, report);
    console.log('Report saved:', reportPath);
    
    // Send to Telegram
    const telegramMsg = `📊 *NexusClaw Daily Report — ${today}*

🤖 Agent: 🟢 Online
⏱ Runtime: ${Math.floor(stats.runtimeMinutes / 60)}h
🔄 Cycles: ${stats.cycles.toLocaleString()}

💰 Total Staked: ${onChain.totalStaked} $NEXUSCLAW
📈 Compounded: ${formatNumber(stats.totalCompounded)} CLAW
⛽ Gas: ${parseFloat(stats.totalGasSpent).toFixed(6)} ETH

🔗 https://nexusclaw.vercel.app`;

    await sendTelegram(telegramMsg);
    console.log('Telegram sent!');
    
    console.log('✅ Daily Report complete!');
    return { success: true, reportPath };
    
  } catch (error) {
    console.error('❌ Report failed:', error.message);
    return { success: false, error: error.message };
  }
}

main().then(r => process.exit(r.success ? 0 : 1));
