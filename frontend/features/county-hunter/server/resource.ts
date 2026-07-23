import { CountyHunterHttpError } from './http-error'

export function requireCountyHunterResource<T>(rows: readonly T[], label: string): T {
  const resource = rows[0]
  if (!resource) throw new CountyHunterHttpError(`${label} not found.`, 404)
  return resource
}
