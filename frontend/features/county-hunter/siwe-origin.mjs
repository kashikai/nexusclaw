/**
 * Normalize the configured authentication origin into the two EIP-4361 values:
 * a pathless canonical origin and an exact redirect URI with one trailing slash.
 *
 * @param {string} configuredOrigin
 * @param {{ allowHttpLoopback?: boolean, requireProductionOrigin?: boolean }} [options]
 * @returns {{ origin: string, uri: string, domain: string }}
 */
export function normalizeCountyHunterSiweOrigin(
  configuredOrigin,
  {
    allowHttpLoopback = false,
    requireProductionOrigin = false,
  } = {},
) {
  const placeholder =
    /(replace(?:_with)?|placeholder|change[-_ ]?me|your[-_ ]|dominio-de-producao|<[^>]+>|\$\{[^}]+>|^demo$)/i
  if (
    typeof configuredOrigin !== 'string' ||
    configuredOrigin.length === 0 ||
    placeholder.test(configuredOrigin)
  ) {
    throw new TypeError('County Hunter wallet authentication origin is required.')
  }

  let url
  try {
    url = new URL(configuredOrigin)
  } catch {
    throw new TypeError('County Hunter wallet authentication origin is invalid.')
  }

  const normalizedHostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  const hostnameLabels = normalizedHostname.split('.')
  const numericAddress = hostnameLabels.length === 4 && hostnameLabels.every(
    (label) => /^\d{1,3}$/.test(label),
  )
  const localDevelopment = (
    hostnameLabels.length === 1 ||
    numericAddress ||
    normalizedHostname === '::1'
  )
  const protocolIsAllowed = (
    url.protocol === 'https:'
    || (allowHttpLoopback && localDevelopment && url.protocol === 'http:')
  )
  if (
    !protocolIsAllowed
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
    || (
      requireProductionOrigin &&
      (
        localDevelopment ||
        hostnameLabels.some((label) => label.includes('staging')) ||
        normalizedHostname.endsWith('.test') ||
        normalizedHostname.endsWith('.invalid') ||
        normalizedHostname.endsWith('.local')
      )
    )
  ) {
    throw new TypeError('County Hunter wallet authentication origin is invalid.')
  }

  return {
    origin: url.origin,
    uri: `${url.origin}/`,
    domain: url.host,
  }
}
