#!/usr/bin/env node

/**
 * Example: Self-evolve - Create new skill via OpenClaw
 * 
 * Usage:
 *   node evolve.js "Describe your new skill..."
 */

const Clawtomaton = require('../index.js');

async function main() {
  const skillPrompt = process.argv[2] || 
    'Create a new skill for multi-chain arbitrage detection that monitors price gaps between DEXes';
  
  if (skillPrompt.length < 10) {
    console.error('❌ Skill prompt too short (min 10 chars)');
    process.exit(1);
  }
  
  console.log('🦞 Evolving new skill...\n');
  console.log(`📝 Prompt: ${skillPrompt}\n`);
  
  const claw = new Clawtomaton();
  
  try {
    const result = await claw.evolve(skillPrompt);
    
    console.log('✅ Skill evolved!\n');
    console.log('📋 Details:');
    console.log(`   Skill ID: ${result.skillId}`);
    console.log(`   Path: ${result.skillPath}`);
    console.log(`   Hash: ${result.evolveHash}`);
    console.log(`   Status: ${result.status}\n`);
    
    if (result.status === 'created') {
      console.log('🎉 New skill available in OpenClaw marketplace!');
    } else {
      console.log('⚠️  OpenClaw unavailable; skill simulated locally');
    }
  } catch (err) {
    console.error(`❌ Evolve failed: ${err.message}`);
    process.exit(1);
  }
}

main();
