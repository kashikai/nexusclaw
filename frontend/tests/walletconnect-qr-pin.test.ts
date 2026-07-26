import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const rainbowKitRequire = createRequire(
  join(
    process.cwd(),
    'node_modules',
    '@rainbow-me',
    'rainbowkit',
    'package.json',
  ),
)
const cuerPackagePath = rainbowKitRequire.resolve('cuer/package.json')
const cuerRequire = createRequire(cuerPackagePath)
const qrPackagePath = join(dirname(cuerRequire.resolve('qr')), 'package.json')

const fakeWalletConnectUri =
  `wc:${'0'.repeat(64)}@2?relay-protocol=irn&symKey=${'1'.repeat(64)}`

describe('WalletConnect QR dependency pin', () => {
  it('resolves cuer 0.0.3 to qr 0.5.5', () => {
    const cuerPackage = JSON.parse(readFileSync(cuerPackagePath, 'utf8')) as {
      version: string
    }
    const qrPackage = JSON.parse(readFileSync(qrPackagePath, 'utf8')) as {
      version: string
    }

    expect(cuerPackage.version).toBe('0.0.3')
    expect(qrPackage.version).toBe('0.5.5')
  })

  it('renders a non-empty QR SVG for a fictional WalletConnect URI', async () => {
    const cuerEntry = rainbowKitRequire.resolve('cuer')
    const { Cuer } = await import(pathToFileURL(cuerEntry).href)

    const renderQr = () =>
      renderToStaticMarkup(
        createElement(Cuer, {
          size: 200,
          value: fakeWalletConnectUri,
        }),
      )

    expect(renderQr).not.toThrow('invalid border=0')

    const markup = renderQr()
    expect(markup).toContain('<svg')
    expect(markup).toContain('<title>QR Code</title>')
    expect(markup).toMatch(/<(path|rect)\b/)
  })
})
