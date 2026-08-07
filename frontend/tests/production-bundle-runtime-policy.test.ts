import { describe, expect, it } from 'vitest'
import {
  classifyBundleSource,
  productionInputsSatisfyGate,
} from '../scripts/production-bundle-runtime-policy.mjs'

describe('production bundle runtime policy', () => {
  it('classifies known third-party local tokens by behavior', () => {
    const fixtures = [
      [
        'const IS_DEVELOPMENT=false;const allowed=["https://localhost:*","https://*.pages.dev"]',
        '@reown/appkit-common + @reown/appkit-controllers',
      ],
      [
        'new RegExp("wss?://localhost(:d{2,5})?")',
        '@walletconnect/jsonrpc-utils',
      ],
      ['const chains={localhost:{chainId:1337}}', '@rainbow-me/rainbowkit'],
      [
        'this.hostname=location.hostname||"localhost";this._offlineEventListener=()=>{}',
        'engine.io-client',
      ],
      ['if("localhost"===url.host){url.host=""};url.parseHost()', 'next'],
    ] as const

    for (const [source, packageName] of fixtures) {
      const findings = classifyBundleSource(source)
      expect(findings).not.toHaveLength(0)
      expect(findings.every((finding) => finding.package === packageName))
        .toBe(true)
      expect(findings.every((finding) => finding.runtimeReachable)).toBe(true)
    }
  })

  it('blocks app-owned local and staging configuration', () => {
    expect(
      classifyBundleSource('const appOrigin="https://localhost:3000"'),
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'APP_OWNED_CONFIGURATION' }),
    ]))
    expect(
      classifyBundleSource('fetch("https://api.staging.example.com")'),
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'APP_OWNED_CONFIGURATION' }),
    ]))
  })

  it('does not turn the raw token count into the release decision', () => {
    const findings = classifyBundleSource(
      'const chains={localhost:{chainId:1337}}',
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].category).toBe('VENDOR_DEVELOPMENT_FALLBACK')
    expect(findings[0].package).not.toBe('nexusclaw')
  })

  it('classifies matching source-map text as non-runtime metadata', () => {
    expect(classifyBundleSource('localhost', 'client.js.map'))
      .toEqual([
        expect.objectContaining({
          category: 'SOURCE_MAP_ONLY',
          runtimeReachable: false,
        }),
      ])
  })

  it('requires valid explicit production inputs and rejects placeholders', () => {
    expect(productionInputsSatisfyGate({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_ORIGIN: 'https://pilot.example.com',
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
        '0123456789abcdef0123456789abcdef',
    })).toBe(true)

    expect(productionInputsSatisfyGate({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_ORIGIN: 'REPLACE_WITH_PRODUCTION_ORIGIN',
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
        '0123456789abcdef0123456789abcdef',
    })).toBe(false)
  })
})
