import { NextResponse } from 'next/server'
import { stableBalanceUsd } from '@/lib/checkout/chain'
import { getOrder, markPaid, signedDownloadUrl } from '@/lib/checkout/db'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id') ?? ''
    if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

    const order = await getOrder(id)
    if (!order || !order.address) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.status !== 'paid') {
      // Deposit address is unique per order, so its balance is what this buyer sent.
      const received = await stableBalanceUsd(order.address as `0x${string}`)
      if (received + 1e-6 < Number(order.price_usd)) {
        return NextResponse.json({ status: 'pending', received })
      }
      await markPaid(order.id)
    }

    return NextResponse.json({ status: 'paid', downloadUrl: await signedDownloadUrl() })
  } catch (e) {
    console.error('[checkout/status]', e)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
