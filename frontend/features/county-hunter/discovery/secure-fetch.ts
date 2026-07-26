import { createHash } from 'node:crypto'
import type { CountyHunterDnsLookup } from '../server/safe-url'
import { validateCountyHunterOutboundUrl } from '../server/safe-url'
import {
  COUNTY_HUNTER_DISCOVERY_USER_AGENT,
} from './constants'
import {
  CountyHunterDiscoveryError,
  type CountyHunterDiscoveryReasonCode,
} from './types'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const ALLOWED_RESPONSE_HEADERS = ['content-length', 'content-type', 'date', 'etag', 'last-modified'] as const

export type SecureDiscoveryFetchResult = {
  originalUrl: string
  finalUrl: string
  contentType: string
  bytes: Uint8Array
  hash: string
  fetchedAt: string
  headers: Record<string, string>
  redirects: number
}

type FetchOptions = {
  allowedHostnames: readonly string[]
  allowedContentTypes: readonly string[]
  maxBytes: number
  failureReason: CountyHunterDiscoveryReasonCode
  lookup?: CountyHunterDnsLookup
  fetcher?: typeof fetch
  timeoutMs?: number
  maxRedirects?: number
  now?: () => Date
}

function normalizedContentType(value: string | null): string {
  return value?.split(';', 1)[0].trim().toLowerCase() ?? ''
}

function validateExactHostname(url: URL, allowedHostnames: readonly string[]) {
  const hostname = url.hostname.toLowerCase()
  if (!allowedHostnames.some((allowed) => allowed.toLowerCase() === hostname)) {
    throw new CountyHunterDiscoveryError(
      'OFFICIAL_DOMAIN_MISMATCH',
      'The official source redirected to an unauthorized domain.',
      { reviewRequired: true },
    )
  }
  if (url.port || url.hash) {
    throw new CountyHunterDiscoveryError(
      'DOCUMENT_URL_REJECTED',
      'The official source URL contains a disallowed port or fragment.',
      { reviewRequired: true },
    )
  }
}

async function validateOfficialUrl(
  value: string,
  allowedHostnames: readonly string[],
  lookup?: CountyHunterDnsLookup,
): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new CountyHunterDiscoveryError(
      'DOCUMENT_URL_REJECTED',
      'The official source produced an invalid URL.',
      { reviewRequired: true },
    )
  }
  validateExactHostname(parsed, allowedHostnames)
  try {
    return await validateCountyHunterOutboundUrl(parsed.toString(), lookup)
  } catch (cause) {
    throw new CountyHunterDiscoveryError(
      'DOCUMENT_URL_REJECTED',
      'The official source URL failed the outbound network safety check.',
      { reviewRequired: true, cause },
    )
  }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new CountyHunterDiscoveryError(
      'CONTENT_TYPE_REJECTED',
      'The official source response exceeds the configured size limit.',
      { reviewRequired: true },
    )
  }

  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > maxBytes) {
      await reader.cancel()
      throw new CountyHunterDiscoveryError(
        'CONTENT_TYPE_REJECTED',
        'The official source response exceeded the configured size limit.',
        { reviewRequired: true },
      )
    }
    chunks.push(value)
  }

  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

export async function fetchDiscoveryResourceSafely(
  originalUrl: string,
  options: FetchOptions,
): Promise<SecureDiscoveryFetchResult> {
  const fetcher = options.fetcher ?? fetch
  const timeoutMs = options.timeoutMs ?? 15_000
  const maxRedirects = options.maxRedirects ?? 5
  const now = options.now ?? (() => new Date())
  let current = await validateOfficialUrl(originalUrl, options.allowedHostnames, options.lookup)

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetcher(current, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers: {
          Accept: options.allowedContentTypes.join(', '),
          'User-Agent': COUNTY_HUNTER_DISCOVERY_USER_AGENT,
        },
      })
    } catch (cause) {
      throw new CountyHunterDiscoveryError(
        options.failureReason,
        'The official source could not be fetched.',
        { cause },
      )
    } finally {
      clearTimeout(timeout)
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      if (redirects === maxRedirects) {
        throw new CountyHunterDiscoveryError(
          'DOCUMENT_URL_REJECTED',
          'The official source exceeded the redirect limit.',
          { reviewRequired: true },
        )
      }
      const location = response.headers.get('location')
      if (!location) {
        throw new CountyHunterDiscoveryError(
          'DOCUMENT_URL_REJECTED',
          'The official source returned a redirect without a destination.',
          { reviewRequired: true },
        )
      }
      current = await validateOfficialUrl(
        new URL(location, current).toString(),
        options.allowedHostnames,
        options.lookup,
      )
      continue
    }

    if (!response.ok) {
      throw new CountyHunterDiscoveryError(
        options.failureReason,
        'The official source returned an unsuccessful HTTP status.',
      )
    }

    const contentType = normalizedContentType(response.headers.get('content-type'))
    if (!options.allowedContentTypes.includes(contentType)) {
      throw new CountyHunterDiscoveryError(
        'CONTENT_TYPE_REJECTED',
        'The official source returned an unsupported content type.',
        { reviewRequired: true },
      )
    }
    const bytes = await readBoundedBody(response, options.maxBytes)
    const headers = Object.fromEntries(
      ALLOWED_RESPONSE_HEADERS.flatMap((name) => {
        const value = response.headers.get(name)
        return value ? [[name, value]] : []
      }),
    )

    return {
      originalUrl,
      finalUrl: current.toString(),
      contentType,
      bytes,
      hash: createHash('sha256').update(bytes).digest('hex'),
      fetchedAt: now().toISOString(),
      headers,
      redirects,
    }
  }

  throw new CountyHunterDiscoveryError(
    'DOCUMENT_URL_REJECTED',
    'The official source URL could not be validated.',
    { reviewRequired: true },
  )
}
