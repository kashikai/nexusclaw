/**
 * Normalize the configured authentication origin into the two EIP-4361 values:
 * a pathless canonical origin and an exact redirect URI with one trailing slash.
 *
 * @param {string} configuredOrigin
 * @param {{ allowHttpLocalhost?: boolean }} [options]
 * @returns {{ origin: string, uri: string, domain: string }}
 */
export function normalizeCountyHunterSiweOrigin(
  configuredOrigin,
  { allowHttpLocalhost = false } = {},
) {
  if (typeof configuredOrigin !== 'string' || configuredOrigin.length === 0) {
    throw new TypeError('County Hunter wallet authentication origin is required.')
  }

  let url
  try {
    url = new URL(configuredOrigin)
  } catch {
    throw new TypeError('County Hunter wallet authentication origin is invalid.')
  }

  const localDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  const protocolIsAllowed = (
    url.protocol === 'https:'
    || (allowHttpLocalhost && localDevelopment && url.protocol === 'http:')
  )
  if (
    !protocolIsAllowed
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new TypeError('County Hunter wallet authentication origin is invalid.')
  }

  return {
    origin: url.origin,
    uri: `${url.origin}/`,
    domain: url.host,
  }
}
