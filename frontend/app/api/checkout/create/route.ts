import { NextResponse } from 'next/server'
import { HOLDER_PRICE_USD, PRICE_USD } from '@/lib/checkout/config'
import { isNexusHolder } from '@/lib/checkout/chain'
import { insertOrder, setAddress } from '@/lib/checkout/db'
import { depositAddress } from '@/lib/checkout/wallet'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { wallet?: string }
    const wallet = body.wallet && /^0x[0-9a-fA-F]{40}$/.test(body.wallet) ? (body.wallet as `0x${string}`) : null

    // Holder discount is decided server-side, never trusted from the client.
    const holder = wallet ? await isNexusHolder(wallet).catch(() => false) : false
    const price = holder ? HOLDER_PRICE_USD : PRICE_USD

    const order = await insertOrder(price, holder ? wallet : null)
    const address = depositAddress(order.idx)
    await setAddress(order.id, address)

    return NextResponse.json({ id: order.id, address, price, holder })
  } catch (e) {
    console.error('[checkout/create]', e)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }
}
