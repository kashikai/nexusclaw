import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { parsePublicState, ValidationError } from '@/lib/agent-office/validate'
import { env } from '@/lib/checkout/config'

export const dynamic = 'force-dynamic'

const BUCKET = 'agent-office'
const OBJECT = 'public_state.json'
const MAX_BYTES = 32 * 1024

function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// The signal bot posts its public state here. Only a valid, secret-free state reaches the public bucket.
export async function POST(req: Request) {
  try {
    const expected = process.env.AGENT_OFFICE_PUBLISH_TOKEN
    if (!expected) return NextResponse.json({ error: 'Publishing is not configured' }, { status: 503 })

    const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!tokenMatches(bearer, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = await req.text()
    if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

    try {
      parsePublicState(raw)
    } catch (e) {
      if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 })
      throw e
    }

    const key = env('SUPABASE_SERVICE_ROLE_KEY')
    const res = await fetch(`${env('NEXT_PUBLIC_SUPABASE_URL')}/storage/v1/object/${BUCKET}/${OBJECT}`, {
      method: 'POST',
      headers: {
        apikey: key,
        // Legacy JWT keys also go as bearer; the newer sb_secret_ keys are not JWTs and go only in apikey.
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0',
        'x-upsert': 'true',
      },
      body: raw,
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[agent-office/publish] storage', res.status, (await res.text()).slice(0, 200))
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[agent-office/publish]', e)
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
  }
}
