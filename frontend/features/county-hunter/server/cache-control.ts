export const COUNTY_HUNTER_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Pragma: 'no-cache',
  Expires: '0',
} as const

export function applyCountyHunterNoStore<T extends Response>(response: T): T {
  Object.entries(COUNTY_HUNTER_NO_STORE_HEADERS).forEach(([name, value]) => {
    response.headers.set(name, value)
  })
  return response
}
