import {
  CountyHunterDiscoveryError,
  type OfficialDocumentCandidate,
} from './types'

type LandingDiscoveryResult = {
  candidate: OfficialDocumentCandidate
  candidates: OfficialDocumentCandidate[]
  reasonCodes: ('SALE_DATE_IN_PAST')[]
}

const CURRENT_LIST_LABEL = /\b(list of properties|property list|tax sale list)\b/i
const HISTORICAL_DOCUMENT = /\b(histor(?:y|ical)|archive|prior years?|past sales?)\b/i
const RESULTS_DOCUMENT = /\b(excess funds?|results?)\b/i
const NON_LIST_DOCUMENT = /\b(bidder|purchaser|instructions?)\b/i
const DATE_PATTERN =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-3]?\d),\s+(20\d{2})\b/gi

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseEnglishDate(value: string): string | null {
  const parsed = new Date(`${value} 00:00:00 UTC`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function mostRecentDateInContext(value: string): string | null {
  const matches = [...stripHtml(value).matchAll(DATE_PATTERN)]
  const last = matches.at(-1)?.[0]
  return last ? parseEnglishDate(last) : null
}

function extractHref(tag: string): string | null {
  const match = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)
  return match ? decodeHtml(match[2].trim()) : null
}

export function discoverGwinnettCurrentList(
  html: string,
  landingUrl: string,
  now = new Date(),
): LandingDiscoveryResult {
  if (!/Upcoming Tax Sales/i.test(html)) {
    throw new CountyHunterDiscoveryError(
      'SOURCE_STRUCTURE_CHANGED',
      'The official landing page no longer contains the expected upcoming-sales section.',
      { reviewRequired: true },
    )
  }

  const candidates: OfficialDocumentCandidate[] = []
  let rejectedHistorical = false
  let rejectedResults = false
  let rejectedNonList = false
  const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  for (const match of html.matchAll(anchorPattern)) {
    const tag = match[0]
    const label = stripHtml(tag)
    const href = extractHref(tag)
    if (!href) continue
    const classificationText = `${label} ${href}`
    if (HISTORICAL_DOCUMENT.test(classificationText)) {
      rejectedHistorical = true
      continue
    }
    if (RESULTS_DOCUMENT.test(classificationText)) {
      rejectedResults = true
      continue
    }
    if (NON_LIST_DOCUMENT.test(classificationText)) {
      rejectedNonList = true
      continue
    }
    if (!CURRENT_LIST_LABEL.test(label)) continue

    const index = match.index ?? 0
    const context = html.slice(Math.max(0, index - 1_500), index)
    const nearbyText = stripHtml(context)
    if (!/Upcoming Tax Sales/i.test(nearbyText)) continue

    const saleDate = mostRecentDateInContext(context)
    let documentUrl: string
    try {
      const resolved = new URL(href, landingUrl)
      resolved.hash = ''
      documentUrl = resolved.toString()
    } catch {
      throw new CountyHunterDiscoveryError(
        'DOCUMENT_URL_REJECTED',
        'The current-list link on the official landing page is invalid.',
        { reviewRequired: true },
      )
    }
    candidates.push({ label, documentUrl, saleDate })
  }

  if (candidates.length === 0) {
    if (rejectedHistorical) {
      throw new CountyHunterDiscoveryError(
        'HISTORICAL_DOCUMENT_REJECTED',
        'Only historical property-list documents were found.',
        { reviewRequired: true },
      )
    }
    if (rejectedResults) {
      throw new CountyHunterDiscoveryError(
        'RESULTS_DOCUMENT_REJECTED',
        'Only results or excess-funds documents were found.',
        { reviewRequired: true },
      )
    }
    if (rejectedNonList) {
      throw new CountyHunterDiscoveryError(
        'DOCUMENT_URL_REJECTED',
        'The official page contains no current property-list document.',
        { reviewRequired: true },
      )
    }
    throw new CountyHunterDiscoveryError(
      'NO_CURRENT_LIST',
      'The official landing page does not currently publish a property list.',
      { reviewRequired: true },
    )
  }
  if (candidates.some((candidate) => !candidate.saleDate)) {
    throw new CountyHunterDiscoveryError(
      'SALE_DATE_MISSING',
      'A current property-list candidate has no associated sale date.',
      { reviewRequired: true, candidates },
    )
  }
  if (candidates.length > 1) {
    throw new CountyHunterDiscoveryError(
      'MULTIPLE_CURRENT_LIST_CANDIDATES',
      'The official landing page contains multiple plausible current property lists.',
      { reviewRequired: true, candidates },
    )
  }

  const candidate = candidates[0]
  const today = now.toISOString().slice(0, 10)
  const reasonCodes: ('SALE_DATE_IN_PAST')[] =
    candidate.saleDate && candidate.saleDate < today ? ['SALE_DATE_IN_PAST'] : []
  return { candidate, candidates, reasonCodes }
}
