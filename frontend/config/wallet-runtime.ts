import { normalizeCountyHunterSiweOrigin } from '../features/county-hunter/siwe-origin.mjs'

const WALLETCONNECT_PROJECT_ID = /^[a-f0-9]{32}$/i

export const WALLET_APP_NAME = 'NexusClaw Terminal'
export const WALLET_APP_DESCRIPTION = 'NexusClaw wallet connection'

export type WalletConnectionMetadata = {
  name: typeof WALLET_APP_NAME
  description: typeof WALLET_APP_DESCRIPTION
  url: string
  icons: string[]
}

export type WalletRuntimeConfiguration = {
  metadata?: WalletConnectionMetadata
  projectId?: string
  walletConnectEnabled: boolean
}

export function resolveWalletRuntimeConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
  runtimeOrigin?: string,
): WalletRuntimeConfiguration {
  const production = environment.NODE_ENV === 'production'
  const configuredOrigin = environment.NEXT_PUBLIC_APP_ORIGIN?.trim()
  const originCandidate = configuredOrigin || (production ? undefined : runtimeOrigin)
  const projectId = environment.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim()

  if (!originCandidate || !projectId || !WALLETCONNECT_PROJECT_ID.test(projectId)) {
    return { walletConnectEnabled: false }
  }

  try {
    const normalized = normalizeCountyHunterSiweOrigin(originCandidate, {
      allowHttpLoopback: !production,
      requireProductionOrigin: production,
    })
    if (production && originCandidate !== normalized.origin) {
      return { walletConnectEnabled: false }
    }
    return {
      metadata: {
        name: WALLET_APP_NAME,
        description: WALLET_APP_DESCRIPTION,
        url: normalized.origin,
        icons: [],
      },
      projectId,
      walletConnectEnabled: true,
    }
  } catch {
    return { walletConnectEnabled: false }
  }
}
