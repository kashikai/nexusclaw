'use client'

import { useEffect, useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android|iphone|ipad|ipod|webos/i.test(navigator.userAgent)
}

function hasInjectedWallet(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).ethereum
}

function isBot(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('bot') || ua.includes('node') || ua.includes('axios') || !ua
}

const WALLETS = [
  {
    name: 'MetaMask',
    icon: '🦊',
    href: 'https://metamask.app.link/dapp/nexusclaw.tech',
  },
  {
    name: 'Coinbase Wallet',
    icon: '🔵',
    href: 'https://go.cb-wallet.com/dapp?url=https://nexusclaw.tech',
  },
  {
    name: 'Trust Wallet',
    icon: '🔷',
    href: 'https://link.trustwallet.com/open_url?coin_id=60&url=https://nexusclaw.tech',
  },
]

export function MobileBanner() {
  const [show, setShow] = useState(false)
  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    const dismissed = sessionStorage.getItem('wallet-modal-dismissed')
    if (dismissed) return
    if (isMobile() && !hasInjectedWallet() && !isBot()) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  function dismiss() {
    sessionStorage.setItem('wallet-modal-dismissed', '1')
    setShow(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#141419] border-t border-[#414754]/30 rounded-t-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-['Space_Grotesk'] font-bold text-[#e5e2e1] uppercase tracking-tight">
              Connect Wallet
            </h3>
            <p className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-widest mt-1">
              Open in your wallet browser
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-[#8b919f] hover:text-[#e5e2e1] transition-colors text-xl leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        {/* Wallet buttons */}
        <div className="space-y-3">
          {WALLETS.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.href}
              className="flex items-center gap-4 w-full p-4 bg-[#1c1b1b] border border-[#414754]/20 rounded-lg hover:bg-[#201f1f] hover:border-[#abc7ff]/40 transition-all"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <span className="font-['Space_Grotesk'] font-bold text-sm uppercase tracking-wide text-[#e5e2e1]">
                {wallet.name}
              </span>
              <span className="material-symbols-outlined text-[#8b919f] text-sm ml-auto">
                open_in_new
              </span>
            </a>
          ))}

          {/* WalletConnect — opens RainbowKit modal */}
          <button
            onClick={() => { dismiss(); openConnectModal?.() }}
            className="flex items-center gap-4 w-full p-4 bg-[#1c1b1b] border border-[#414754]/20 rounded-lg hover:bg-[#201f1f] hover:border-[#abc7ff]/40 transition-all"
          >
            <span className="text-2xl">📱</span>
            <div className="text-left">
              <span className="font-['Space_Grotesk'] font-bold text-sm uppercase tracking-wide text-[#e5e2e1] block">
                WalletConnect
              </span>
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#8b919f] uppercase tracking-widest">
                Scan QR with any wallet
              </span>
            </div>
            <span className="material-symbols-outlined text-[#8b919f] text-sm ml-auto">
              qr_code_2
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

export default MobileBanner
