#!/usr/bin/env node

/**
 * Example: Multi-chain swap
 * 
 * Usage:
 *   PRIVATE_KEY=0x... node swap.js
 */

const Clawtomaton = require('../index.js');

async function main() {
  const privateKey = process.env.PRIVATE_KEY || '0x' + '1'.repeat(64);
  
  console.log('🦞 Executing multi-chain swap...\n');
  
  const claw = new Clawtomaton();
  
  try {
    // Example: USDC → WETH on Base Sepolia
    const result = await claw.swap('baseSepolia', privateKey, {
      tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      tokenOut: '0x4200000000000000000000000000000000000006', // WETH on Base
      amountIn: 100,
      slippage: 0.005 // 0.5%
    });
    
    console.log('✅ Swap simulation complete!\n');
    console.log('📋 Details:');
    console.log(`   Chain: ${result.chain}`);
    console.log(`   Route: ${result.tokenIn} → ${result.tokenOut}`);
    console.log(`   Amount In: ${result.amountIn}`);
    console.log(`   Amount Out: ${result.amountOut}`);
    console.log(`   Slippage: ${result.slippage}`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Status: ${result.status}\n`);
  } catch (err) {
    console.error(`❌ Swap failed: ${err.message}`);
    process.exit(1);
  }
}

main();
