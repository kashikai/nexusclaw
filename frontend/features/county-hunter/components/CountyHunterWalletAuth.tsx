'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi'

type AuthResponse = { authenticated?: boolean; error?: string }

async function readResponse(response: Response): Promise<AuthResponse> {
  return response.json().catch(() => ({})) as Promise<AuthResponse>
}

export function CountyHunterWalletAuth() {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { switchChainAsync } = useSwitchChain()
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/county-hunter/auth/session', { cache: 'no-store' })
      const result = await readResponse(response)
      setAuthenticated(response.ok && result.authenticated === true)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { void checkSession() }, [checkSession])

  async function signIn() {
    if (!address || !isConnected) return
    setWorking(true)
    setError(null)
    try {
      if (chainId !== 8453) await switchChainAsync({ chainId: 8453 })
      const challengeResponse = await fetch('/api/county-hunter/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const challenge = await challengeResponse.json().catch(() => ({})) as { message?: string; error?: string }
      if (!challengeResponse.ok || !challenge.message) {
        throw new Error(challenge.error || 'Unable to create the wallet sign-in challenge.')
      }

      const signature = await signMessageAsync({ message: challenge.message })
      const verifyResponse = await fetch('/api/county-hunter/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: challenge.message, signature }),
      })
      const result = await readResponse(verifyResponse)
      if (!verifyResponse.ok || result.authenticated !== true) {
        throw new Error(result.error || 'Wallet sign-in failed.')
      }
      setAuthenticated(true)
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet sign-in failed.')
    } finally {
      setWorking(false)
    }
  }

  async function signOut() {
    setWorking(true)
    setError(null)
    try {
      const response = await fetch('/api/county-hunter/auth/logout', { method: 'POST' })
      if (!response.ok) {
        const result = await readResponse(response)
        throw new Error(result.error || 'Unable to sign out.')
      }
      setAuthenticated(false)
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign out.')
    } finally {
      setWorking(false)
    }
  }

  if (checking) return <span className="text-xs text-[#747c89]">Checking session…</span>

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {!isConnected && !authenticated && (
          <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
        )}
        {isConnected && !authenticated && (
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={working}
            className="rounded-sm bg-[#abc7ff] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#00285a] disabled:opacity-50"
          >
            {working ? 'Signing…' : 'Sign in with wallet'}
          </button>
        )}
        {authenticated && (
          <>
            <span className="text-xs font-semibold text-[#9ee6b0]">Supabase session active</span>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={working}
              className="rounded-sm border border-[#343b47] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#a8aeb8] hover:text-white disabled:opacity-50"
            >
              Sign out
            </button>
          </>
        )}
      </div>
      {error && <span className="max-w-md text-right text-[11px] text-[#ff9b9b]">{error}</span>}
    </div>
  )
}
