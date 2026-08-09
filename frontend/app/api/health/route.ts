export const dynamic = 'force-dynamic'

const HEALTH_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
} as const

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: HEALTH_HEADERS,
  })
}
