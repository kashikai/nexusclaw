const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

import { isIP } from 'node:net'
import { isPrivateOrReservedIp } from './network'

export class CountyHunterValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CountyHunterValidationError'
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CountyHunterValidationError('A JSON object is required.')
  }
  return value as Record<string, unknown>
}

export function assertAllowedKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedKeys = new Set(allowed)
  const unexpected = Object.keys(body).filter((key) => !allowedKeys.has(key))
  if (unexpected.length) {
    throw new CountyHunterValidationError(`Unexpected field(s): ${unexpected.join(', ')}.`)
  }
}

export function requiredText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CountyHunterValidationError(`${field} is required.`)
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new CountyHunterValidationError(`${field} must be at most ${maxLength} characters.`)
  }
  return normalized
}

export function optionalText(value: unknown, field: string, maxLength = 5000): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new CountyHunterValidationError(`${field} must be text.`)
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new CountyHunterValidationError(`${field} must be at most ${maxLength} characters.`)
  }
  return normalized || null
}

export function optionalHttpsUrl(value: unknown, field: string): string | null | undefined {
  const text = optionalText(value, field, 2048)
  if (text === undefined || text === null) return text

  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    throw new CountyHunterValidationError(`${field} must be a valid URL.`)
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new CountyHunterValidationError(`${field} must use HTTPS and cannot include credentials.`)
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    (isIP(hostname) !== 0 && isPrivateOrReservedIp(hostname))
  ) {
    throw new CountyHunterValidationError(`${field} cannot target a private or local address.`)
  }

  return parsed.toString()
}

export function optionalNumber(value: unknown, field: string, minimum = 0, maximum = Number.POSITIVE_INFINITY): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new CountyHunterValidationError(`${field} must be between ${minimum} and ${maximum}.`)
  }
  return number
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new CountyHunterValidationError(`${field} must be true or false.`)
  return value
}

export function oneOf<T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new CountyHunterValidationError(`${field} has an unsupported value.`)
  }
  return value as T[number]
}

export function optionalDate(value: unknown, field: string): string | null | undefined {
  const text = optionalText(value, field, 40)
  if (text === undefined || text === null) return text
  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) throw new CountyHunterValidationError(`${field} must be a valid date.`)
  return text
}

export function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>
}
