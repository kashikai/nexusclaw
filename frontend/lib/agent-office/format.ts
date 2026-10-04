import { INTL_LOCALE, type Locale } from './strings'

export function formatUsd(value: number, locale: Locale, signed = false): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}

export function pnlColor(value: number): string {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-300'
}

export function formatRelative(iso: string | null, now: number, locale: Locale): string {
  if (!iso) return '—'
  const diffSec = Math.round((Date.parse(iso) - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto', style: 'short' })
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

export function formatClock(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(INTL_LOCALE[locale], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
