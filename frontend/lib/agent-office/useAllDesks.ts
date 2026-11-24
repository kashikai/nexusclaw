'use client'

import { useEffect, useState } from 'react'
import { loadPublicState, POLL_INTERVAL_MS } from './loader'
import { isStale } from './validate'
import { COMING_SOON_DESKS } from './desks'
import { DESKS, type DataSource, type DeskId, type LoadResult } from './types'
import type { OfficeView } from './useOfficeState'

export type DeskViews = Record<DeskId, OfficeView>

const LIVE_DESKS = DESKS.filter(d => !COMING_SOON_DESKS.has(d))

function initialResults(): Record<DeskId, LoadResult> {
  return Object.fromEntries(DESKS.map(d => [d, { status: 'loading' }])) as Record<DeskId, LoadResult>
}

/**
 * Polls every active desk in parallel while the tab is visible. Each desk keeps its own result, so one bot
 * failing or going offline never hides the others. Coming-soon desks are never fetched.
 */
export function useAllDesks(source: DataSource): { views: DeskViews; now: number } {
  const [results, setResults] = useState<Record<DeskId, LoadResult>>(initialResults)
  const [now, setNow] = useState(() => Date.now())
  const sourceKey = source.kind === 'mock' ? `mock:${source.scenario}` : 'live'

  useEffect(() => {
    let controller = new AbortController()
    const load = async () => {
      controller.abort()
      controller = new AbortController()
      const { signal } = controller
      const loaded = await Promise.all(LIVE_DESKS.map(d => loadPublicState(source, signal, d)))
      if (signal.aborted) return
      setResults(prev => {
        const next = { ...prev }
        LIVE_DESKS.forEach((d, i) => {
          const res = loaded[i]
          // A failed poll keeps the last good state on screen; if it keeps failing, the staleness check takes over.
          next[d] = res.status === 'error' && prev[d].status === 'ok' ? prev[d] : res
        })
        return next
      })
      setNow(Date.now())
    }
    setResults(initialResults())
    load()
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

  const views = Object.fromEntries(DESKS.map(d => {
    const result = results[d]
    const state = result.status === 'ok' ? result.data : null
    return [d, { result, state, stale: state ? isStale(state, now) : false, now }]
  })) as DeskViews

  return { views, now }
}
