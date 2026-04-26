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
    [base.id]: http('https://mainnet.base.org'),
  },
  ssr: true,
})
