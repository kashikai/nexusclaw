'use client'

export class CountyHunterApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CountyHunterApiError'
    this.status = status
  }
}

export async function countyHunterApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/county-hunter${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CountyHunterApiError(body.error ?? 'County Hunter request failed.', response.status)
  }
  return body as T
}
