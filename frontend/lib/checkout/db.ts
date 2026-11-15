import { env } from './config'

// Minimal Supabase REST client (service role, server only).
function base() {
  return env('NEXT_PUBLIC_SUPABASE_URL')
}
function headers(extra: Record<string, string> = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra }
}

export interface Order {
  id: string
  idx: number
  address: string | null
  price_usd: number
  holder_wallet: string | null
  status: 'pending' | 'paid'
  created_at: string
  paid_at: string | null
}

async function rest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${base()}/rest/v1/${path}`, { ...init, cache: 'no-store' })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

export async function insertOrder(price_usd: number, holder_wallet: string | null): Promise<Order> {
  const rows = await rest<Order[]>('crypto_orders', {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ price_usd, holder_wallet }),
  })
  return rows[0]
}

export async function setAddress(id: string, address: string): Promise<void> {
  await rest(`crypto_orders?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ address }),
  })
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await rest<Order[]>(`crypto_orders?id=eq.${encodeURIComponent(id)}&select=*`, { headers: headers() })
  return rows[0] ?? null
}

export async function markPaid(id: string): Promise<void> {
  await rest(`crypto_orders?id=eq.${id}&status=eq.pending`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
  })
}

// Time-limited download link for the bot file in a PRIVATE storage bucket.
export async function signedDownloadUrl(expiresIn = 3600): Promise<string> {
  const bucket = env('BOT_BUCKET')
  const path = env('BOT_FILE_PATH')
  const res = await fetch(`${base()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ expiresIn }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`)
  const { signedURL } = (await res.json()) as { signedURL: string }
  return `${base()}/storage/v1${signedURL}&download=NexusClaw-Trader.zip`
}
