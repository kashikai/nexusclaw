import type { CountyHunterRequestContext } from './auth'
import { CountyHunterHttpError } from './http-error'

type RestOptions = RequestInit & { prefer?: string }

export async function countyHunterRest<T>(
  context: CountyHunterRequestContext,
  resource: string,
  query = '',
  options: RestOptions = {},
): Promise<T> {
  const { prefer, ...init } = options
  const headers = new Headers(init.headers)
  headers.set('apikey', context.publishableKey)
  headers.set('Authorization', `Bearer ${context.accessToken}`)
  headers.set('Content-Type', 'application/json')
  if (prefer) headers.set('Prefer', prefer)
  const response = await fetch(`${context.supabaseUrl}/rest/v1/${resource}${query ? `?${query}` : ''}`, {
    ...init,
    cache: 'no-store',
    headers,
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string; details?: string }
    throw new CountyHunterHttpError(error.message ?? error.details ?? 'Database operation failed.', response.status)
  }
  if (response.status === 204 || init.method === 'HEAD') return undefined as T
  return response.json() as Promise<T>
}

export async function countyHunterCount(
  context: CountyHunterRequestContext,
  resource: string,
  filters = '',
): Promise<number> {
  const response = await fetch(
    `${context.supabaseUrl}/rest/v1/${resource}?select=id${filters ? `&${filters}` : ''}`,
    {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        apikey: context.publishableKey,
        Authorization: `Bearer ${context.accessToken}`,
        Prefer: 'count=exact',
      },
    },
  )
  if (!response.ok) throw new CountyHunterHttpError('Unable to calculate dashboard metrics.', response.status)
  const range = response.headers.get('content-range')
  const count = range?.split('/')[1]
  return count && count !== '*' ? Number(count) : 0
}

export function organizationFilter(organizationId: string): string {
  return `organization_id=eq.${encodeURIComponent(organizationId)}`
}
