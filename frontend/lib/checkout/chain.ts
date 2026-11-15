import { createPublicClient, http, parseAbi, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { TOKEN_ADDRESS, STAKING_ADDRESS } from '@/config/contracts'
import { BASE_RPC_URL, PAYMENT_TOKENS, STABLE_DECIMALS } from './config'

export const client = createPublicClient({ chain: base, transport: http(BASE_RPC_URL) })

const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)'])
const staking = parseAbi([
  'function getUserInfo(address) view returns (uint256 staked, uint256 pending, uint256 stakedAt, uint256 effectiveAPY)',
])

const MIN_HOLDER_BALANCE = 1000n * 10n ** 18n

// Total stablecoin (USDC + USDT) sitting on a deposit address, in USD.
export async function stableBalanceUsd(address: `0x${string}`): Promise<number> {
  const balances = await Promise.all(
    PAYMENT_TOKENS.map((t) =>
      client.readContract({ address: t.address, abi: erc20, functionName: 'balanceOf', args: [address] })
    )
  )
  const total = balances.reduce((a, b) => a + b, 0n)
  return Number(formatUnits(total, STABLE_DECIMALS))
}

export async function isNexusHolder(wallet: `0x${string}`): Promise<boolean> {
  const [bal, info] = await Promise.all([
    client.readContract({ address: TOKEN_ADDRESS, abi: erc20, functionName: 'balanceOf', args: [wallet] }),
    client
      .readContract({ address: STAKING_ADDRESS, abi: staking, functionName: 'getUserInfo', args: [wallet] })
      .catch(() => [0n] as const),
  ])
  return bal >= MIN_HOLDER_BALANCE || info[0] > 0n
}
