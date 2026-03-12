#!/usr/bin/env node

/**
 * Example: Deploy $NEXUSCLAW token to Base Sepolia
 * 
 * Usage:
 *   PRIVATE_KEY=0x... TREASURY=0x... node deploy-base.js
 */

const Clawtomaton = require('../index.js');

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const treasury = process.env.TREASURY;
  
  if (!privateKey || !treasury) {
    console.error('❌ Missing env vars: PRIVATE_KEY, TREASURY');
    process.exit(1);
  }
  
  console.log('🦞 Deploying $NEXUSCLAW to Base Sepolia...\n');
  
  const claw = new Clawtomaton();
  
  try {
    const result = await claw.deployToken('baseSepolia', privateKey, treasury);
    
    console.log('✅ Deployment successful!\n');
    console.log('📋 Details:');
    console.log(`   Token Address: ${result.address}`);
    console.log(`   Treasury: ${result.treasury}`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Chain: ${result.chain}`);
    console.log(`   Status: ${result.status}\n`);
    
    console.log('🔗 Verify on Basescan:');
    console.log(`   https://sepolia.basescan.org/address/${result.address}`);
  } catch (err) {
    console.error(`❌ Deploy failed: ${err.message}`);
    process.exit(1);
  }
}

main();
