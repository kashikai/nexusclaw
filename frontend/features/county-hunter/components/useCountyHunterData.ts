'use client'

import { useCallback, useEffect, useState } from 'react'
import { countyHunterApi } from '../client/api'

export function useCountyHunterData<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await countyHunterApi<T>(path))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load County Hunter data.')
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { void reload() }, [reload])
  return { data, loading, error, reload, setData }
}
