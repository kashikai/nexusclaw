export function formatToken(wei: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const whole = Number(wei / divisor)
  const frac = wei % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 2)
  const cleanFrac = fracStr.replace(/0+$/, '')
  if (cleanFrac === '' || cleanFrac === '0') return whole.toLocaleString('en-US')
  return `${whole.toLocaleString('en-US')}.${cleanFrac}`
}

export function formatTokenShort(wei: bigint): string {
  const number = Number(wei) / 1e18
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
  if (number >= 1_000) return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return number.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export function formatBalance(wei: bigint): string {
  return formatToken(wei)
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
