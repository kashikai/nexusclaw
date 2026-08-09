import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { normalizeCountyHunterSiweOrigin } from '../features/county-hunter/siwe-origin.mjs'

const TARGET_TOKEN = /localhost|127\.0\.0\.1|county-hunter\.nexusclaw\.test/gi
const URL_LITERAL = /https?:\/\/[^\s"'`\\)\]}]+/gi

const WALLETCONNECT_PROJECT_ID = /^[a-f0-9]{32}$/i
const EXPECTED_APP_ORIGIN = 'https://county-hunter.nexusclaw.tech'
const PRODUCTION_ORIGIN_PLACEHOLDERS = [
  'REPLACE_WITH_PRODUCTION_ORIGIN',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
  'https://pilot.example.test',
  'https://pilot-staging.example.com',
]

const vendor = {
  reown: {
    package: '@reown/appkit-common + @reown/appkit-controllers',
    version: '1.8.19',
    category: 'VENDOR_DEVELOPMENT_FALLBACK',
    purpose: 'default development ancestors and local-origin validation',
  },
  walletConnect: {
    package: '@walletconnect/jsonrpc-utils',
    version: '1.0.8',
    category: 'VENDOR_VALIDATION_LITERAL',
    purpose: 'WebSocket URL classification',
  },
  rainbowKit: {
    package: '@rainbow-me/rainbowkit',
    version: '2.2.11',
    category: 'VENDOR_DEVELOPMENT_FALLBACK',
    purpose: 'development chain icon metadata',
  },
  engineIo: {
    package: 'engine.io-client',
    version: '6.6.6',
    category: 'VENDOR_DEVELOPMENT_FALLBACK',
    purpose: 'browser hostname fallback and offline handling',
  },
  next: {
    package: 'next',
    version: '15.5.21',
    category: 'VENDOR_VALIDATION_LITERAL',
    purpose: 'standards-compatible URL parsing',
  },
}

function vendorClassification(context) {
  if (
    context.includes('isOriginAllowed') ||
    (
      context.includes('IS_DEVELOPMENT') &&
      (context.includes('pages.dev') || context.includes('vercel.app'))
    )
  ) {
    return vendor.reown
  }
  if (/wss\?:\/\/localhost|isLocalhostUrl/.test(context)) {
    return vendor.walletConnect
  }
  if (/localhost:\{chainId:1337|chainId:1337.{0,80}localhost/s.test(context)) {
    return vendor.rainbowKit
  }
  if (
    context.includes('_offlineEventListener') ||
    (
      context.includes('location.hostname') &&
      context.includes('this.hostname')
    )
  ) {
    return vendor.engineIo
  }
  if (
    context.includes('parseHost') ||
    (
      context.includes('isSpecial') &&
      context.includes('fragment')
    )
  ) {
    return vendor.next
  }
  return undefined
}

function stagingOrTestUrls(source) {
  const matches = source.match(URL_LITERAL) || []
  return matches.filter((value) => {
    try {
      const hostname = new URL(value).hostname.toLowerCase()
      return (
        hostname.split('.').includes('staging') ||
        hostname === 'county-hunter.nexusclaw.test'
      )
    } catch {
      return false
    }
  })
}

export function productionInputsSatisfyGate(environment = process.env) {
  const configuredOrigin = environment.NEXT_PUBLIC_APP_ORIGIN?.trim()
  const projectId = environment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim()
  if (!configuredOrigin || !projectId || !WALLETCONNECT_PROJECT_ID.test(projectId)) {
    return false
  }

  try {
    const normalized = normalizeCountyHunterSiweOrigin(configuredOrigin, {
      requireProductionOrigin: true,
    })
    if (
      normalized.origin !== configuredOrigin ||
      normalized.origin !== EXPECTED_APP_ORIGIN
    ) return false
  } catch {
    return false
  }

  return PRODUCTION_ORIGIN_PLACEHOLDERS.every((candidate) => {
    try {
      normalizeCountyHunterSiweOrigin(candidate, {
        requireProductionOrigin: true,
      })
      return false
    } catch {
      return true
    }
  })
}

export function classifyBundleSource(source, file = 'chunk.js') {
  const sourceMap = extname(file) === '.map'
  const findings = []
  for (const match of source.matchAll(TARGET_TOKEN)) {
    const index = match.index ?? 0
    const start = Math.max(0, index - 2_500)
    const context = source.slice(start, index + 2_500)
    const classifiedVendor = sourceMap ? undefined : vendorClassification(context)
    if (sourceMap) {
      findings.push({
        category: 'SOURCE_MAP_ONLY',
        package: 'generated source map',
        version: 'n/a',
        purpose: 'debug metadata',
        runtimeReachable: false,
      })
    } else if (classifiedVendor) {
      findings.push({
        ...classifiedVendor,
        runtimeReachable: true,
      })
    } else {
      findings.push({
        category: /https?:\/\//i.test(context)
          ? 'APP_OWNED_CONFIGURATION'
          : 'APP_OWNED_EXECUTABLE',
        package: 'nexusclaw',
        version: 'workspace',
        purpose: 'unapproved local runtime token',
        runtimeReachable: true,
      })
    }
  }

  for (const _url of stagingOrTestUrls(source)) {
    findings.push({
      category: sourceMap ? 'SOURCE_MAP_ONLY' : 'APP_OWNED_CONFIGURATION',
      package: sourceMap ? 'generated source map' : 'nexusclaw',
      version: sourceMap ? 'n/a' : 'workspace',
      purpose: 'unapproved staging or historical test URL',
      runtimeReachable: !sourceMap,
    })
  }
  return findings
}

async function bundleFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await bundleFiles(path)))
    else if (['.js', '.map'].includes(extname(entry.name))) files.push(path)
  }
  return files
}

export async function inspectProductionBundle(staticDirectory) {
  const findings = []
  const clientSources = []
  for (const file of await bundleFiles(staticDirectory)) {
    const source = await readFile(file, 'utf8')
    if (extname(file) === '.js') clientSources.push(source)
    for (const finding of classifyBundleSource(source, file)) {
      findings.push({
        file: relative(staticDirectory, file),
        ...finding,
      })
    }
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim()
  const authOrigin = process.env.COUNTY_HUNTER_AUTH_ORIGIN?.trim()
  const countyHunterEnabled = process.env.COUNTY_HUNTER_ENABLED === 'true'
  const metadataExplicit = Boolean(
    configuredOrigin &&
    clientSources.some((source) => source.includes(configuredOrigin)),
  )
  const metadataMatchesAppOrigin = Boolean(configuredOrigin && metadataExplicit)
  const siweMatchesAppOrigin = Boolean(
    configuredOrigin && (
      countyHunterEnabled
        ? authOrigin === configuredOrigin
        : !authOrigin || authOrigin === configuredOrigin
    ),
  )
  const appOwned = findings.filter((finding) =>
    finding.category.startsWith('APP_OWNED_'),
  )
  const vendorFindings = findings.filter((finding) =>
    finding.category.startsWith('VENDOR_'),
  )
  const documentedVendorPackages = new Set(
    Object.values(vendor).map((entry) => entry.package),
  )

  return {
    findings,
    gates: {
      appOwnedLocalhostRuntime: appOwned.some((finding) =>
        finding.purpose.includes('local runtime'),
      ),
      appOwnedStagingUrls: appOwned.some((finding) =>
        finding.purpose.includes('staging'),
      ),
      metadataExplicit,
      metadataMatchesAppOrigin,
      siweMatchesAppOrigin,
      productionPlaceholdersRejected: productionInputsSatisfyGate(),
      vendorTokensDocumented: vendorFindings.every((finding) =>
        documentedVendorPackages.has(finding.package),
      ),
    },
  }
}
