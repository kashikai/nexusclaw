import { lookup as nodeLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isPrivateOrReservedIp } from '../network'
import { CountyHunterValidationError } from '../validation'

type LookupAddress = { address: string; family: number }
export type CountyHunterDnsLookup = (hostname: string) => Promise<LookupAddress[]>

const defaultLookup: CountyHunterDnsLookup = async (hostname) =>
  nodeLookup(hostname, { all: true, verbatim: true })

export async function validateCountyHunterOutboundUrl(
  value: string,
  lookup: CountyHunterDnsLookup = defaultLookup,
): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new CountyHunterValidationError('Outbound URL is invalid.')
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new CountyHunterValidationError('Outbound URL must use HTTPS without embedded credentials.')
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new CountyHunterValidationError('Outbound URL cannot target a local hostname.')
  }

  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname)
  if (!addresses.length || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new CountyHunterValidationError('Outbound URL resolved to a private or reserved address.')
  }

  return url
}

export async function fetchCountyHunterUrlSafely(
  value: string,
  options: {
    lookup?: CountyHunterDnsLookup
    fetcher?: typeof fetch
    maxRedirects?: number
  } = {},
): Promise<Response> {
  const fetcher = options.fetcher ?? fetch
  const maxRedirects = options.maxRedirects ?? 5
  let current = await validateCountyHunterOutboundUrl(value, options.lookup)

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetcher(current, { redirect: 'manual', cache: 'no-store' })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response

    if (redirects === maxRedirects) {
      throw new CountyHunterValidationError('Outbound URL exceeded the redirect limit.')
    }
    const location = response.headers.get('location')
    if (!location) throw new CountyHunterValidationError('Outbound redirect has no location.')
    current = await validateCountyHunterOutboundUrl(new URL(location, current).toString(), options.lookup)
  }

  throw new CountyHunterValidationError('Outbound URL validation failed.')
}
