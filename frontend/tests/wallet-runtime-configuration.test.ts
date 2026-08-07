import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveWalletRuntimeConfiguration,
} from '../config/wallet-runtime'

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_ORIGIN: 'https://pilot.example.com',
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    '0123456789abcdef0123456789abcdef',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WalletConnect runtime metadata', () => {
  it('copies the explicit application origin exactly into metadata.url', () => {
    const result = resolveWalletRuntimeConfiguration(validEnvironment)

    expect(result.walletConnectEnabled).toBe(true)
    expect(result.metadata?.url).toBe(validEnvironment.NEXT_PUBLIC_APP_ORIGIN)
    expect(result.metadata?.icons).toEqual([])
  })

  it.each([
    undefined,
    'REPLACE_WITH_PRODUCTION_ORIGIN',
    'http://pilot.example.com',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'https://pilot.example.test',
    'https://pilot.staging.example.com',
    'https://pilot-staging.example.com',
    'https://pilot.example.com/',
    'https://pilot.example.com/path',
    'https://pilot.example.com?query=true',
    'https://pilot.example.com#fragment',
    'https://user:pass@pilot.example.com',
  ])('fails closed for an unsafe production origin', (origin) => {
    const result = resolveWalletRuntimeConfiguration({
      ...validEnvironment,
      NEXT_PUBLIC_APP_ORIGIN: origin,
    })

    expect(result).toEqual({ walletConnectEnabled: false })
  })

  it('allows the real browser origin only during development', () => {
    expect(
      resolveWalletRuntimeConfiguration(
        {
          NODE_ENV: 'development',
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
            validEnvironment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        },
        'https://localhost:3000',
      ).metadata?.url,
    ).toBe('https://localhost:3000')

    expect(
      resolveWalletRuntimeConfiguration(
        {
          NODE_ENV: 'production',
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
            validEnvironment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        },
        'https://runtime.example.com',
      ),
    ).toEqual({ walletConnectEnabled: false })
  })

  it('does not log the public Project ID or metadata', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    resolveWalletRuntimeConfiguration(validEnvironment)

    expect(log).not.toHaveBeenCalled()
    expect(info).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
