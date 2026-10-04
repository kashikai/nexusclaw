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

/** Polls the public state every 60s and re-evaluates staleness every 30s. */
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
        setResult(res)
        setNow(Date.now())
      }
    }
    setResult({ status: 'loading' })
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => { clearInterval(id); controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const state = result.status === 'ok' ? result.data : null
  return { result, state, stale: state ? isStale(state, now) : false, now }
}
