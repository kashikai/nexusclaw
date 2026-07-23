import type { CountyHunterRequestContext } from './auth'
import { asObject, assertAllowedKeys, CountyHunterValidationError } from '../validation'

export type CountyHunterBootstrapResult = { counties_created: number }
export type CountyHunterBootstrapRpc = (
  context: CountyHunterRequestContext,
) => Promise<CountyHunterBootstrapResult[]>

export function parseCountyHunterBootstrapBody(rawBody: string): Record<string, never> {
  if (!rawBody.trim()) return {}

  let input: unknown
  try {
    input = JSON.parse(rawBody)
  } catch {
    throw new CountyHunterValidationError('Bootstrap body must be valid JSON.')
  }

  const body = asObject(input)
  assertAllowedKeys(body, [])
  return {}
}

export async function runCountyHunterBootstrap(
  context: CountyHunterRequestContext,
  rpc: CountyHunterBootstrapRpc,
): Promise<CountyHunterBootstrapResult> {
  const result = await rpc(context)
  return result[0] ?? { counties_created: 0 }
}
