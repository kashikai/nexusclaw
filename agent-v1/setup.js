#!/usr/bin/env node
/**
 * NexusClaw Agent v1 — Setup Wizard
 *
 * Verifies environment, installs deps, tests connection, generates .env.
 * Your private key is NEVER requested or handled by this script.
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';
const DIM    = '\x1b[2m';

const ok   = (msg) => console.log(`  ${GREEN}✓${RESET}  ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET}  ${msg}`);
const fail = (msg) => console.log(`  ${RED}✗${RESET}  ${msg}`);
const hr   = ()    => console.log(`  ${DIM}${'─'.repeat(52)}${RESET}`);
const step = (n, total, msg) =>
  console.log(`\n${BOLD}[${n}/${total}]${RESET} ${msg}`);

async function run() {
  console.clear();
  console.log(`\n${CYAN}${BOLD}  ╔════════════════════════════════════════════════╗`);
  console.log(`  ║     🦞  NexusClaw Agent v1 — Setup Wizard     ║`);
  console.log(`  ╚════════════════════════════════════════════════╝${RESET}\n`);

  const TOTAL = 5;

  // ── 1. Node.js version ────────────────────────────────────────────────────
  step(1, TOTAL, 'Checking Node.js version...');
  const ver   = process.versions.node;
  const major = parseInt(ver.split('.')[0]);
  if (major < 18) {
    fail(`Node.js 18+ required. You have ${ver}.`);
    console.log(`\n  Download it at: ${CYAN}https://nodejs.org${RESET}\n`);
    process.exit(1);
  }
  ok(`Node.js ${ver}`);

  // ── 2. Install dependencies ───────────────────────────────────────────────
  step(2, TOTAL, 'Installing dependencies...');
  try {
    execSync('npm install --silent', { stdio: 'pipe' });
    ok('viem + dotenv installed');
  } catch {
    fail('npm install failed. Check your internet connection and try again.');
    process.exit(1);
  }

  // ── 3. Test Base Mainnet connection ───────────────────────────────────────
  step(3, TOTAL, 'Testing Base Mainnet connection...');
  try {
    const client = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });
    const block = await client.getBlockNumber();
    ok(`Connected — latest block #${block.toLocaleString()}`);
  } catch {
    fail('Could not reach Base Mainnet. Check your internet connection.');
    process.exit(1);
  }

  // ── 4. Generate .env ──────────────────────────────────────────────────────
  step(4, TOTAL, 'Generating .env file...');
  if (existsSync('.env')) {
    warn('.env already exists — keeping it (not overwritten)');
  } else if (!existsSync('.env.example')) {
    fail('.env.example not found. Re-download the agent package from nexusclaw.tech/start-agent');
    process.exit(1);
  } else {
    writeFileSync('.env', readFileSync('.env.example', 'utf8'));
    ok('.env created from .env.example');
  }

  // ── 5. Instructions ───────────────────────────────────────────────────────
  step(5, TOTAL, 'Final steps to launch your agent:\n');
  hr();
  console.log(`
  ${BOLD}Step 1 — Create a dedicated MetaMask wallet${RESET}
  ${DIM}Open MetaMask → click your account icon → Create new account
  Name it something like "NexusClaw Agent"${RESET}
  ${RED}${BOLD}Never use your main wallet.${RESET}

  ${BOLD}Step 2 — Switch to Base Mainnet${RESET}
  ${DIM}MetaMask → Networks → Base Mainnet
  Not listed? Add it at ${CYAN}chainlist.org${RESET}${DIM} (search "Base")${RESET}

  ${BOLD}Step 3 — Fund your agent wallet${RESET}
  ${DIM}Send $NEXUSCLAW tokens + at least 0.005 ETH
  to your new agent wallet address on Base Mainnet${RESET}

  ${BOLD}Step 4 — Add your private key to .env${RESET}
  ${DIM}Open ${CYAN}.env${RESET}${DIM} in any text editor and replace the placeholder:${RESET}
  ${YELLOW}  PRIVATE_KEY_AGENT=0xYOUR_PRIVATE_KEY_HERE${RESET}

  ${DIM}To export from MetaMask:
  Account menu → ⋮ → Account Details → Export Private Key${RESET}

  ${BOLD}Step 5 — Launch your agent${RESET}
  ${GREEN}  node agent-core.js${RESET}
`);
  hr();
  console.log(`
  ${RED}${BOLD}⚠  Security reminders${RESET}
  ${DIM}• Your private key never leaves this machine
  • Never share your .env file with anyone
  • .gitignore already prevents .env from being committed
  • Only fund the dedicated agent wallet — not your main wallet${RESET}
`);
  hr();
  console.log(`\n  ${GREEN}${BOLD}Setup complete.${RESET}`);
  console.log(`  Run: ${GREEN}${BOLD}node agent-core.js${RESET}\n`);
}

run().catch((e) => {
  console.error(`\n${RED}Unexpected error:${RESET}`, e.message);
  process.exit(1);
});
