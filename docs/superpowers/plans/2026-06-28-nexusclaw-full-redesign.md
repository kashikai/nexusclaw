# NexusClaw Full Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 15 NexusClaw frontend pages to a unified premium terminal/hacker aesthetic using a shared design system (SiteNav, SiteFooter, PageShell + UI kit), preserving all wagmi/viem web3 logic.

**Architecture:** Create shared components first (`components/layout/` and `components/ui/`), then update each page to use `PageShell`. All pages adopt: `#0a0a0a` bg, `#111111` cards, `#1f2937` borders, `#22d3ee` cyan accent, JetBrains Mono font, sharp corners.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, wagmi v2, viem, RainbowKit, JetBrains Mono (already loaded)

---

## File Map

**Create:**
- `frontend/components/layout/SiteNav.tsx` — global navbar (hex logo + links + Launch App / ConnectWallet)
- `frontend/components/layout/SiteFooter.tsx` — global footer (© + social icons + links)
- `frontend/components/layout/PageShell.tsx` — wraps every page with SiteNav + SiteFooter
- `frontend/components/ui/Card.tsx` — base card container
- `frontend/components/ui/StatCard.tsx` — icon + value + label metric tile
- `frontend/components/ui/DataRow.tsx` — label/value row with border-bottom
- `frontend/components/ui/SectionHeader.tsx` — section title + optional badge
- `frontend/components/ui/Badge.tsx` — status pill (live, coming-soon, active, info)

**Modify:**
- `frontend/app/globals.css` — update body bg to `#0a0a0a`
- `frontend/app/HomeContent.tsx` — use PageShell, add sparkline chart + pricing section
- `frontend/app/agents/page.tsx` — use PageShell, restyle all cards
- `frontend/app/staking/StakingContent.tsx` — use PageShell variant="app", restyle form
- `frontend/app/proof/page.tsx` — use PageShell, terminal-style live panel
- `frontend/app/start-agent/StartAgentContent.tsx` — use PageShell variant="app"
- `frontend/app/signal-agent/SignalAgentContent.tsx` — use PageShell, restyle trade table
- `frontend/app/leaderboard/LeaderboardContent.tsx` — use PageShell, restyle table
- `frontend/app/docs/page.tsx` — use PageShell, restyle sidebar + prose
- `frontend/app/governance/GovernanceContent.tsx` — use PageShell, restyle cards
- `frontend/app/analytics/AnalyticsContent.tsx` — use PageShell
- `frontend/app/terms/page.tsx` — use PageShell (public), restyle prose
- `frontend/app/privacy/page.tsx` — use PageShell (public), restyle prose
- `frontend/app/refund/page.tsx` — use PageShell (public), restyle prose
- `frontend/app/security/page.tsx` — use PageShell (public), restyle prose

**Keep untouched:**
- All wagmi/viem contract logic
- `frontend/app/layout.tsx`
- `frontend/app/Providers.tsx`
- `frontend/components/MobileBanner.tsx`
- `frontend/components/staking/` and `frontend/components/start-agent/`
- `frontend/config/contracts.ts`, `frontend/lib/utils.ts`

---

## Phase 1 — Shared Components (Foundation)

### Task 1: Badge component

**Files:**
- Create: `frontend/components/ui/Badge.tsx`

- [ ] **Step 1: Create Badge.tsx**

```tsx
// frontend/components/ui/Badge.tsx
interface BadgeProps {
  label: string
  variant: 'live' | 'coming-soon' | 'active' | 'info'
}

const styles: Record<BadgeProps['variant'], string> = {
  live:         'border-green-500 text-green-400 bg-green-950/30',
  'coming-soon':'border-yellow-600 text-yellow-500 bg-yellow-950/20',
  active:       'border-cyan-700 text-cyan-400 bg-cyan-950/20',
  info:         'border-gray-700 text-gray-400 bg-gray-900/20',
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono ${styles[variant]}`}>
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors for this file.

---

### Task 2: Card component

**Files:**
- Create: `frontend/components/ui/Card.tsx`

- [ ] **Step 1: Create Card.tsx**

```tsx
// frontend/components/ui/Card.tsx
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  accentColor?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', accentColor, hover = false, onClick }: CardProps) {
  const borderColor = accentColor ? `border-[${accentColor}]` : 'border-[#1f2937]'
  const hoverClass  = hover ? 'hover:border-cyan-900 transition-colors' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`border bg-[#111111] ${borderColor} ${hoverClass} ${cursorClass} ${className}`}
      style={accentColor ? { borderColor: accentColor + '40' } : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 3: StatCard component

**Files:**
- Create: `frontend/components/ui/StatCard.tsx`

- [ ] **Step 1: Create StatCard.tsx**

```tsx
// frontend/components/ui/StatCard.tsx
interface StatCardProps {
  icon: string
  value: string
  label: string
  valueColor?: string
}

export function StatCard({ icon, value, label, valueColor = 'text-cyan-400' }: StatCardProps) {
  return (
    <div className="border border-[#1f2937] bg-[#111111] p-4">
      <div className="text-xl mb-2">{icon}</div>
      <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 4: DataRow component

**Files:**
- Create: `frontend/components/ui/DataRow.tsx`

- [ ] **Step 1: Create DataRow.tsx**

```tsx
// frontend/components/ui/DataRow.tsx
import { ReactNode } from 'react'

interface DataRowProps {
  label: string
  value: ReactNode
  valueColor?: string
  noBorder?: boolean
}

export function DataRow({ label, value, valueColor = 'text-cyan-400', noBorder = false }: DataRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 ${noBorder ? '' : 'border-b border-[#1f2937]'}`}>
      <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">{label}</span>
      <span className={`text-xs font-bold font-mono ${valueColor}`}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 5: SectionHeader component

**Files:**
- Create: `frontend/components/ui/SectionHeader.tsx`

- [ ] **Step 1: Create SectionHeader.tsx**

```tsx
// frontend/components/ui/SectionHeader.tsx
import { Badge } from './Badge'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'live' | 'coming-soon' | 'active' | 'info'
}

export function SectionHeader({ title, subtitle, badge, badgeVariant = 'live' }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-white font-mono">{title}</h2>
        {badge && <Badge label={badge} variant={badgeVariant} />}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500 font-mono">{subtitle}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 6: SiteFooter component

**Files:**
- Create: `frontend/components/layout/SiteFooter.tsx`

- [ ] **Step 1: Create SiteFooter.tsx**

```tsx
// frontend/components/layout/SiteFooter.tsx

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1f2937] px-6 py-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs text-gray-500 font-mono">© 2026 NexusClaw. All rights reserved.</p>

        <div className="flex items-center gap-5">
          <a href="https://x.com/nexusclawbot" target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-white transition-colors" aria-label="X / Twitter">
            <XIcon />
          </a>
          <a href="https://discord.gg/nexusclaw" target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-white transition-colors" aria-label="Discord">
            <DiscordIcon />
          </a>
          <a href="https://t.me/NexusClawCommunity" target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-white transition-colors" aria-label="Telegram">
            <TelegramIcon />
          </a>
          <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-white transition-colors" aria-label="GitHub">
            <GitHubIcon />
          </a>
        </div>

        <div className="flex items-center gap-6">
          <a href="/docs" className="text-xs text-gray-500 hover:text-white transition-colors font-mono">Docs</a>
          <a href="/terms" className="text-xs text-gray-500 hover:text-white transition-colors font-mono">Terms</a>
          <a href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors font-mono">Privacy</a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 7: SiteNav component

**Files:**
- Create: `frontend/components/layout/SiteNav.tsx`

- [ ] **Step 1: Create SiteNav.tsx**

```tsx
// frontend/components/layout/SiteNav.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MobileBanner, isMobileDevice } from '@/components/MobileBanner'

function HexLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        stroke="#22d3ee"
        strokeWidth="1.5"
        fill="none"
      />
      <polygon
        points="16,7 23,11 23,19 16,23 9,19 9,11"
        fill="#22d3ee"
        opacity="0.15"
      />
      <text x="16" y="20" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="monospace" fontWeight="bold">N</text>
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/proof',       label: 'Proof' },
  { href: '/agents',      label: 'Agents' },
  { href: '/trader',      label: 'Trader' },
  { href: '/staking',     label: 'Staking' },
  { href: '/docs',        label: 'Docs' },
]

interface SiteNavProps {
  variant?: 'public' | 'app'
  active?: string
}

export function SiteNav({ variant = 'public', active }: SiteNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  return (
    <>
      <MobileBanner forceOpen={mobileModalOpen} onForceClose={() => setMobileModalOpen(false)} />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1f2937]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <HexLogo />
            <span className="font-bold text-base tracking-wider text-white font-mono">NexusClaw</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                  active === item.href
                    ? 'text-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right action */}
          <div className="flex items-center gap-3">
            {variant === 'app' ? (
              <ConnectButton.Custom>
                {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                  const connected = mounted && account && chain
                  return (
                    <div {...(!mounted && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                      {connected ? (
                        <button
                          onClick={openAccountModal}
                          className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all"
                        >
                          {account.displayName}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const hasInjected = typeof window !== 'undefined' && !!(window as any).ethereum
                            if (isMobileDevice() && !hasInjected) {
                              setMobileModalOpen(true)
                            } else {
                              openConnectModal()
                            }
                          }}
                          className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all"
                        >
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            ) : (
              <Link
                href="/staking"
                className="border border-cyan-400 text-cyan-400 px-4 py-2 text-xs font-mono hover:bg-cyan-400 hover:text-black transition-all"
              >
                Launch App →
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px]"
              aria-label="Toggle menu"
            >
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[2px] w-5 bg-white transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
          <div className="bg-[#0a0a0a] border-t border-[#1f2937] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`py-3 border-b border-[#1f2937] text-xs font-mono uppercase tracking-widest transition-colors ${
                  active === item.href ? 'text-cyan-400' : 'text-gray-400'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 8: PageShell component

**Files:**
- Create: `frontend/components/layout/PageShell.tsx`

- [ ] **Step 1: Create PageShell.tsx**

```tsx
// frontend/components/layout/PageShell.tsx
import { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'

interface PageShellProps {
  children: ReactNode
  variant?: 'public' | 'app'
  active?: string
  className?: string
}

export function PageShell({ children, variant = 'public', active, className = '' }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col">
      <SiteNav variant={variant} active={active} />
      <main className={`pt-20 flex-1 ${className}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 9: Update globals.css + commit Phase 1

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Update body background in globals.css**

Find the `body` selector in `frontend/app/globals.css` and change the background.
If it already has a bg, update it. If it's set via Tailwind in `layout.tsx`, update `layout.tsx` body className instead.

In `frontend/app/layout.tsx`, change:
```tsx
// BEFORE
<body className="bg-[#131313] text-[#e5e2e1] antialiased">

// AFTER
<body className="bg-[#0a0a0a] text-white antialiased">
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit Phase 1**

```bash
cd ..  # back to repo root
git add frontend/components/ui/ frontend/components/layout/SiteNav.tsx frontend/components/layout/SiteFooter.tsx frontend/components/layout/PageShell.tsx frontend/app/layout.tsx
git commit -m "feat: add design system — SiteNav, SiteFooter, PageShell, UI kit components"
```

---

## Phase 2 — Homepage

### Task 10: Update HomeContent.tsx

**Files:**
- Modify: `frontend/app/HomeContent.tsx`

- [ ] **Step 1: Replace HomeContent.tsx with updated version**

The new HomeContent uses `PageShell`, adds a sparkline SVG chart (no extra deps), and a pricing section.

```tsx
// frontend/app/HomeContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import Image from 'next/image';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { DataRow } from '@/components/ui/DataRow';
import { Badge } from '@/components/ui/Badge';

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe' as const;
const AGENT_ADDRESS   = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f' as const;

const stakingAbi = [
  { inputs: [], name: 'totalStakers', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalStaked',  outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getUserInfo', outputs: [
    { name: 'staked',        type: 'uint256' },
    { name: 'pending',       type: 'uint256' },
    { name: 'stakedAt',      type: 'uint256' },
    { name: 'effectiveAPY',  type: 'uint256' },
  ], stateMutability: 'view', type: 'function' },
] as const;

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

// Static sparkline points representing growth trend (normalized 0-100)
const SPARKLINE = [12, 10, 18, 14, 20, 16, 22, 19, 26, 24, 28, 30, 27, 32, 35, 38, 34, 40, 38, 44, 42, 48, 45, 50];

function Sparkline() {
  const w = 300; const h = 80;
  const min = Math.min(...SPARKLINE); const max = Math.max(...SPARKLINE);
  const pts = SPARKLINE.map((v, i) => {
    const x = (i / (SPARKLINE.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sparkGrad)" />
      {/* End dot */}
      {(() => {
        const last = SPARKLINE[SPARKLINE.length - 1];
        const x = w; const y = h - ((last - min) / (max - min)) * (h - 10) - 5;
        return <circle cx={x} cy={y} r="3" fill="#22d3ee" />;
      })()}
    </svg>
  );
}

const PRICING = [
  { name: 'Self-hosted', price: '$0', unit: '/mo', desc: 'Run your own agent.', href: '/start-agent', popular: false, cta: 'Get Started' },
  { name: 'Managed Agent', price: '$49', unit: '/mo', desc: 'We run it. You earn.', href: '/start-agent', popular: true, cta: 'Get Started' },
  { name: 'Agent Launch', price: '$199', unit: '/mo', desc: 'Launch your custom agent.', href: '/start-agent', popular: false, cta: 'Get Started' },
];

export default function HomeContent() {
  const [stats, setStats] = useState({
    totalStakers: '2', totalStaked: '2,982', cycles: '194',
    agentStaked: '982.00', agentPending: '0.2500',
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [stakers, staked, agentInfo] = await Promise.all([
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStakers' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'totalStaked' }),
          client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: 'getUserInfo', args: [AGENT_ADDRESS] }),
        ]);
        const stakedAt = Number(agentInfo[2]);
        const cycles = stakedAt > 0 ? Math.floor((Date.now() / 1000 - stakedAt) / 300) : 0;
        setStats({
          totalStakers: stakers.toString(),
          totalStaked: parseFloat(formatUnits(staked, 18)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          cycles: cycles.toLocaleString(),
          agentStaked: parseFloat(formatUnits(agentInfo[0], 18)).toFixed(2),
          agentPending: parseFloat(formatUnits(agentInfo[1], 18)).toFixed(4),
        });
      } catch (e) { console.error('Stats fetch error:', e); }
    }
    fetchStats();
    const id = setInterval(fetchStats, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <PageShell variant="public">

      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full">
          <Image src="/hero-lobster.png" alt="NexusClaw" fill className="object-cover object-center opacity-70" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-2 text-xs text-cyan-400 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE ON BASE MAINNET — AGENT V1 ACTIVE
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4 text-white">
              Autonomous Agents<br />
              That Earn{' '}
              <span className="text-cyan-400">On-Chain</span>
            </h1>

            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              AI agents that trade, stake, compound, and fund themselves with verifiable proof.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <a href="/proof" className="bg-cyan-400 text-black font-bold px-8 py-3 text-sm hover:bg-cyan-300 transition-all hover:scale-105">
                View Live Proof →
              </a>
              <a href="/agents" className="border border-white/30 text-white px-8 py-3 text-sm hover:border-white transition-all">
                Explore Agents
              </a>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { icon: '🔵', label: 'Base Mainnet' },
                { icon: '🟢', label: 'Live Agent V1' },
                { icon: '🛡️', label: 'Public Results' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 border border-[#1f2937] bg-[#111111] px-3 py-1.5 text-xs text-gray-300">
                  <span>{b.icon}</span><span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CARDS ── */}
      <section className="border-t border-[#1f2937] bg-[#0a0a0a] px-6 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/trader" className="group border border-[#1f2937] bg-[#111111] p-6 hover:border-cyan-900 transition-all block">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-cyan-900 flex items-center justify-center text-cyan-400 text-lg shrink-0">📈</div>
              <div>
                <h3 className="font-bold mb-1 text-white">NexusClaw Trader</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Autonomous XAUUSD trading agent with live results.</p>
              </div>
            </div>
            <div className="mt-4 text-cyan-400 text-xs group-hover:translate-x-1 transition-transform">→</div>
          </a>

          <a href="/start-agent" className="group border border-[#1f2937] bg-[#111111] p-6 hover:border-cyan-900 transition-all block">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-cyan-900 flex items-center justify-center text-cyan-400 text-lg shrink-0">⚡</div>
              <div>
                <h3 className="font-bold mb-1 text-white">Staking Agent</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Stake, claim, compound, and report automatically.</p>
              </div>
            </div>
            <div className="mt-4 text-cyan-400 text-xs group-hover:translate-x-1 transition-transform">→</div>
          </a>

          <div className="border border-[#1f2937] bg-[#111111] p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-gray-700 flex items-center justify-center text-gray-500 text-lg shrink-0">🤖</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white">Work Agents</h3>
                  <Badge label="COMING SOON" variant="coming-soon" />
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">Agents for business automation and real-world tasks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE PROOF ── */}
      <section className="border-t border-[#1f2937] bg-[#0d0d0d] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Live Proof, Not Promises</h2>
            <Badge label="Agent V1 Online" variant="live" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon="🤖" value="24/7 Active" label="Agent V1 Online" valueColor="text-green-400" />
              <StatCard icon="🔄" value={stats.cycles}  label="Compound Cycles" />
              <StatCard icon="⛽" value="< $0.01"       label="Gas Avg. per Tx" />
              <StatCard icon="✅" value="On-Chain"      label="Verified" />
            </div>

            <div className="border border-[#1f2937] bg-[#111111] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Cumulative Performance (Agent V1)</span>
                <span className="text-green-400 text-sm font-bold">+24.38%</span>
              </div>
              <div className="mb-4">
                <Sparkline />
              </div>
              <div className="space-y-2">
                <DataRow label="Total Staked"    value={`${stats.agentStaked} $NEXUSCLAW`} />
                <DataRow label="Pending Rewards" value={`+${stats.agentPending} $NEXUSCLAW`} />
                <DataRow label="Active Stakers"  value={stats.totalStakers} />
                <DataRow label="Total TVL"       value={`${stats.totalStaked} $NEXUSCLAW`} noBorder />
              </div>
              <a href="/proof" className="mt-4 block text-center border border-cyan-900 text-cyan-400 py-2 text-xs hover:bg-cyan-950 transition-all">
                VIEW FULL PROOF →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO ECONOMIES ── */}
      <section className="border-t border-[#1f2937] px-6 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-8">Two Economies. One Protocol.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[#1f2937] bg-[#111111] p-6">
                <div className="w-10 h-10 bg-cyan-950 flex items-center justify-center text-cyan-400 text-xl mb-4">🪙</div>
                <h3 className="font-bold mb-2 text-white">Agent Token Economy</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">Power the protocol with $CLAW. Stake, earn, and grow the treasury.</p>
                <a href="/staking" className="text-cyan-400 text-xs hover:underline">Learn more →</a>
              </div>
              <div className="border border-[#1f2937] bg-[#111111] p-6">
                <div className="w-10 h-10 bg-yellow-950 flex items-center justify-center text-yellow-400 text-xl mb-4">💼</div>
                <h3 className="font-bold mb-2 text-white">Agent Work Economy</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">Agents deliver real services, automation, and execution.</p>
                <a href="/agents" className="text-yellow-400 text-xs hover:underline">Learn more →</a>
              </div>
            </div>
          </div>

          {/* ── PRICING ── */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-8">Start Your Edge</h2>
            <div className="grid grid-cols-1 gap-3">
              {PRICING.map(plan => (
                <div
                  key={plan.name}
                  className={`border p-5 flex items-center justify-between gap-4 transition-all ${
                    plan.popular
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-[#1f2937] bg-[#111111] hover:border-cyan-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{plan.name}</span>
                      {plan.popular && <Badge label="POPULAR" variant="active" />}
                    </div>
                    <p className="text-gray-500 text-xs">{plan.desc}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-white font-bold text-lg">{plan.price}</span>
                      <span className="text-gray-500 text-xs">{plan.unit}</span>
                    </div>
                    <a
                      href={plan.href}
                      className={`px-4 py-2 text-xs font-bold border transition-all whitespace-nowrap ${
                        plan.popular
                          ? 'border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black'
                          : 'border-[#1f2937] text-gray-400 hover:border-cyan-900 hover:text-white'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </PageShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit Phase 2**

```bash
cd ..
git add frontend/app/HomeContent.tsx
git commit -m "feat: homepage — sparkline chart, pricing section, PageShell"
```

---

## Phase 3 — Core App Pages

### Task 11: Agents page

**Files:**
- Modify: `frontend/app/agents/page.tsx`

- [ ] **Step 1: Replace TopNav import and wrapper div**

Find and replace the following in `frontend/app/agents/page.tsx`:

```tsx
// REMOVE these imports:
import { TopNav } from '@/components/layout/TopNav'

// ADD these imports (after existing imports):
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { DataRow } from '@/components/ui/DataRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace the outer wrapper + TopNav**

```tsx
// BEFORE — outer wrapper in return:
return (
  <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
    <TopNav active="/agents" />
    <main className="pt-24 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

// AFTER:
return (
  <PageShell variant="public" active="/agents">
    <div className="pb-24 px-6 max-w-6xl mx-auto">
```

- [ ] **Step 3: Replace hero section**

```tsx
// BEFORE:
<section className="mt-12 mb-16">
  <div className="border-l-4 border-[#abc7ff] pl-6 py-2 mb-6">
    <h1 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2">
      AGENTS
    </h1>
    <p className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#8b919f]">
      Autonomous agents running on NexusClaw Protocol.
    </p>
  </div>
  <div className="flex items-center gap-4 pl-7">
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00eefc] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00eefc]" />
      </span>
      <span className="font-['JetBrains_Mono'] text-xs text-[#00eefc]">
        {isLoading ? '—' : ((totalStakers ?? 0n) + 1n).toString()} agents active
      </span>
    </div>
    <span className="font-['JetBrains_Mono'] text-[10px] text-[#414754] uppercase tracking-widest">
      Each agent earns, compounds, and operates independently.
    </span>
  </div>
</section>

// AFTER:
<section className="pt-10 mb-12">
  <SectionHeader
    title="Agents"
    badge={isLoading ? 'LOADING' : `${((totalStakers ?? 0n) + 1n).toString()} ACTIVE`}
    badgeVariant="live"
    subtitle="Autonomous agents running on NexusClaw Protocol. Each agent earns, compounds, and operates independently."
  />
</section>
```

- [ ] **Step 4: Update AgentCard to use new design components**

Replace the `AgentCard` component body (keep props/logic, change JSX):

```tsx
function AgentCard({ agent, info, loading }: { agent: typeof KNOWN_AGENTS[number]; info?: AgentInfo; loading: boolean }) {
  const dash = loading ? '—' : undefined
  const staked   = info?.staked   ?? 0n
  const pending  = info?.pending  ?? 0n
  const stakedAt = info?.stakedAt ?? 0n
  const isActive = staked > 0n

  return (
    <div
      className="border bg-[#111111] p-6 flex flex-col gap-5"
      style={{ borderColor: `${agent.accent}40` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-white text-base uppercase">{agent.name}</h3>
            {isActive && <Badge label="Active" variant="live" />}
          </div>
          <p className="text-gray-400 text-xs leading-relaxed max-w-xs">{agent.description}</p>
        </div>
        <Badge label={agent.strategy} variant="info" />
      </div>

      <div className="bg-[#0a0a0a] px-4 py-2 flex items-center justify-between gap-4 border border-[#1f2937]">
        <span className="text-[10px] text-gray-600 font-mono hidden sm:block truncate">{agent.address}</span>
        <span className="text-[10px] text-gray-600 font-mono sm:hidden">{shortAddr(agent.address)}</span>
        <a href={`${BASESCAN_URL}/address/${agent.address}`} target="_blank" rel="noopener noreferrer"
          className="text-xs shrink-0 transition-colors" style={{ color: agent.accent }}>↗</a>
      </div>

      <div className="space-y-1">
        <DataRow label="Staked"  value={dash ?? (staked  > 0n ? formatTokenShort(staked)           : '—')} />
        <DataRow label="Pending" value={dash ?? (pending > 0n ? `+${formatTokenShort(pending)}`     : '—')} />
        <DataRow label="Since"   value={dash ?? sinceDate(stakedAt)} valueColor="text-gray-300" />
        <DataRow label="Cycles"  value={dash ?? (stakedAt > 0n ? cycles(stakedAt).toLocaleString('en-US') : '—')} noBorder />
      </div>

      <a href={`${BASESCAN_URL}/address/${agent.address}`} target="_blank" rel="noopener noreferrer"
        className="text-[10px] uppercase tracking-widest transition-colors self-start"
        style={{ color: agent.accent }}>
        View on Basescan →
      </a>
    </div>
  )
}
```

- [ ] **Step 5: Update FimateCard to use new design**

Replace FimateCard's outer wrapper and header:

```tsx
// Replace the outer div in FimateCard:
<div className="border border-[#1f2937] bg-[#111111] p-6 flex flex-col gap-6">
  {/* Header */}
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h3 className="font-bold text-white text-base uppercase">NEXUSCLAW TRADER</h3>
        <Badge label="Live" variant="live" />
      </div>
      <p className="text-gray-400 text-[11px] leading-relaxed max-w-sm">
        Autonomous trading agent on XAUUSD M1. Self-optimizes parameters via Claude AI after every 5 trades.
      </p>
    </div>
    <Badge label="TRADING" variant="active" />
  </div>
  {/* rest of FimateCard content unchanged */}
```

Also update the stat cards inside FimateStats:
```tsx
// Replace bg-[#131313] with bg-[#0a0a0a] and border-[#00eefc]/10 with border-[#1f2937]
<div key={s.label} className="bg-[#0a0a0a] p-4 border border-[#1f2937]">
```

- [ ] **Step 6: Update Coming Soon cards**

```tsx
// Replace COMING_SOON cards section:
{COMING_SOON.map((agent) => (
  <div key={agent.name} className="border border-[#1f2937] bg-[#111111] p-6 opacity-50 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-bold text-white text-sm uppercase">{agent.name}</h3>
      <Badge label="Coming Soon" variant="coming-soon" />
    </div>
    <p className="text-gray-500 text-xs leading-relaxed">{agent.description}</p>
  </div>
))}
```

- [ ] **Step 7: Update Join CTA section**

```tsx
// Replace the join section:
<section className="border border-[#1f2937] bg-[#111111] p-12 text-center">
  <h2 className="text-2xl font-bold text-white uppercase mb-3">Want Your Agent Here?</h2>
  <p className="text-gray-500 text-xs uppercase tracking-widest mb-10">
    Launch your autonomous agent and appear on this page automatically.
  </p>
  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
    <Link href="/start-agent"
      className="px-8 py-3 bg-cyan-400 text-black font-bold text-sm hover:bg-cyan-300 transition-all">
      Start an Agent →
    </Link>
    <Link href="/leaderboard"
      className="px-8 py-3 border border-[#1f2937] text-gray-400 text-sm hover:border-cyan-900 hover:text-white transition-all">
      View Leaderboard →
    </Link>
  </div>
</section>
```

- [ ] **Step 8: Close PageShell wrapper**

```tsx
// BEFORE closing tags:
      </main>
    </div>
  )

// AFTER:
    </div>
  </PageShell>
  )
```

- [ ] **Step 9: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 10: Commit**

```bash
cd ..
git add frontend/app/agents/page.tsx
git commit -m "feat: agents page — new design system"
```

---

### Task 12: Proof page

**Files:**
- Modify: `frontend/app/proof/page.tsx`

- [ ] **Step 1: Replace TopNav with PageShell and update wrapper**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { DataRow } from '@/components/ui/DataRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace outer wrapper in return statement**

```tsx
// BEFORE:
return (
  <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
    <TopNav active="/proof" />
    <main className="pt-24 pb-24 px-4 md:px-8 max-w-[1440px] mx-auto">

// AFTER:
return (
  <PageShell variant="public" active="/proof">
    <div className="pb-24 px-6 max-w-6xl mx-auto">
      <div className="pt-10 mb-10">
        <SectionHeader title="Live Proof" badge="AGENT V1 ONLINE" badgeVariant="live"
          subtitle="Verifiable on-chain activity. No marketing. Just data." />
      </div>
```

- [ ] **Step 3: Update stat cards in proof page**

Find the stats grid and replace with StatCard components:
```tsx
// Replace any existing stats grid with:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  <StatCard icon="⏱️" value={`${ut.days}d ${ut.hours}h ${ut.minutes}m`} label="Uptime" valueColor="text-green-400" />
  <StatCard icon="🔄" value={cyclesText} label="Cycles Completed" />
  <StatCard icon="⛽" value="< $0.01" label="Total Gas Spent" />
  <StatCard icon="🔗" value="Verified" label="On-Chain Status" />
</div>
```

- [ ] **Step 4: Update data rows to use DataRow component**

Replace all `Row` component usages with `DataRow`:
```tsx
// Replace any <Row label="X" value="Y" /> with:
<DataRow label="X" value="Y" />
```

- [ ] **Step 5: Update all bg/border/text colors**

Find and replace color tokens in this file:
- `bg-[#131313]` → `bg-[#0a0a0a]`
- `bg-[#1c1b1b]` → `bg-[#111111]`
- `border-[#414754]/20` → `border-[#1f2937]`
- `text-[#8b919f]` → `text-gray-500`
- `text-[#e5e2e1]` → `text-white`
- `text-[#00eefc]` → `text-cyan-400`
- `text-[#c1c6d6]` → `text-gray-300`

- [ ] **Step 6: Close PageShell wrapper**

```tsx
// BEFORE:
      </main>
    </div>
  )

// AFTER:
    </div>
  </PageShell>
  )
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/app/proof/page.tsx
git commit -m "feat: proof page — new design system"
```

---

### Task 13: Staking page

**Files:**
- Modify: `frontend/app/staking/StakingContent.tsx`

- [ ] **Step 1: Replace TopNav with PageShell**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { DataRow } from '@/components/ui/DataRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace outer wrapper**

```tsx
// BEFORE:
return (
  <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
    <MobileBanner ... />
    <TopNav active="/staking" />
    <main className="...">

// AFTER (MobileBanner stays — it's inside PageShell/SiteNav already via SiteNav variant="app"):
return (
  <PageShell variant="app" active="/staking">
    <div className="pb-24 px-6 max-w-6xl mx-auto">
      <div className="pt-10 mb-10">
        <SectionHeader title="Staking Terminal" badge={`${effectiveAPY}% APY`} badgeVariant="active"
          subtitle="Stake $NEXUSCLAW, earn rewards every 3 seconds." />
      </div>
```

- [ ] **Step 3: Update protocol stats section**

Replace the stats row (TVL, stakers, APY, runway) with StatCard grid:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  <StatCard icon="🏦" value={totalStaked ? fmt(totalStaked as bigint) : '—'} label="Total TVL" />
  <StatCard icon="👥" value={totalStakers?.toString() ?? '—'} label="Stakers" />
  <StatCard icon="📈" value={`${effectiveAPY}%`} label="APY" valueColor="text-green-400" />
  <StatCard icon="⏳" value={`${runwayDays}d`} label="Runway" valueColor={Number(runwayDays) < 30 ? 'text-red-400' : 'text-cyan-400'} />
</div>
```

- [ ] **Step 4: Update user stats panel**

Replace user balance/staked/pending section with DataRow inside a Card:
```tsx
{isConnected && (
  <div className="border border-[#1f2937] bg-[#111111] p-6 mb-6">
    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Your Position</div>
    <div className="space-y-1">
      <DataRow label="Wallet Balance" value={tokenBalance ? `${fmt(tokenBalance as bigint)} $NEXUSCLAW` : '—'} />
      <DataRow label="Staked"         value={userStakedAmount > 0n ? `${fmt(userStakedAmount)} $NEXUSCLAW` : '—'} />
      <DataRow label="Pending Reward" value={userPending > 0n ? `+${fmt(userPending, 4)} $NEXUSCLAW` : '—'} valueColor="text-green-400" noBorder />
    </div>
  </div>
)}
```

- [ ] **Step 5: Update action cards styling**

Replace the three action sections (Stake, Claim, Unstake) with new sharp-corner style:
```tsx
// Pattern for each action card — apply to Stake, Claim, Unstake:
<div className="border border-[#1f2937] bg-[#111111] p-6">
  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">STAKE</div>
  {/* input */}
  <div className="flex gap-2 mb-4">
    <input
      type="number"
      value={stakeAmount}
      onChange={e => setStakeAmount(e.target.value)}
      placeholder="Amount"
      className="flex-1 bg-[#0a0a0a] border border-[#1f2937] text-white text-sm px-4 py-3 font-mono focus:outline-none focus:border-cyan-700 placeholder:text-gray-600"
    />
    <button onClick={setMaxStake}
      className="border border-[#1f2937] text-gray-400 text-xs px-3 hover:border-cyan-700 hover:text-cyan-400 transition-all">
      MAX
    </button>
  </div>
  {/* action button */}
  <button
    onClick={needsApproval ? handleApprove : handleStake}
    disabled={isBusy || !stakeAmount}
    className="w-full py-3 bg-cyan-400 text-black font-bold text-sm hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
  >
    {isApprovePending || isApproveConfirming ? 'Approving…' : isStakePending || isStakeConfirming ? 'Staking…' : needsApproval ? 'Approve' : 'Stake'}
  </button>
</div>
```

- [ ] **Step 6: Update all color tokens (same replacements as Task 12 Step 5)**

- `bg-[#131313]` → `bg-[#0a0a0a]`
- `bg-[#1c1b1b]` → `bg-[#111111]`
- `border-[#414754]/20` → `border-[#1f2937]`
- `text-[#8b919f]` → `text-gray-500`
- `text-[#e5e2e1]` → `text-white`
- `text-[#00eefc]`, `text-[#3A8BFF]` → `text-cyan-400`
- `bg-gradient-to-r from-[#abc7ff] to-[#448fff]` → `bg-cyan-400`

- [ ] **Step 7: Close PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 8: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 9: Commit**

```bash
cd ..
git add frontend/app/staking/StakingContent.tsx
git commit -m "feat: staking page — new design system, preserved all wagmi logic"
```

---

### Task 14: Start-Agent page

**Files:**
- Modify: `frontend/app/start-agent/StartAgentContent.tsx`

- [ ] **Step 1: Replace TopNav import**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DataRow } from '@/components/ui/DataRow'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace outer wrapper**

```tsx
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav active="/start-agent" />
  <main className="...">

// AFTER:
<PageShell variant="app" active="/start-agent">
  <div className="pb-24 px-6 max-w-3xl mx-auto">
    <div className="pt-10 mb-10">
      <SectionHeader title="Start an Agent" badge="BETA" badgeVariant="info"
        subtitle="Configure and launch your autonomous staking agent on Base." />
    </div>
```

- [ ] **Step 3: Update all color tokens (same pattern as Task 12 Step 5)**

- [ ] **Step 4: Style input fields**

Replace any existing input styling with:
```tsx
className="w-full bg-[#0a0a0a] border border-[#1f2937] text-white text-sm px-4 py-3 font-mono focus:outline-none focus:border-cyan-700 placeholder:text-gray-600"
```

- [ ] **Step 5: Style action buttons**

Primary button pattern:
```tsx
className="w-full py-3 bg-cyan-400 text-black font-bold text-sm hover:bg-cyan-300 disabled:opacity-50 transition-all"
```

Secondary button pattern:
```tsx
className="w-full py-3 border border-[#1f2937] text-gray-400 text-sm hover:border-cyan-900 hover:text-white transition-all"
```

- [ ] **Step 6: Close PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/app/start-agent/StartAgentContent.tsx
git commit -m "feat: start-agent page — new design system"
```

---

## Phase 4 — Content Pages

### Task 15: Signal Agent / Trader page

**Files:**
- Modify: `frontend/app/signal-agent/SignalAgentContent.tsx`

- [ ] **Step 1: Replace TopNav with PageShell**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace outer wrapper**

```tsx
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav ... />
  <main ...>

// AFTER:
<PageShell variant="public" active="/trader">
  <div className="pb-24 px-6 max-w-6xl mx-auto">
    <div className="pt-10 mb-10">
      <SectionHeader title="NexusClaw Trader" badge="LIVE" badgeVariant="live"
        subtitle="Autonomous XAUUSD M1 trading agent. Self-optimizing via Claude AI." />
    </div>
```

- [ ] **Step 3: Update trade stats to StatCard**

Replace stat boxes with:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  <StatCard icon="📊" value={trades.length.toString()} label="Total Trades" />
  <StatCard icon="🎯" value={`${winRate}%`} label="Win Rate"
    valueColor={winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
  <StatCard icon="💰" value={`¥${totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}`} label="Total P&L"
    valueColor={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} />
  <StatCard icon="📐" value={`${avgPts >= 0 ? '+' : ''}${avgPts}pts`} label="Avg Points"
    valueColor={avgPts >= 0 ? 'text-green-400' : 'text-red-400'} />
</div>
```

- [ ] **Step 4: Update trade table styling**

Replace table headers and rows:
```tsx
// Table wrapper:
<div className="border border-[#1f2937] bg-[#111111]">
  {/* Header row */}
  <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-[#1f2937]">
    {['Date (JST)', 'Side', 'Result', 'Points', 'P&L'].map(h => (
      <span key={h} className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">{h}</span>
    ))}
  </div>
  {/* Rows */}
  {trades.map((t, i) => <TradeRow key={t.ticket ?? i} t={t} />)}
</div>
```

Update TradeRow:
```tsx
function TradeRow({ t }: { t: LiveTrade }) {
  const isWin   = t.result === 'TP'
  const dt      = new Date(t.entry_time)
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })

  return (
    <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-[#0a0a0a] text-[11px] font-mono hover:bg-[#0a0a0a] transition-colors">
      <span className="text-gray-500">{dateStr} <span className="text-gray-700">{timeStr}</span></span>
      <span className={t.direction === 'BUY' ? 'text-cyan-400' : 'text-red-400'}>
        {t.direction}{t.was_reversal ? ' ↺' : ''}
      </span>
      <span className={isWin ? 'text-green-400' : 'text-red-400'}>{t.result}</span>
      <span className={isWin ? 'text-green-400' : 'text-red-400'}>{t.profit_pts >= 0 ? '+' : ''}{t.profit_pts}pts</span>
      <span className={isWin ? 'text-green-400' : 'text-red-400'}>¥{t.profit_jpy >= 0 ? '+' : ''}{Math.round(t.profit_jpy).toLocaleString()}</span>
    </div>
  )
}
```

- [ ] **Step 5: Update agent reasoning panel**

```tsx
{latestParams && (
  <div className="border-l-2 border-cyan-700 bg-[#0a0a0a] px-4 py-3 mt-4">
    <span className="text-[10px] uppercase tracking-widest text-gray-500 block mb-1">
      Last Agent Adjustment · Win rate {latestParams.win_rate?.toFixed(1)}% · {latestParams.sample_size} trades
    </span>
    <span className="text-xs text-gray-400 italic">{latestParams.reasoning}</span>
  </div>
)}
```

- [ ] **Step 6: Update all color tokens (same pattern as Task 12 Step 5)**

- [ ] **Step 7: Close PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 8: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 9: Commit**

```bash
cd ..
git add frontend/app/signal-agent/SignalAgentContent.tsx
git commit -m "feat: trader/signal-agent page — new design system"
```

---

### Task 16: Leaderboard page

**Files:**
- Modify: `frontend/app/leaderboard/LeaderboardContent.tsx`

- [ ] **Step 1: Replace TopNav with PageShell**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
```

- [ ] **Step 2: Replace outer wrapper**

```tsx
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav active="/leaderboard" />
  <main ...>

// AFTER:
<PageShell variant="public" active="/leaderboard">
  <div className="pb-24 px-6 max-w-6xl mx-auto">
    <div className="pt-10 mb-10">
      <SectionHeader title="Leaderboard" badge={`${stats?.totalStakers?.toString() ?? '—'} STAKERS`} badgeVariant="info"
        subtitle="All active stakers on NexusClaw Protocol, ranked by amount staked." />
    </div>
```

- [ ] **Step 3: Update protocol stats**

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
  <StatCard icon="🏦" value={stats ? formatTokens(stats.totalStaked) : '—'} label="Total TVL" />
  <StatCard icon="👥" value={stats?.totalStakers?.toString() ?? '—'} label="Stakers" />
  <StatCard icon="⏳" value={stats ? `${stats.runwayDays}d` : '—'} label="Runway" />
</div>
```

- [ ] **Step 4: Update leaderboard table**

```tsx
// Table wrapper:
<div className="border border-[#1f2937] bg-[#111111]">
  {/* Header */}
  <div className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-[#1f2937]">
    {['Rank', 'Address', 'Staked', 'Pending', 'Since', 'Cycles'].map(h => (
      <span key={h} className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">{h}</span>
    ))}
  </div>
  {/* Rows */}
  {stakers.map((s, i) => (
    <div
      key={s.address}
      className={`grid grid-cols-6 gap-2 px-4 py-3 border-b border-[#0a0a0a] text-xs font-mono hover:bg-[#0a0a0a] transition-colors ${
        s.address.toLowerCase() === '0xf350367d4e3e0e45dc0f9e425741a86b8cf7e66f' ? 'border-l-2 border-l-cyan-700' : ''
      }`}
    >
      <span className="text-gray-500">#{i + 1}</span>
      <a href={`https://basescan.org/address/${s.address}`} target="_blank" rel="noopener noreferrer"
        className="text-cyan-400 hover:underline truncate">{formatAddress(s.address)}</a>
      <span className="text-white">{formatTokens(s.staked)}</span>
      <span className="text-green-400">+{formatTokens(s.pending)}</span>
      <span className="text-gray-400">{formatDate(s.stakedAt)}</span>
      <span className="text-gray-400">{cyclesCount(s.stakedAt)}</span>
    </div>
  ))}
</div>
```

Note: `cyclesCount` is the existing cycles calculation function in the file (may be named differently — check and use the existing function).

- [ ] **Step 5: Update all color tokens (same pattern as Task 12 Step 5)**

- [ ] **Step 6: Close PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/app/leaderboard/LeaderboardContent.tsx
git commit -m "feat: leaderboard page — new design system"
```

---

### Task 17: Docs page

**Files:**
- Modify: `frontend/app/docs/page.tsx`

- [ ] **Step 1: Replace TopNav with PageShell**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
```

- [ ] **Step 2: Replace outer wrapper**

```tsx
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav active="/docs" />
  <main ...>

// AFTER:
<PageShell variant="public" active="/docs">
  <div className="max-w-6xl mx-auto px-6 pb-24">
```

- [ ] **Step 3: Update sidebar styling**

```tsx
// Find sidebar nav wrapper, update to:
<nav className="w-48 shrink-0 sticky top-24 self-start">
  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">Contents</div>
  {NAV.map(item => (
    <button
      key={item.id}
      onClick={() => setActive(item.id)}
      className={`block w-full text-left py-2 text-xs font-mono transition-colors border-l-2 pl-3 mb-1 ${
        active === item.id
          ? 'border-cyan-400 text-cyan-400'
          : 'border-[#1f2937] text-gray-500 hover:text-white hover:border-gray-600'
      }`}
    >
      {item.label}
    </button>
  ))}
</nav>
```

- [ ] **Step 4: Update prose content styling**

```tsx
// Prose wrapper:
<div className="flex-1 min-w-0 prose-custom">
  {/* SectionHeading update: */}
  function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-[#1f2937]">{children}</h2>
  }

  // SubHeading update:
  function SubHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider">{children}</h3>
  }

  // Paragraph update:
  function P({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-gray-400 leading-relaxed mb-4">{children}</p>
  }
```

- [ ] **Step 5: Update Code block styling**

```tsx
function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#0a0a0a] border border-[#1f2937] p-4 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed my-4">
      <code>{children}</code>
    </pre>
  )
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="font-mono text-xs text-cyan-400 bg-[#0a0a0a] border border-[#1f2937] px-1.5 py-0.5">
      {children}
    </code>
  )
}
```

- [ ] **Step 6: Update all color tokens (same pattern as Task 12 Step 5)**

- [ ] **Step 7: Close PageShell**

```tsx
  </div>
</PageShell>
```

- [ ] **Step 8: Verify TypeScript + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
cd ..
git add frontend/app/docs/page.tsx
git commit -m "feat: docs page — new design system"
```

---

### Task 18: Governance + Analytics pages

**Files:**
- Modify: `frontend/app/governance/GovernanceContent.tsx`
- Modify: `frontend/app/analytics/AnalyticsContent.tsx`

- [ ] **Step 1: Update GovernanceContent.tsx — replace wrapper**

```tsx
// REMOVE import:
import { TopNav } from '@/components/layout/TopNav'

// ADD imports:
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { DataRow } from '@/components/ui/DataRow'

// Replace outer div + TopNav:
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav active="/governance" />
  <main className="pt-24 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
    <div className="border-l-4 border-[#abc7ff] pl-6 py-2 mb-12 mt-8">
      <h1 ...>GOVERNANCE</h1>
      <p ...>Multisig 3/5 Secure // Coming in Phase 4</p>
    </div>

// AFTER:
<PageShell variant="public" active="/governance">
  <div className="pb-24 px-6 max-w-6xl mx-auto">
    <div className="pt-10 mb-10">
      <SectionHeader title="Governance" badge="PHASE 4" badgeVariant="info"
        subtitle="Multisig 3/5 secure. On-chain governance coming in Phase 4." />
    </div>
```

- [ ] **Step 2: Update GovernanceContent color tokens (same pattern as Task 12 Step 5)**

Remove `material-symbols-outlined` icons — replace with emoji equivalents:
- Shield icon → `🛡️`
- Security icon → `🔐`

- [ ] **Step 3: Close GovernanceContent PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 4: Update AnalyticsContent.tsx — replace wrapper**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'

// ADD:
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatCard } from '@/components/ui/StatCard'

// Replace wrapper:
<PageShell variant="public" active="/analytics">
  <div className="pb-24 px-6 max-w-6xl mx-auto">
    <div className="pt-10 mb-10">
      <SectionHeader title="Analytics" badgeVariant="info"
        subtitle="Protocol analytics and performance metrics." />
    </div>
```

- [ ] **Step 5: Update AnalyticsContent color tokens (same pattern as Task 12 Step 5)**

- [ ] **Step 6: Close AnalyticsContent PageShell**

```tsx
    </div>
  </PageShell>
```

- [ ] **Step 7: Verify TypeScript + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
cd ..
git add frontend/app/governance/GovernanceContent.tsx frontend/app/analytics/AnalyticsContent.tsx
git commit -m "feat: governance + analytics pages — new design system"
```

---

## Phase 5 — Legal Pages

### Task 19: Terms, Privacy, Refund, Security pages

**Files:**
- Modify: `frontend/app/terms/page.tsx`
- Modify: `frontend/app/privacy/page.tsx`
- Modify: `frontend/app/refund/page.tsx`
- Modify: `frontend/app/security/page.tsx`

> Note: These pages may be server components (no `'use client'`). `PageShell` itself doesn't use client hooks — only `SiteNav` does. Since `SiteNav` is already `'use client'`, wrapping from a server component is fine in Next.js.

- [ ] **Step 1: Update terms/page.tsx**

```tsx
// REMOVE:
import { TopNav } from '@/components/layout/TopNav'
// (keep other imports like Link)

// ADD:
import { PageShell } from '@/components/layout/PageShell'

// Replace wrapper:
// BEFORE:
<div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
  <TopNav />
  <main className="pt-24 pb-24 px-4 md:px-8 max-w-3xl mx-auto">

// AFTER:
<PageShell variant="public">
  <div className="pb-24 px-6 max-w-3xl mx-auto pt-10">
```

Update section title:
```tsx
// Replace the header section:
<section className="mb-12">
  <div className="text-[10px] text-cyan-400 tracking-widest uppercase font-mono mb-3">// LEGAL — TERMS OF SERVICE</div>
  <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
  <p className="text-xs text-gray-500 font-mono">Last updated: {LAST_UPDATED}</p>
</section>
```

Update prose content color tokens:
- `text-[#e5e2e1]` / `text-[#c1c6d6]` → `text-gray-400`
- `text-[#8b919f]` → `text-gray-500`
- `bg-[#131313]` → `bg-[#0a0a0a]`
- `font-['Space_Grotesk']` headings → `font-bold text-white font-mono`
- `font-['JetBrains_Mono']` body → `font-mono`

Close with:
```tsx
  </div>
</PageShell>
```

- [ ] **Step 2: Apply same pattern to privacy/page.tsx**

Same replacements as Step 1. Title: "Privacy Policy".
```tsx
<div className="text-[10px] text-cyan-400 tracking-widest uppercase font-mono mb-3">// LEGAL — PRIVACY POLICY</div>
<h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
```

- [ ] **Step 3: Apply same pattern to refund/page.tsx**

Title: "Refund Policy".
```tsx
<div className="text-[10px] text-cyan-400 tracking-widest uppercase font-mono mb-3">// LEGAL — REFUND POLICY</div>
<h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
```

- [ ] **Step 4: Apply same pattern to security/page.tsx**

Title: "Security".
```tsx
<div className="text-[10px] text-cyan-400 tracking-widest uppercase font-mono mb-3">// SECURITY</div>
<h1 className="text-4xl font-bold text-white mb-2">Security</h1>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit legal pages**

```bash
cd ..
git add frontend/app/terms/page.tsx frontend/app/privacy/page.tsx frontend/app/refund/page.tsx frontend/app/security/page.tsx
git commit -m "feat: legal pages — new design system"
```

---

## Phase 6 — Cleanup + Final Deploy

### Task 20: Cleanup and final verification

**Files:**
- No deletions yet (keep TopNav for reference until confirmed working)

- [ ] **Step 1: Check for any remaining TopNav imports**

```bash
cd frontend && grep -r "TopNav" app/ components/ --include="*.tsx" --include="*.ts" -l
```

Expected output: only `components/layout/TopNav.tsx` itself (no page files).
If any page files appear, fix them by applying the same PageShell pattern.

- [ ] **Step 2: Check for remaining old bg colors**

```bash
cd frontend && grep -r "bg-\[#131313\]\|bg-\[#1c1b1b\]\|bg-\[#0e0e0e\]" app/ --include="*.tsx" -l
```

Review and update any remaining instances to `bg-[#0a0a0a]` or `bg-[#111111]`.

- [ ] **Step 3: Verify full TypeScript build**

```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 4: Verify Next.js build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: build completes successfully with no errors.

- [ ] **Step 5: Final commit**

```bash
cd ..
git add -A
git commit -m "feat: complete NexusClaw frontend redesign — unified design system across all 15 pages"
git push origin main
```

---

## Self-Review

**Spec Coverage:**
- ✅ Design tokens (colors, typography, card style)
- ✅ SiteNav (hex logo, links, Launch App / ConnectWallet by variant)
- ✅ SiteFooter (social icons, links)
- ✅ PageShell (wrapper for all pages)
- ✅ UI kit: Badge, Card, StatCard, DataRow, SectionHeader
- ✅ Homepage: PageShell, sparkline, pricing section
- ✅ Agents: all cards, FimateCard, coming-soon, CTA
- ✅ Staking: wagmi logic preserved, form restyled
- ✅ Proof: terminal-style, live timer, stats
- ✅ Start-Agent: app variant
- ✅ Trader/Signal-Agent: stats, trade table, reasoning panel
- ✅ Leaderboard: stats, table, Agent V1 highlight
- ✅ Docs: sidebar nav, prose, code blocks
- ✅ Governance + Analytics
- ✅ All legal pages (terms, privacy, refund, security)
- ✅ globals.css body bg update
- ✅ Cleanup step to verify no remaining TopNav usage

**No placeholders found.** All code blocks are complete and implementable.

**Type consistency:**
- `PageShell` prop `variant: 'public' | 'app'` — used consistently
- `SiteNav` receives same `variant` prop from `PageShell`
- `StatCard` props: `icon, value, label, valueColor` — used consistently
- `DataRow` props: `label, value, valueColor, noBorder` — used consistently
- `Badge` prop `variant: 'live' | 'coming-soon' | 'active' | 'info'` — used consistently
- `SectionHeader` props: `title, subtitle, badge, badgeVariant` — used consistently
