export function formatToken(wei: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const whole = wei / divisor
  const frac = wei % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4)
  return `${whole.toLocaleString()}.${fracStr}`
}

export function formatTokenShort(wei: bigint): string {
  const number = Number(wei) / 1e18
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`
  if (number >= 1) return number.toFixed(2)
  return number.toFixed(4)
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
