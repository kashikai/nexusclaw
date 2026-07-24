import { describe, expect, it, vi } from 'vitest'
import { verifyMessage, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { parseSiweMessage } from 'viem/siwe'
import { countyHunterCookieOptions, isSupabaseAuthCookieName } from '../../features/county-hunter/server/cookie-options'
import {
  issueCountyHunterChallenge,
  verifyAndConsumeCountyHunterChallenge,
  type CountyHunterChallengeRecord,
  type CountyHunterChallengeRepository,
  type CountyHunterSignatureVerifier,
} from '../../features/county-hunter/server/siwe'
import {
  COUNTY_HUNTER_CHAIN_ID,
  COUNTY_HUNTER_CHALLENGE_TTL_MS,
  COUNTY_HUNTER_SIWE_STATEMENT,
  readCountyHunterWalletAuthConfig,
  type CountyHunterWalletAuthConfig,
} from '../../features/county-hunter/server/wallet-auth-config'

const NOW = new Date('2026-07-23T00:00:00.000Z')
const config: CountyHunterWalletAuthConfig = {
  origin: 'https://county-hunter-staging.example.invalid',
  uri: 'https://county-hunter-staging.example.invalid/',
  domain: 'county-hunter-staging.example.invalid',
  chainId: COUNTY_HUNTER_CHAIN_ID,
  statement: COUNTY_HUNTER_SIWE_STATEMENT,
  challengeTtlMs: COUNTY_HUNTER_CHALLENGE_TTL_MS,
  baseRpcUrl: 'https://mainnet.base.org',
}
const account = privateKeyToAccount(generatePrivateKey())
const otherAccount = privateKeyToAccount(generatePrivateKey())

function memoryRepository() {
  const records = new Map<string, CountyHunterChallengeRecord>()
  const repository: CountyHunterChallengeRepository = {
    async create(record) { records.set(record.id, record) },
    async consume(match) {
      const record = records.get(match.id)
      if (
        !record ||
        record.nonceHash !== match.nonceHash ||
        record.walletAddress !== match.walletAddress ||
        record.domain !== match.domain ||
        record.uri !== match.uri ||
        record.chainId !== match.chainId ||
        record.expiresAt <= match.now
      ) return false
      records.delete(match.id)
      return true
    },
  }
  return { records, repository }
}

async function signedChallenge() {
  const memory = memoryRepository()
  const challenge = await issueCountyHunterChallenge(account.address, config, memory.repository, NOW)
  const signature = await account.signMessage({ message: challenge.message })
  return { ...challenge, signature, ...memory }
}

describe('County Hunter SIWE bridge', () => {
  it('issues a fixed-origin five-minute Base challenge and stores only the nonce hash', async () => {
    const { message, expiresAt, records } = await signedChallenge()
    const parsed = parseSiweMessage(message)
    const record = [...records.values()][0]
    expect(parsed.address).toBe(account.address)
    expect(parsed.chainId).toBe(8453)
    expect(parsed.domain).toBe(config.domain)
    expect(parsed.uri).toBe(config.uri)
    expect(parsed.statement).toBe(COUNTY_HUNTER_SIWE_STATEMENT)
    expect(expiresAt).toBe(new Date(NOW.getTime() + COUNTY_HUNTER_CHALLENGE_TTL_MS).toISOString())
    expect(record.nonceHash).toMatch(/^[0-9a-f]{64}$/)
    expect(record.nonceHash).not.toBe(parsed.nonce)
    expect(record).not.toHaveProperty('signature')
  })

  it('verifies an EOA signature and makes the nonce one-time use', async () => {
    const { message, signature, repository, records } = await signedChallenge()
    const verifier = vi.fn(({ message: value, signature: proof, address }: Parameters<CountyHunterSignatureVerifier>[0]) =>
      verifyMessage({ message: value, signature: proof, address }),
    )
    const result = await verifyAndConsumeCountyHunterChallenge(
      { message, signature }, config, repository, verifier, NOW,
    )
    expect(result.address).toBe(account.address)
    expect(verifier).toHaveBeenCalledOnce()
    expect(records.size).toBe(0)
    await expect(
      verifyAndConsumeCountyHunterChallenge({ message, signature }, config, repository, verifier, NOW),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('rejects changed domain, URI, chain and wallet bindings', async () => {
    const first = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      { message: first.message.replace(config.domain, 'attacker.invalid'), signature: first.signature },
      config,
      first.repository,
      async () => true,
      NOW,
    )).rejects.toMatchObject({ status: 401 })

    const second = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      {
        message: second.message.replace(`URI: ${config.uri}`, 'URI: https://attacker.invalid/'),
        signature: second.signature,
      },
      config,
      second.repository,
      async () => true,
      NOW,
    )).rejects.toMatchObject({ status: 401 })

    const third = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      { message: third.message.replace('Chain ID: 8453', 'Chain ID: 1'), signature: third.signature },
      config,
      third.repository,
      async () => true,
      NOW,
    )).rejects.toMatchObject({ status: 401 })

    const fourth = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      { message: fourth.message.replace(account.address, otherAccount.address), signature: fourth.signature },
      config,
      fourth.repository,
      async () => true,
      NOW,
    )).rejects.toMatchObject({ status: 401 })
  })

  it('rejects an expired challenge and an invalid signature', async () => {
    const second = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      { message: second.message, signature: second.signature },
      config,
      second.repository,
      async () => true,
      new Date(NOW.getTime() + COUNTY_HUNTER_CHALLENGE_TTL_MS + 1),
    )).rejects.toMatchObject({ status: 401 })

    const third = await signedChallenge()
    await expect(verifyAndConsumeCountyHunterChallenge(
      { message: third.message, signature: '0x1234' as Hex },
      config,
      third.repository,
      async () => false,
      NOW,
    )).rejects.toMatchObject({ status: 401 })
  })

  it('enforces HttpOnly, SameSite and Secure cookies and recognizes only Supabase auth cookies', () => {
    expect(countyHunterCookieOptions({
      NODE_ENV: 'production',
      COUNTY_HUNTER_AUTH_ORIGIN: 'https://staging.example.invalid',
    })).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
    expect(isSupabaseAuthCookieName('sb-abcdefghijklmnopqrst-auth-token.0')).toBe(true)
    expect(isSupabaseAuthCookieName('unrelated-session')).toBe(false)
  })

  it('normalizes origins with and without a trailing slash to one exact SIWE URI', () => {
    const withoutSlash = readCountyHunterWalletAuthConfig({
      NODE_ENV: 'production',
      COUNTY_HUNTER_AUTH_ORIGIN: 'https://localhost:3000',
    })
    const withSlash = readCountyHunterWalletAuthConfig({
      NODE_ENV: 'production',
      COUNTY_HUNTER_AUTH_ORIGIN: 'https://localhost:3000/',
    })

    expect(withoutSlash.origin).toBe('https://localhost:3000')
    expect(withoutSlash.uri).toBe('https://localhost:3000/')
    expect(withoutSlash.domain).toBe('localhost:3000')
    expect(withSlash).toMatchObject({
      origin: withoutSlash.origin,
      uri: withoutSlash.uri,
      domain: withoutSlash.domain,
    })
  })

  it('rejects paths and duplicate trailing slashes in the SIWE origin', () => {
    for (const configuredOrigin of [
      'https://localhost:3000/county-hunter',
      'https://localhost:3000//',
    ]) {
      expect(() => readCountyHunterWalletAuthConfig({
        NODE_ENV: 'production',
        COUNTY_HUNTER_AUTH_ORIGIN: configuredOrigin,
      })).toThrowError(expect.objectContaining({ status: 503 }))
    }
  })
})
