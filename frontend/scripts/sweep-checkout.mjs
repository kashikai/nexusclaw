// Move paid-order funds from the per-order deposit addresses to your treasury.
//   MNEMONIC="..." GAS_PRIVATE_KEY=0x... TREASURY=0x... \
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/sweep-checkout.mjs [--dry]
// Run locally, never on the server. GAS_PRIVATE_KEY is a small hot wallet holding a
// little ETH on Base: deposit addresses have no gas, so it tops them up first.
import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from 'viem'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const { MNEMONIC, GAS_PRIVATE_KEY, TREASURY, NEXT_PUBLIC_SUPABASE_URL: SUPA, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env
const DRY = process.argv.includes('--dry')
for (const [k, v] of Object.entries({ MNEMONIC, GAS_PRIVATE_KEY, TREASURY, SUPA, KEY })) {
  if (!v) throw new Error(`Missing ${k}`)
}

const TOKENS = [
  ['USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
  ['USDT', '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'],
]
const erc20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
])
const transport = http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
const pub = createPublicClient({ chain: base, transport })
const gasWallet = createWalletClient({ account: privateKeyToAccount(GAS_PRIVATE_KEY), chain: base, transport })
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const res = await fetch(`${SUPA}/rest/v1/crypto_orders?status=eq.paid&swept_at=is.null&select=id,idx,address`, { headers })
const orders = await res.json()
console.log(`${orders.length} order(s) to sweep${DRY ? ' (dry run)' : ''}`)

for (const o of orders) {
  // Same path as the server derivation: m/44'/60'/0'/0/idx
  const account = mnemonicToAccount(MNEMONIC, { accountIndex: 0, addressIndex: Number(o.idx) })
  if (account.address.toLowerCase() !== o.address.toLowerCase()) {
    console.error(`#${o.idx}: derived ${account.address} != stored ${o.address}, skipping`)
    continue
  }
  const owner = createWalletClient({ account, chain: base, transport })
  const transfers = []
  for (const [sym, addr] of TOKENS) {
    const bal = await pub.readContract({ address: addr, abi: erc20, functionName: 'balanceOf', args: [o.address] })
    if (bal > 0n) transfers.push({ sym, addr, bal })
  }
  if (!transfers.length) continue
  console.log(`#${o.idx} ${o.address}: ${transfers.map((t) => `${t.sym} ${t.bal}`).join(', ')}`)
  if (DRY) continue

  const ethBal = await pub.getBalance({ address: o.address })
  if (ethBal < parseEther('0.00005')) {
    const h = await gasWallet.sendTransaction({ to: o.address, value: parseEther('0.00005') })
    await pub.waitForTransactionReceipt({ hash: h })
  }
  for (const t of transfers) {
    const h = await owner.writeContract({ address: t.addr, abi: erc20, functionName: 'transfer', args: [TREASURY, t.bal] })
    await pub.waitForTransactionReceipt({ hash: h })
    console.log(`  swept ${t.sym}: ${h}`)
  }
  await fetch(`${SUPA}/rest/v1/crypto_orders?id=eq.${o.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ swept_at: new Date().toISOString() }),
  })
}
