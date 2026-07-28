import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo'
const baseRpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() || 'https://mainnet.base.org'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, coinbaseWallet, trustWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'NexusClaw Terminal',
    projectId,
  }
)

export const config = createConfig({
  connectors,
  chains: [base],
  transports: {
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
})
