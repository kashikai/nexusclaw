#!/usr/bin/env node

/**
 * Example: Generate multi-chain wallet
 */

const Clawtomaton = require('../index.js');

async function main() {
  console.log('🦞 Generating multi-chain wallet...\n');
  
  const claw = new Clawtomaton();
  
  // Generate new wallet
  const wallet = claw.generateWallet();
  
  console.log('📝 Seed Phrase (KEEP SAFE):');
  console.log(`   ${wallet.mnemonic}\n`);
  
  console.log('🔗 EVM (Ethereum/Base):');
  console.log(`   Address:    ${wallet.evm.address}`);
  console.log(`   PrivateKey: ${wallet.evm.privateKey}\n`);
  
  console.log('🪙 Solana (Devnet):');
  console.log(`   Address: ${wallet.solana.address}`);
  console.log(`   PublicKey: ${wallet.solana.publicKey}\n`);
  
  console.log('✅ Wallet ready for multi-chain operations!');
}

main().catch(console.error);
