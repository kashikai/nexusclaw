import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const frontendRoot = process.cwd()
const repositoryRoot = resolve(frontendRoot, '..')
const packageJson = JSON.parse(
  readFileSync(resolve(frontendRoot, 'package.json'), 'utf8'),
)
const packageLock = JSON.parse(
  readFileSync(resolve(frontendRoot, 'package-lock.json'), 'utf8'),
)

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry)
    if (statSync(path).isDirectory()) {
      return sourceFiles(path)
    }
    return /\.(?:ts|tsx|js|mjs)$/.test(path) ? [path] : []
  })
}

describe('production dependency security gate', () => {
  it('scopes patched Sharp and Axios to their proven consumers', () => {
    expect(packageJson.overrides.next).toEqual({ sharp: '0.35.3' })
    expect(packageJson.overrides['@coinbase/cdp-sdk']).toEqual({
      axios: '1.18.1',
    })
    expect(packageJson.dependencies).not.toHaveProperty('sharp')
    expect(packageJson.dependencies).not.toHaveProperty('axios')

    expect(packageLock.packages['node_modules/sharp'].version).toBe('0.35.3')
    expect(packageLock.packages['node_modules/axios'].version).toBe('1.18.1')
  })

  it('preserves the reviewed Next, React and wallet stack', () => {
    expect(packageJson.dependencies).toMatchObject({
      next: '15.5.21',
      react: '19.2.8',
      'react-dom': '19.2.8',
      '@rainbow-me/rainbowkit': '2.2.11',
      wagmi: '2.19.5',
      viem: '2.55.8',
    })
    expect(packageJson.overrides['@wagmi/connectors']).toEqual({
      '@walletconnect/ethereum-provider': '2.23.10',
    })
    expect(packageJson.overrides.cuer).toEqual({ qr: '0.5.5' })
  })

  it('does not expose Axios configuration to NexusClaw request input', () => {
    const roots = [
      'app',
      'components',
      'config',
      'features',
      'scripts',
    ].map((directory) => resolve(frontendRoot, directory))
    const source = roots
      .flatMap((root) => sourceFiles(root))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')

    expect(source).not.toMatch(
      /(?:from\s+['"]axios['"]|require\(['"]axios['"]\)|axios\.(?:create|request|get|post|put|patch|delete)\s*\()/,
    )
  })

  it('keeps next/image limited to repository-controlled local assets', () => {
    const imageConsumers = [
      resolve(frontendRoot, 'app', 'HomeContent.tsx'),
      resolve(
        frontendRoot,
        'features',
        'county-hunter',
        'components',
        'CountyHunterShell.tsx',
      ),
    ].map((path) => readFileSync(path, 'utf8'))

    expect(imageConsumers).toHaveLength(2)
    for (const source of imageConsumers) {
      expect(source).toContain("from 'next/image'")
      expect(source).toMatch(/<Image[\s\S]*?src="\/[^"]+"/)
      expect(source).not.toMatch(/<Image[\s\S]*?src=\{[^'"]/)
    }

    const nextConfig = readFileSync(
      resolve(frontendRoot, 'next.config.js'),
      'utf8',
    )
    expect(nextConfig).not.toMatch(/remotePatterns|domains\s*:|unoptimized\s*:/)

    const migrationSources = sourceFiles(
      resolve(repositoryRoot, 'scripts'),
    ).map((path) => readFileSync(path, 'utf8'))
    expect(migrationSources.join('\n')).not.toMatch(
      /(?:sharp\s*\(|image\/(?:gif|tiff|vips)|multipart\/form-data)/i,
    )
  })
})
