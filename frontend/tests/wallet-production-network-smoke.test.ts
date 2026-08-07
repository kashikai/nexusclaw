import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type SmokeController = {
  snapshot(): {
    passed: boolean
    observationCount: number
    forbiddenRequests: number
    byTransport: Record<string, number>
  }
  finish(): ReturnType<SmokeController['snapshot']>
}

function smokeContext() {
  class FakeXhr {
    open() {}
  }
  class FakeWebSocket {
    constructor(_url: string) {}
  }
  class FakeEventSource {
    constructor(_url: string) {}
  }
  const context: Record<string, unknown> = {
    URL,
    location: new URL('https://pilot.example.com'),
    fetch: vi.fn(async () => ({ ok: true })),
    XMLHttpRequest: FakeXhr,
    WebSocket: FakeWebSocket,
    EventSource: FakeEventSource,
    navigator: { sendBeacon: vi.fn(() => true) },
    open: vi.fn(() => null),
  }
  return context
}

describe('production wallet browser network smoke harness', () => {
  it('monitors every required browser transport without recording full URLs', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/browser/wallet-production-network-smoke.js'),
      'utf8',
    )
    const context = smokeContext()
    runInNewContext(source, context)

    await (context.fetch as typeof fetch)('https://relay.walletconnect.com')
    new (context.XMLHttpRequest as { new(): XMLHttpRequest })()
      .open('GET', 'https://api.example.com')
    new (context.WebSocket as { new(url: string): WebSocket })(
      'wss://relay.walletconnect.com',
    )
    new (context.EventSource as { new(url: string): EventSource })(
      'https://events.example.com',
    )
    ;(context.navigator as Navigator).sendBeacon(
      'https://metrics.example.com',
      'safe',
    )
    ;(context.open as typeof open)('https://wallet.example.com')

    const controller = context.__NEXUSCLAW_WALLET_NETWORK_SMOKE__ as SmokeController
    const report = controller.snapshot()
    expect(report).toMatchObject({
      passed: true,
      observationCount: 6,
      forbiddenRequests: 0,
    })
    expect(JSON.stringify(report)).not.toContain('walletconnect.com')
    expect(JSON.stringify(report)).not.toContain('example.com')
    expect(source).not.toContain('console.')
  })

  it('fails for every prohibited destination class', async () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/browser/wallet-production-network-smoke.js'),
      'utf8',
    )
    const context = smokeContext()
    runInNewContext(source, context)

    const forbidden = [
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      'https://[::1]:3000',
      'https://county-hunter.nexusclaw.test',
      'https://api.staging.example.com',
    ]
    for (const destination of forbidden) {
      await (context.fetch as typeof fetch)(destination)
    }

    const controller = context.__NEXUSCLAW_WALLET_NETWORK_SMOKE__ as SmokeController
    expect(controller.finish()).toMatchObject({
      passed: false,
      forbiddenRequests: forbidden.length,
    })
  })
})
