'use client'

import { useEffect, useState } from 'react'
import { loadPublicState, POLL_INTERVAL_MS } from './loader'
import { isStale } from './validate'
import type { DataSource, LoadResult, PublicState } from './types'

export interface OfficeView {
  result: LoadResult
  /** Data to render, or null if nothing valid is available. */
  state: PublicState | null
  stale: boolean
  now: number
}

/** Polls the public state every few seconds while the tab is visible, and re-evaluates staleness every 15s. */
export function useOfficeState(source: DataSource): OfficeView {
  const [result, setResult] = useState<LoadResult>({ status: 'loading' })
  const [now, setNow] = useState(() => Date.now())
  const sourceKey = source.kind === 'mock' ? `mock:${source.scenario}` : 'live'

  useEffect(() => {
    let controller = new AbortController()
    const load = async () => {
      controller.abort()
      controller = new AbortController()
      const res = await loadPublicState(source, controller.signal)
      if (!controller.signal.aborted) {
        // A failed poll keeps the last good state on screen; if it keeps failing, the staleness check takes over.
        setResult(prev => (res.status === 'error' && prev.status === 'ok' ? prev : res))
        setNow(Date.now())
      }
    }
    setResult({ status: 'loading' })
    load()
    // A hidden tab does not poll; it reloads as soon as it is shown again.
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const id = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const state = result.status === 'ok' ? result.data : null
  return { result, state, stale: state ? isStale(state, now) : false, now }
}
