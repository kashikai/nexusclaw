'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  className?: string
  children: React.ReactNode
  /** Wallet verified as a $NEXUSCLAW holder in the page (server re-verifies). */
  wallet?: string | null
}

interface Order {
  id: string
  address: string
  price: number
  holder: boolean
}

const STORAGE_KEY = 'nexusclaw_trader_order'
const POLL_MS = 10_000

export function CryptoBuyButton({ className, children, wallet }: Props) {
  const [open, setOpen] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  const check = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/checkout/status?id=${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.status === 'paid') {
        setDownloadUrl(data.downloadUrl)
        stopPolling()
      }
    } catch {
      /* transient network error, next tick retries */
    }
  }, [])

  const startPolling = useCallback(
    (id: string) => {
      stopPolling()
      check(id)
      timer.current = setInterval(() => check(id), POLL_MS)
    },
    [check]
  )

  useEffect(() => stopPolling, [])

  const openModal = async () => {
    setOpen(true)
    setError('')
    // Resume an order started earlier (page reload, tab closed after paying).
    // Only reuse it if the price tier still matches (holder verified or not).
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Order | null
      if (saved && saved.holder === !!wallet) {
        setOrder(saved)
        startPolling(saved.id)
        return
      }
    } catch {
      /* ignore */
    }
    if (order) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()) as Order
      setOrder(created)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(created))
      } catch {
        /* ignore */
      }
      startPolling(created.id)
    } catch {
      setError('Could not create your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const close = () => {
    stopPolling()
    setOpen(false)
  }

  const copyAddress = async () => {
    if (!order) return
    await navigator.clipboard.writeText(order.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={close}>
          <div
            className="relative w-full max-w-md border border-[#1f2937] bg-[#0a0e14] p-6 font-mono text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} aria-label="Close" className="absolute right-4 top-3 text-gray-500 hover:text-white">
              ✕
            </button>
            <h3 className="mb-1 text-sm font-black uppercase tracking-widest text-yellow-400">NexusClaw Trader</h3>

            {loading && <p className="py-10 text-center text-xs text-gray-400">Creating your payment address…</p>}
            {error && <p className="py-6 text-center text-xs text-red-400">{error}</p>}

            {order && !downloadUrl && (
              <>
                <p className="mb-4 text-xs text-gray-400">
                  Send exactly <span className="font-bold text-white">${order.price.toFixed(2)}</span> in{' '}
                  <span className="font-bold text-white">USDC or USDT</span> on the{' '}
                  <span className="font-bold text-white">Base network</span>
                  {order.holder && <span className="text-green-400"> · holder price applied</span>}.
                </p>
                <div className="mx-auto mb-4 w-fit bg-white p-3">
                  <QRCodeSVG value={order.address} size={176} />
                </div>
                <div className="mb-2 break-all border border-[#1f2937] bg-black px-3 py-2 text-[11px] text-white">
                  {order.address}
                </div>
                <button
                  onClick={copyAddress}
                  className="mb-4 w-full border border-yellow-700 py-2 text-[10px] font-bold uppercase tracking-widest text-yellow-400 hover:bg-yellow-400 hover:text-black"
                >
                  {copied ? 'COPIED ✓' : 'COPY ADDRESS'}
                </button>
                <p className="mb-2 flex items-center justify-center gap-2 text-[11px] text-gray-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                  Waiting for payment… your download appears here automatically.
                </p>
                <p className="text-[10px] leading-relaxed text-red-400">
                  ⚠ Only Base network. Tokens sent on another network (Ethereum, BSC, Tron…) cannot be recovered. This
                  address is unique to your order. Keep this tab or reopen the button to resume.
                </p>
              </>
            )}

            {downloadUrl && (
              <div className="py-4 text-center">
                <p className="mb-4 text-sm font-bold text-green-400">✓ Payment received</p>
                <a
                  href={downloadUrl}
                  className="block bg-green-400 px-6 py-4 text-sm font-black uppercase tracking-widest text-black hover:brightness-110"
                >
                  DOWNLOAD NEXUSCLAW TRADER →
                </a>
                <p className="mt-3 text-[10px] text-gray-500">
                  Link valid for 1 hour. Reopen the buy button anytime to get a fresh link.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
