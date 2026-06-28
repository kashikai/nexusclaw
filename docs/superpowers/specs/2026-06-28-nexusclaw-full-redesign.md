# NexusClaw Full Frontend Redesign

**Date:** 2026-06-28  
**Scope:** Design system + all 15 pages  
**Approach:** Option A — Design System first, then pages  

---

## 1. Goal

Redesign the entire NexusClaw frontend to a consistent, premium terminal/hacker aesthetic matching the approved screenshot. All pages receive the same treatment. Web3 logic (wagmi, viem contracts) is preserved — only presentation changes.

---

## 2. Design Tokens

### Colors
| Name | Value | Usage |
|---|---|---|
| `bg-primary` | `#0a0a0a` | Page background |
| `bg-surface` | `#111111` | Card backgrounds |
| `bg-section` | `#0d0d0d` | Alternating sections |
| `border-default` | `#1f2937` | Card/divider borders |
| `text-primary` | `#ffffff` | Headlines |
| `text-muted` | `#9ca3af` | Body text |
| `text-subtle` | `#6b7280` | Labels, metadata |
| `accent-cyan` | `#22d3ee` | Primary CTA, values, links |
| `accent-green` | `#4ade80` | Live/online status |
| `accent-yellow` | `#eab308` | Coming Soon badges |

### Typography
- **Font:** JetBrains Mono throughout (already loaded in `layout.tsx`)
- **Headlines:** `font-bold text-white` — h1: `text-5xl md:text-7xl`, h2: `text-2xl`, h3: `text-lg`
- **Labels:** `text-xs uppercase tracking-widest text-gray-500`
- **Values/Accents:** `font-bold text-cyan-400`
- **Body:** `text-sm text-gray-400 leading-relaxed`

### Card Style
- No `border-radius` (sharp corners)
- Background: `#111111`
- Border: `border border-[#1f2937]`
- Hover: `hover:border-cyan-900`

---

## 3. Shared Components

All created in `frontend/components/` and exported cleanly.

### 3.1 `components/layout/SiteNav.tsx`
Replaces `TopNav` everywhere.

**Structure:**
- Left: hexagon SVG logo mark + "NexusClaw" bold text
- Center (desktop): nav links — Proof · Agents · Trader · Staking · Docs
- Right: context-aware button
  - **Public pages** (home, agents, proof, docs, trader, leaderboard): `"Launch App →"` border button → `/staking`
  - **App pages** (staking, start-agent, signal-agent): `ConnectWallet` via RainbowKit (preserved as-is)
- Mobile: hamburger → full-screen drawer with same links
- Sticky top, `bg-[#0a0a0a]/90 backdrop-blur`, `border-b border-[#1f2937]`

**Props:**
```ts
interface SiteNavProps {
  variant?: 'public' | 'app'  // default: 'public'
}
```

### 3.2 `components/layout/SiteFooter.tsx`
**Structure:**
- Left: `© 2026 NexusClaw. All rights reserved.`
- Center: social icons — X · Discord · Telegram · GitHub (SVG icons, hover white)
- Right: Docs · Terms · Privacy links
- Border-top `border-[#1f2937]`, padding `py-8 px-6`

### 3.3 `components/layout/PageShell.tsx`
Wraps every page. Accepts `variant` prop passed to `SiteNav`.

```tsx
<PageShell variant="public">
  {children}
</PageShell>
```

Renders: `SiteNav` + `<main className="pt-20">` + `SiteFooter`

### 3.4 `components/ui/StatCard.tsx`
```ts
interface StatCardProps {
  icon: string          // emoji or SVG
  value: string
  label: string
  color?: string        // tailwind class e.g. 'text-cyan-400'
}
```
Renders: icon (text-xl) + value (text-lg font-bold colored) + label (text-xs text-gray-500)  
Container: `border border-[#1f2937] bg-[#111111] p-4`

### 3.5 `components/ui/DataRow.tsx`
```ts
interface DataRowProps {
  label: string
  value: React.ReactNode
  accent?: string  // tailwind color class
}
```
Renders: `flex justify-between border-b border-[#1f2937] pb-2` — label gray-500 + value accent

### 3.6 `components/ui/SectionHeader.tsx`
```ts
interface SectionHeaderProps {
  title: string
  badge?: string         // e.g. "LIVE"
  badgeColor?: string    // 'green' | 'cyan' | 'yellow'
  subtitle?: string
}
```

### 3.7 `components/ui/Badge.tsx`
```ts
interface BadgeProps {
  label: string
  variant: 'live' | 'coming-soon' | 'active' | 'info'
}
```
- `live`: green dot + green text + green border
- `coming-soon`: yellow text + yellow border
- `active`: cyan text + cyan border
- `info`: gray text + gray border

### 3.8 `components/ui/Card.tsx`
Base card container.
```ts
interface CardProps {
  children: React.ReactNode
  className?: string
  accent?: string  // border color override
  hover?: boolean  // adds hover:border-cyan-900
}
```

---

## 4. Page-by-Page Spec

### Priority 1 — Core Pages

#### 4.1 `/` — HomeContent.tsx
Already partially redesigned. Additions needed:
- Replace lobster logo in nav with hexagon SVG mark
- Add Recharts line chart to "Live Proof" section (static/mocked data for now — real data later)
- Add "Start Your Edge" pricing section (3 tiers):
  - Self-hosted: `$0/mo` — "Run your own agent" → `/start-agent`
  - Managed Agent: `$49/mo` POPULAR — "We run it. You earn." → `/start-agent`
  - Agent Launch: `$199/mo` — "Launch your custom agent" → `/start-agent`
- Use `PageShell variant="public"`

#### 4.2 `/staking` — StakingContent.tsx
Web3 logic untouched. Visual changes:
- Wrap in `PageShell variant="app"`
- Hero: `SectionHeader` "Staking Terminal" + live APY badge
- Stats row: TVL · Stakers · APY · Runway — using `StatCard`
- User panel: wallet balance + staked + pending — `DataRow` list in `Card`
- Actions: Stake / Claim / Unstake — 3 tab-style cards with inputs, sharp style
- All buttons: sharp corners, cyan primary, gray secondary

#### 4.3 `/agents` — agents/page.tsx
- Wrap in `PageShell variant="public"`
- `SectionHeader` "Agents" + live count badge
- Active agent cards: use `Card` with colored accent border, `DataRow` for stats
- FimateCard (Trader section): restyled with `Card` + `DataRow` table
- Coming Soon: `Card` with `opacity-60` + `Badge variant="coming-soon"`
- CTA section: "Want Your Agent Here?" in full-width `Card`

#### 4.4 `/proof` — proof/page.tsx
- Wrap in `PageShell variant="public"`
- Terminal-style layout: dark panel showing live agent uptime (days/hours/minutes/seconds ticking)
- `StatCard` grid: uptime, cycles, gas, staked
- `DataRow` list: all agent details with Basescan links
- "What This Proves" checklist with cyan checkmarks
- Basescan verification buttons

#### 4.5 `/start-agent` — StartAgentContent.tsx
- Wrap in `PageShell variant="app"`
- Multi-step flow restyled: wallet check → config → success
- Progress indicator (step 1/2/3) in sharp style
- `Card` per step with `DataRow` inputs
- All buttons and inputs in new design system

### Priority 2 — Content Pages

#### 4.6 `/trader` → `/signal-agent` — SignalAgentContent.tsx
- Wrap in `PageShell variant="public"`
- `SectionHeader` "NexusClaw Trader" + Live badge
- Stats grid: Trades · Win Rate · Total P&L · Avg Pts — `StatCard`
- Trade history table: `DataRow` style, full width
- Agent reasoning panel: terminal-style blockquote

#### 4.7 `/leaderboard` — LeaderboardContent.tsx
- Wrap in `PageShell variant="public"`
- `SectionHeader` "Leaderboard" + staker count
- Full-width table: Rank · Address · Staked · Pending · Since · Cycles
- Row highlight for Agent V1 (cyan accent)
- Pagination or "show more" if applicable

#### 4.8 `/docs` — docs/page.tsx
- Wrap in `PageShell variant="public"`
- Two-column layout: sticky sidebar nav (sections) + content area
- Content: styled prose with `text-gray-400`, `text-white` headings, `text-cyan-400` code refs
- Sidebar links: highlight active section

#### 4.9 `/governance` — GovernanceContent.tsx
- Wrap in `PageShell variant="public"`
- `SectionHeader` + governance status cards
- Proposal list (if any) in `Card` format

#### 4.10 `/analytics` — AnalyticsContent.tsx
- Wrap in `PageShell variant="public"`
- Stats panels with `StatCard`, charts if data available

### Priority 3 — Legal Pages

All legal pages (`/terms`, `/privacy`, `/refund`, `/security`):
- Wrap in `PageShell variant="public"`
- `SectionHeader` with page title
- Prose content in `text-gray-400 text-sm leading-relaxed`
- `text-white font-bold` for section titles (h2/h3)
- `text-cyan-400` for important notes/highlights

---

## 5. File Structure After Redesign

```
frontend/
  components/
    layout/
      SiteNav.tsx          (new — replaces TopNav)
      SiteFooter.tsx       (new)
      PageShell.tsx        (new)
      TopNav.tsx           (kept for reference, will be removed after migration)
    ui/
      StatCard.tsx         (new)
      DataRow.tsx          (new)
      SectionHeader.tsx    (new)
      Badge.tsx            (new)
      Card.tsx             (new)
    MobileBanner.tsx       (kept — mobile wallet detection)
    staking/               (kept — staking sub-components)
    start-agent/           (kept — start-agent sub-components)
  app/
    globals.css            (body bg updated to #0a0a0a)
    layout.tsx             (unchanged)
    HomeContent.tsx        (updated)
    agents/page.tsx        (updated)
    staking/StakingContent.tsx  (updated)
    proof/page.tsx         (updated)
    start-agent/StartAgentContent.tsx (updated)
    signal-agent/SignalAgentContent.tsx (updated)
    leaderboard/LeaderboardContent.tsx (updated)
    docs/page.tsx          (updated)
    governance/GovernanceContent.tsx (updated)
    analytics/AnalyticsContent.tsx (updated)
    terms/page.tsx         (updated)
    privacy/page.tsx       (updated)
    refund/page.tsx        (updated)
    security/page.tsx      (updated)
```

---

## 6. Implementation Order

1. **Phase 1 — Shared components** (SiteNav, SiteFooter, PageShell, UI kit)
2. **Phase 2 — Homepage** (HomeContent + chart + pricing)
3. **Phase 3 — Core app pages** (Staking, Agents, Proof, Start-Agent)
4. **Phase 4 — Content pages** (Trader, Leaderboard, Docs, Governance, Analytics)
5. **Phase 5 — Legal pages** (Terms, Privacy, Refund, Security)
6. **Phase 6 — Cleanup** (remove old TopNav, update globals.css, commit)

Each phase is independently deployable.

---

## 7. Constraints

- **No breaking changes to wagmi logic** — all contract reads/writes preserved
- **No new dependencies** except `recharts` (already in project or trivial to add) for the homepage chart
- **All text in English** (project rule)
- **Mobile-first** — all layouts responsive, hamburger menu preserved
- **Vercel-compatible** — no server-side state, no breaking SSR changes
