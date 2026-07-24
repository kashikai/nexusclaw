import { createHash, randomUUID } from 'node:crypto'
import { getAddress, isAddress, type Address, type Hex } from 'viem'
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe'
import { CountyHunterHttpError } from './http-error'
import type { CountyHunterWalletAuthConfig } from './wallet-auth-config'

export type CountyHunterChallengeRecord = {
  id: string
  nonceHash: string
  walletAddress: string
  domain: string
  uri: string
  chainId: number
  expiresAt: string
  createdAt: string
}

export type CountyHunterChallengeMatch = Omit<
  CountyHunterChallengeRecord,
  'expiresAt' | 'createdAt'
> & { now: string }

export type CountyHunterChallengeRepository = {
  create(record: CountyHunterChallengeRecord): Promise<void>
  consume(match: CountyHunterChallengeMatch): Promise<boolean>
}

export type CountyHunterSignatureVerifier = (parameters: {
  message: string
  signature: Hex
  address: Address
  domain: string
  nonce: string
  now: Date
}) => Promise<boolean>

function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce, 'utf8').digest('hex')
}

export async function issueCountyHunterChallenge(
  addressInput: string,
  config: CountyHunterWalletAuthConfig,
  repository: CountyHunterChallengeRepository,
  now = new Date(),
): Promise<{ message: string; expiresAt: string }> {
  if (!isAddress(addressInput)) {
    throw new CountyHunterHttpError('A valid Ethereum wallet address is required.', 400)
  }

  const address = getAddress(addressInput)
  const nonce = generateSiweNonce()
  const requestId = randomUUID()
  const expirationTime = new Date(now.getTime() + config.challengeTtlMs)
  const message = createSiweMessage({
    address,
    chainId: config.chainId,
    domain: config.domain,
    uri: config.uri,
    version: '1',
    nonce,
    issuedAt: now,
    expirationTime,
    requestId,
    statement: config.statement,
  })

  await repository.create({
    id: requestId,
    nonceHash: hashNonce(nonce),
    walletAddress: address.toLowerCase(),
    domain: config.domain,
    uri: config.uri,
    chainId: config.chainId,
    expiresAt: expirationTime.toISOString(),
    createdAt: now.toISOString(),
  })

  return { message, expiresAt: expirationTime.toISOString() }
}

export async function verifyAndConsumeCountyHunterChallenge(
  input: { message: unknown; signature: unknown },
  config: CountyHunterWalletAuthConfig,
  repository: CountyHunterChallengeRepository,
  verifySignature: CountyHunterSignatureVerifier,
  now = new Date(),
): Promise<{ message: string; signature: Hex; address: Address }> {
  if (
    typeof input.message !== 'string' ||
    input.message.length < 1 ||
    input.message.length > 4096 ||
    typeof input.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(input.signature) ||
    input.signature.length > 2048
  ) {
    throw new CountyHunterHttpError('The wallet authentication proof is invalid.', 400)
  }

  const parsed = parseSiweMessage(input.message)
  if (
    !parsed.address ||
    !isAddress(parsed.address) ||
    !parsed.requestId ||
    !parsed.nonce ||
    !parsed.issuedAt ||
    !parsed.expirationTime ||
    parsed.domain !== config.domain ||
    parsed.uri !== config.uri ||
    parsed.chainId !== config.chainId ||
    parsed.version !== '1' ||
    parsed.statement !== config.statement ||
    !/^[0-9a-f-]{36}$/i.test(parsed.requestId)
  ) {
    throw new CountyHunterHttpError('The wallet authentication challenge is invalid.', 401)
  }

  const earliestIssuedAt = now.getTime() - config.challengeTtlMs
  const latestIssuedAt = now.getTime() + 30_000
  const issuedAt = parsed.issuedAt.getTime()
  const expirationTime = parsed.expirationTime.getTime()
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expirationTime) ||
    issuedAt < earliestIssuedAt ||
    issuedAt > latestIssuedAt ||
    expirationTime <= now.getTime() ||
    expirationTime > issuedAt + config.challengeTtlMs
  ) {
    throw new CountyHunterHttpError('The wallet authentication challenge has expired.', 401)
  }

  const address = getAddress(parsed.address)
  const signature = input.signature as Hex
  const verified = await verifySignature({
    message: input.message,
    signature,
    address,
    domain: config.domain,
    nonce: parsed.nonce,
    now,
  }).catch(() => false)
  if (!verified) {
    throw new CountyHunterHttpError('The wallet signature is invalid.', 401)
  }

  const consumed = await repository.consume({
    id: parsed.requestId,
    nonceHash: hashNonce(parsed.nonce),
    walletAddress: address.toLowerCase(),
    domain: config.domain,
    uri: config.uri,
    chainId: config.chainId,
    now: now.toISOString(),
  })
  if (!consumed) {
    throw new CountyHunterHttpError('The wallet authentication challenge is expired or was already used.', 401)
  }

  return { message: input.message, signature, address }
}
