import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import {
  coinbaseWallet as wagmiCoinbaseWallet,
  injected,
} from 'wagmi/connectors'
import {
  resolveWalletRuntimeConfiguration,
  WALLET_APP_NAME,
} from './wallet-runtime'

const walletRuntimeEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
}
const walletRuntime = resolveWalletRuntimeConfiguration(
  walletRuntimeEnvironment,
  typeof window === 'undefined' ? undefined : window.location.origin,
)
const baseRpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() || 'https://mainnet.base.org'

const connectors = (
  walletRuntime.walletConnectEnabled &&
  walletRuntime.metadata &&
  walletRuntime.projectId
)
  ? connectorsForWallets(
      [
        {
          groupName: 'Popular',
          wallets: [
            metaMaskWallet,
            coinbaseWallet,
            trustWallet,
            walletConnectWallet,
          ],
        },
      ],
      {
        appName: walletRuntime.metadata.name,
        appDescription: walletRuntime.metadata.description,
        appUrl: walletRuntime.metadata.url,
        projectId: walletRuntime.projectId,
      },
    )
  : [
      injected(),
      wagmiCoinbaseWallet({ appName: WALLET_APP_NAME }),
    ]

export const config = createConfig({
  connectors,
  chains: [base],
  transports: {
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
})
