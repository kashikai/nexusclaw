import { Character, DESK_D, DESK_W, deskSeat } from './AgentDesk'
import { FloorAndWalls, Plant } from './IsometricOffice'
import { Box, boxColors, iso, pts, wallXMatrix, wallYMatrix } from './iso'
import { DESK_COLORS } from '@/lib/agent-office/desks'
import { type FloorSummary, type Presence } from '@/lib/agent-office/floor'
import { formatClock, formatMoney, truncate } from '@/lib/agent-office/format'
import { projectPublicState } from '@/lib/agent-office/presentation'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import { DESKS, type DeskId, type PublicState } from '@/lib/agent-office/types'

const GOLD = '#f5c542'
const GOLD_SOFT = 'rgba(245,197,66,0.35)'
const GOLD_EDGE = 'rgba(245,197,66,0.55)'
const GRAY = '#6b7280'
const ROOM = 10
const WALL_H = 3.6
const DESK_H = 0.75
const SEAT_H = 0.45
const SOFA_SEAT_H = 0.4
const SOFA = boxColors('#3b2f1a', GOLD_SOFT)

/** Desk back-left corners, in floor units, listed back to front for painter's depth. */
const STATIONS: Record<DeskId, { dx: number; dy: number }> = {
  desk1: { dx: 1.0, dy: 3.0 },
  desk2: { dx: 4.4, dy: 3.0 },
  quantbot: { dx: 1.0, dy: 6.6 },
  desk3: { dx: 4.4, dy: 6.6 },
}
const LOUNGE_SEATS: Record<DeskId, [number, number]> = {
  desk1: [7.0, 0.85],
  desk2: [7.75, 0.85],
  quantbot: [8.5, 0.85],
  desk3: [9.25, 0.85],
}
const SHORT: Record<DeskId, string> = { desk1: 'SD1', desk2: 'SD2', quantbot: 'QD', desk3: 'SD3' }

const SCREEN: Record<Presence, string> = {
  working: '#00eefc',
  error: '#ff4d4d',
  idle: '#0d1418',
  offline: '#0d1418',
  soon: '#0d1418',
  loading: '#0d1418',
}

export interface FloorDesk {
  desk: DeskId
  presence: Presence
  state: PublicState | null
}

interface TradingFloorProps {
  desks: FloorDesk[]
  summary: FloorSummary
  selected: DeskId
  onSelect: (desk: DeskId) => void
  t: Strings
  locale: Locale
}

function Station({ desk, presence, selected }: { desk: DeskId; presence: Presence; selected: boolean }) {
  const { dx, dy } = STATIONS[desk]
  const [sx, sy] = deskSeat(dx, dy)
  const atDesk = presence === 'working' || presence === 'error'
  const dim = presence === 'offline' || presence === 'soon' || presence === 'loading'
  const mx = dx + 0.18
  const my = dy + 0.45
  const md = DESK_D - 0.9
  const mz = DESK_H + 0.12
  const mh = 0.72
  return (
    <g data-desk={desk} data-presence={presence} opacity={presence === 'soon' ? 0.55 : 1}>
      {selected && (
        <polygon
          points={pts(iso(dx - 0.35, dy - 0.35), iso(dx + 2.45, dy - 0.35), iso(dx + 2.45, dy + DESK_D + 0.35), iso(dx - 0.35, dy + DESK_D + 0.35))}
          fill="rgba(245,197,66,0.10)" stroke={GOLD} strokeWidth={0.04}
        />
      )}
      <Box x={dx} y={dy} w={DESK_W} d={DESK_D} h={DESK_H} {...boxColors('#2b2b2b', GOLD_EDGE)} />
      <Box x={mx + 0.02} y={my + md / 2 - 0.08} z={DESK_H} w={0.08} d={0.16} h={0.12} {...boxColors('#1a1a1a')} />
      <Box x={mx} y={my} z={mz} w={0.1} d={md} h={mh} {...boxColors('#151515', GOLD_EDGE)} />
      <polygon
        className={presence === 'working' ? 'ao-screen' : undefined}
        points={pts(iso(mx + 0.1, my + 0.06, mz + 0.06), iso(mx + 0.1, my + md - 0.06, mz + 0.06), iso(mx + 0.1, my + md - 0.06, mz + mh - 0.06), iso(mx + 0.1, my + 0.06, mz + mh - 0.06))}
        fill={SCREEN[presence]}
        opacity={atDesk ? 0.85 : 1}
      />
      <Box x={sx - 0.25} y={sy - 0.25} w={0.5} d={0.5} h={SEAT_H} {...boxColors('#3a3a3a')} />
      {atDesk && (
        <Character x={sx} y={sy} z={SEAT_H} color={dim ? GRAY : DESK_COLORS[desk]} animate={presence === 'working'} />
      )}
    </g>
  )
}

function Lounge({ desks }: { desks: FloorDesk[] }) {
  const resting = desks.filter(d => d.presence === 'idle')
  return (
    <g>
      <polygon points={pts(iso(6.3, 0.1), iso(9.9, 0.1), iso(9.9, 3.1), iso(6.3, 3.1))} fill="#1a1608" stroke={GOLD_SOFT} strokeWidth={0.03} />
      <Box x={6.6} y={0.15} w={3.1} d={0.3} h={0.95} {...SOFA} />
      <Box x={6.6} y={0.45} w={3.1} d={0.8} h={SOFA_SEAT_H} {...SOFA} />
      {resting.map(d => {
        const [x, y] = LOUNGE_SEATS[d.desk]
        return <Character key={d.desk} x={x} y={y} z={SOFA_SEAT_H} color={DESK_COLORS[d.desk]} />
      })}
      <Box x={9.7} y={0.15} w={0.2} d={1.1} h={0.6} {...SOFA} />
      <Box x={7.3} y={2.0} w={1.7} d={0.7} h={0.32} {...boxColors('#2b2b2b', GOLD_SOFT)} />
      <Box x={8.0} y={2.2} z={0.32} w={0.18} d={0.18} h={0.16} {...boxColors('#e5e7eb')} />
    </g>
  )
}

function pnlFill(v: number): string {
  if (v > 0) return '#4ade80'
  if (v < 0) return '#f87171'
  return '#e5e7eb'
}

/** Overall board on the back-right wall: real-account totals only. */
function FloorBoard({ summary, t, locale }: { summary: FloorSummary; t: Strings; locale: Locale }) {
  const w = 5.4
  const h = 1.95
  const r = summary.real
  const money = (v: number) => (r ? formatMoney(v, locale, r.currency, true) : '—')
  const rows: [string, string, string][] = [
    [t.floor.wallToday, money(r?.dailyPnl ?? 0), r ? pnlFill(r.dailyPnl) : '#9ca3af'],
    [t.floor.wallTotal, money(r?.totalPnl ?? 0), r ? pnlFill(r.totalPnl) : '#9ca3af'],
    [t.floor.wallOpen, r ? String(r.openPositions) : '—', '#e5e7eb'],
    [t.floor.wallOnline, `${summary.online}/${summary.active}`, summary.online === summary.active ? '#4ade80' : GOLD],
  ]
  return (
    <g transform={wallYMatrix(0.6, 3.2)} fontFamily="JetBrains Mono, monospace">
      <rect x={0} y={0} width={w} height={h} fill="#0a0a0a" stroke={GOLD} strokeWidth={0.04} />
      <text x={0.2} y={0.42} fontSize={0.28} fontWeight={700} fill={GOLD} letterSpacing={0.02}>{t.floor.wallTitle}</text>
      {rows.map(([label, value, fill], i) => (
        <g key={label} transform={`translate(${0.2 + (i % 2) * 2.6} ${0.86 + Math.floor(i / 2) * 0.5})`}>
          <text x={0} y={0} fontSize={0.18} fill="#9ca3af">{label}</text>
          <text x={0.95} y={0} fontSize={0.22} fontWeight={700} fill={fill}>{value}</text>
        </g>
      ))}
    </g>
  )
}

/** Latest events from every bot, tagged with the desk they came from. */
function ActivityBoard({ desks, t, locale }: { desks: FloorDesk[]; t: Strings; locale: Locale }) {
  const w = 6.0
  const h = 1.95
  const events = desks
    .flatMap(d => {
      const projected = projectPublicState(d.state, t.view.protectedEvent)
      return (projected?.recent_events ?? []).map(e => ({ ...e, desk: d.desk }))
    })
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
    .slice(0, 3)
  return (
    <g transform={wallXMatrix(9.4, 3.2)} fontFamily="JetBrains Mono, monospace">
      <rect x={0} y={0} width={w} height={h} fill="#0a0a0a" stroke={GOLD} strokeWidth={0.04} />
      <text x={0.2} y={0.42} fontSize={0.28} fontWeight={700} fill={GOLD} letterSpacing={0.02}>{t.wall.activity}</text>
      {events.length === 0 && <text x={0.2} y={0.9} fontSize={0.2} fill="#6b7280">{t.wall.noActivity}</text>}
      {events.map((e, i) => (
        <text key={`${e.desk}-${e.ts}-${i}`} x={0.2} y={0.88 + i * 0.36} fontSize={0.18} fill="#d1d5db">
          <tspan fill={DESK_COLORS[e.desk]} fontWeight={700}>{SHORT[e.desk]}</tspan>
          <tspan fill={GOLD}>{` ${formatClock(e.ts, locale)}`}</tspan>
          {` ${truncate(e.text, 26)}`}
        </text>
      ))}
    </g>
  )
}

/** Screen-space name tag floating above a desk: bot name, mode and today's result. */
function Nameplate({ d, t, locale }: { d: FloorDesk; t: Strings; locale: Locale }) {
  const { dx, dy } = STATIONS[d.desk]
  const [hx, hy] = iso(dx + 0.6, dy + DESK_D / 2, 2.05)
  const name = t.desks[d.desk]
  const s = d.state
  const mode = s ? (s.mode === 'live' ? t.floor.modeLive : t.floor.modeDemo) : null
  const second = d.presence === 'soon'
    ? t.floor.presence.soon
    : s && d.presence !== 'offline'
      ? `${t.floor.today} ${formatMoney(s.portfolio.daily_pnl_usd, locale, s.portfolio.pnl_currency, true)}`
      : t.floor.presence[d.presence]
  const secondFill = d.presence === 'soon' || d.presence === 'offline' || !s ? '#9ca3af' : pnlFill(s.portfolio.daily_pnl_usd)
  const fontSize = 0.22
  const width = Math.max(2.3, Math.max(name.length + (mode ? mode.length + 2 : 0), second.length) * fontSize * 0.62 + 0.5)
  const height = 0.78
  const bx = hx - width / 2
  const by = hy - height
  const color = DESK_COLORS[d.desk]
  const dot = d.presence === 'working' ? '#22d3ee' : d.presence === 'error' ? '#ff4d4d' : d.presence === 'idle' ? '#4ade80' : GRAY
  return (
    <g fontFamily="JetBrains Mono, monospace" pointerEvents="none">
      <rect x={bx} y={by} width={width} height={height} rx={0.08} fill="#0b0b0b" stroke={color} strokeWidth={0.035} opacity={0.95} />
      <circle cx={bx + 0.22} cy={by + 0.25} r={0.07} fill={dot} />
      <text x={bx + 0.38} y={by + 0.25} dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill={color}>
        {name}
        {mode && <tspan fill={mode === t.floor.modeLive ? '#f87171' : GOLD} fontSize={0.17}>{`  ${mode}`}</tspan>}
      </text>
      <text x={bx + 0.38} y={by + 0.56} dominantBaseline="central" fontSize={0.19} fontWeight={600} fill={secondFill}>{second}</text>
    </g>
  )
}

/** The whole trading floor: one desk per bot, idle bots rest in the lounge, offline desks stay empty. */
export function TradingFloor({ desks, summary, selected, onSelect, t, locale }: TradingFloorProps) {
  const byDesk = new Map(desks.map(d => [d.desk, d]))
  const ordered = DESKS.map(d => byDesk.get(d)).filter((d): d is FloorDesk => !!d)
  const [minX] = iso(0, ROOM)
  const [, minY] = iso(0, 0, WALL_H)
  const [, maxY] = iso(ROOM, ROOM)
  const pad = 0.3
  const summaryText = ordered.map(d => `${t.desks[d.desk]}: ${t.floor.presence[d.presence]}`).join('; ')

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${-minX * 2 + pad * 2} ${maxY - minY + pad * 2}`}
      className="w-full h-auto block"
      role="group"
      aria-label={`${t.floor.sceneLabel}. ${summaryText}`}
    >
      <FloorAndWalls />
      <FloorBoard summary={summary} t={t} locale={locale} />
      <ActivityBoard desks={ordered} t={t} locale={locale} />
      <Lounge desks={ordered} />
      {ordered.map(d => (
        <g
          key={d.desk}
          role="button"
          tabIndex={0}
          aria-pressed={selected === d.desk}
          aria-label={`${t.desks[d.desk]}: ${t.floor.presence[d.presence]}`}
          className="cursor-pointer focus:outline-none"
          onClick={() => onSelect(d.desk)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.desk) } }}
        >
          <Station desk={d.desk} presence={d.presence} selected={selected === d.desk} />
        </g>
      ))}
      <Plant />
      {ordered.map(d => <Nameplate key={`tag-${d.desk}`} d={d} t={t} locale={locale} />)}
    </svg>
  )
}
