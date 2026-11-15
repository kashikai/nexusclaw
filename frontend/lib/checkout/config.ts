// Server-side checkout config (never import from client components).

export const PRICE_USD = 49.9
export const HOLDER_PRICE_USD = 39.9

// Stablecoins accepted on Base (both 6 decimals, verified on-chain).
export const PAYMENT_TOKENS = [
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' },
] as const

export const STABLE_DECIMALS = 6
export const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

export function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}
