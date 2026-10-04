import { AgentDesk, AGENT_COLORS, BUBBLE_HEAD_Z, Character, deskSeat, StatusBubble } from './AgentDesk'
import { Box, boxColors, iso, pts, wallXMatrix, wallYMatrix } from './iso'
import { formatClock, truncate } from '@/lib/agent-office/format'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import { AGENT_IDS, type AgentId, type AgentState, type PublicState } from '@/lib/agent-office/types'

const ROOM = 10
const WALL_H = 3.6
const GOLD = '#f5c542'
const GOLD_SOFT = 'rgba(245,197,66,0.35)'
const GRAY = '#6b7280'

// Desk back-left corners, in floor units. Order matters for painter's depth (back to front).
const DESKS: { id: AgentId; dx: number; dy: number }[] = [
  { id: 'scanner', dx: 1.0, dy: 3.0 },
  { id: 'executor', dx: 4.4, dy: 3.0 },
  { id: 'analyst', dx: 1.0, dy: 6.6 },
  { id: 'reporter', dx: 4.4, dy: 6.6 },
]

const LOUNGE_SEATS: Record<AgentId, [number, number]> = {
  scanner: [7.0, 0.85],
  analyst: [7.75, 0.85],
  executor: [8.5, 0.85],
  reporter: [9.25, 0.85],
}

const SOFA_SEAT_H = 0.4
const SOFA = boxColors('#3b2f1a', GOLD_SOFT)

interface IsometricOfficeProps {
  state: PublicState | null
  /** True when data is stale or unavailable: everyone is shown idle and gray. */
  dimmed: boolean
  t: Strings
  locale: Locale
}

function FloorAndWalls() {
  const grid = []
  for (let i = 1; i < ROOM; i++) {
    grid.push(<line key={`gx${i}`} x1={iso(i, 0)[0]} y1={iso(i, 0)[1]} x2={iso(i, ROOM)[0]} y2={iso(i, ROOM)[1]} />)
    grid.push(<line key={`gy${i}`} x1={iso(0, i)[0]} y1={iso(0, i)[1]} x2={iso(ROOM, i)[0]} y2={iso(ROOM, i)[1]} />)
  }
  return (
    <g>
      <polygon points={pts(iso(0, ROOM), iso(0, 0), iso(0, 0, WALL_H), iso(0, ROOM, WALL_H))} fill="#141414" />
      <polygon points={pts(iso(0, 0), iso(ROOM, 0), iso(ROOM, 0, WALL_H), iso(0, 0, WALL_H))} fill="#191919" />
      <polygon points={pts(iso(0, 0), iso(ROOM, 0), iso(ROOM, ROOM), iso(0, ROOM))} fill="#101010" />
      <g stroke="#1e1e1e" strokeWidth={0.02}>{grid}</g>
      <polyline
        points={pts(iso(0, ROOM, WALL_H), iso(0, 0, WALL_H), iso(ROOM, 0, WALL_H))}
        fill="none" stroke={GOLD} strokeWidth={0.05} strokeLinejoin="round"
      />
      <line x1={iso(0, 0)[0]} y1={iso(0, 0)[1]} x2={iso(0, 0, WALL_H)[0]} y2={iso(0, 0, WALL_H)[1]} stroke={GOLD} strokeWidth={0.04} />
      <polygon
        points={pts(iso(0, 0), iso(ROOM, 0), iso(ROOM, ROOM), iso(0, ROOM))}
        fill="none" stroke={GOLD} strokeWidth={0.05} strokeLinejoin="round"
      />
      <polyline points={pts(iso(0, ROOM), iso(0, ROOM, WALL_H))} stroke={GOLD_SOFT} strokeWidth={0.03} />
      <polyline points={pts(iso(ROOM, 0), iso(ROOM, 0, WALL_H))} stroke={GOLD_SOFT} strokeWidth={0.03} />
    </g>
  )
}

function StatusWall({ state, agents, dimmed, t }: { state: PublicState | null; agents: AgentState[]; dimmed: boolean; t: Strings }) {
  const w = 5.4
  const h = 1.95
  const modeText = state ? (state.mode === 'dry_run' ? t.panel.modeDryRun : t.panel.modeLive).toUpperCase() : '—'
  const tierText = state ? t.tiers[state.survival_tier].toUpperCase() : '—'
  return (
    <g transform={wallYMatrix(0.6, 3.2)} fontFamily="JetBrains Mono, monospace">
      <rect x={0} y={0} width={w} height={h} fill="#0a0a0a" stroke={GOLD} strokeWidth={0.04} />
      <text x={0.2} y={0.42} fontSize={0.28} fontWeight={700} fill={GOLD} letterSpacing={0.02}>{t.wall.desk}</text>
      <text x={0.2} y={0.85} fontSize={0.2} fill="#9ca3af">{t.wall.mode}</text>
      <text x={1.0} y={0.85} fontSize={0.2} fontWeight={700} fill={state?.mode === 'live' ? '#f87171' : GOLD}>{modeText}</text>
      <text x={0.2} y={1.18} fontSize={0.2} fill="#9ca3af">{t.wall.tier}</text>
      <text x={1.0} y={1.18} fontSize={0.2} fontWeight={700} fill="#e5e7eb">{tierText}</text>
      {agents.map((a, i) => {
        const fill = dimmed || a.status === 'idle' ? '#374151' : a.status === 'error' ? '#ff4d4d' : AGENT_COLORS[a.id]
        return (
          <g key={a.id} transform={`translate(${0.2 + i * 1.28} 1.45)`}>
            <rect width={0.22} height={0.22} fill={fill} />
            <text x={0.32} y={0.17} fontSize={0.16} fill="#9ca3af">{t.agents[a.id].toUpperCase()}</text>
          </g>
        )
      })}
    </g>
  )
}

function ActivityWall({ state, dimmed, t, locale }: { state: PublicState | null; dimmed: boolean; t: Strings; locale: Locale }) {
  const w = 6.0
  const h = 1.95
  const events = state?.recent_events.slice(0, 3) ?? []
  return (
    <g transform={wallXMatrix(9.4, 3.2)} fontFamily="JetBrains Mono, monospace">
      <rect x={0} y={0} width={w} height={h} fill="#0a0a0a" stroke={GOLD} strokeWidth={0.04} />
      <text x={0.2} y={0.42} fontSize={0.28} fontWeight={700} fill={GOLD} letterSpacing={0.02}>{t.wall.activity}</text>
      {events.length === 0 && <text x={0.2} y={0.9} fontSize={0.2} fill="#6b7280">{t.wall.noActivity}</text>}
      {events.map((e, i) => (
        <text key={`${e.ts}-${i}`} x={0.2} y={0.88 + i * 0.36} fontSize={0.19} fill={dimmed ? '#6b7280' : '#d1d5db'}>
          <tspan fill={dimmed ? '#6b7280' : GOLD}>{formatClock(e.ts, locale)}</tspan>
          {` ${truncate(e.text, 30)}`}
        </text>
      ))}
    </g>
  )
}

function Lounge({ agents, dimmed }: { agents: AgentState[]; dimmed: boolean }) {
  const resting = agents.filter(a => a.status === 'idle')
  return (
    <g>
      <polygon points={pts(iso(6.3, 0.1), iso(9.9, 0.1), iso(9.9, 3.1), iso(6.3, 3.1))} fill="#1a1608" stroke={GOLD_SOFT} strokeWidth={0.03} />
      <Box x={6.6} y={0.15} w={3.1} d={0.3} h={0.95} {...SOFA} />
      <Box x={6.6} y={0.45} w={3.1} d={0.8} h={SOFA_SEAT_H} {...SOFA} />
      {resting.map(a => {
        const [x, y] = LOUNGE_SEATS[a.id]
        return <Character key={a.id} x={x} y={y} z={SOFA_SEAT_H} color={dimmed ? GRAY : AGENT_COLORS[a.id]} />
      })}
      <Box x={9.7} y={0.15} w={0.2} d={1.1} h={0.6} {...SOFA} />
      <Box x={7.3} y={2.0} w={1.7} d={0.7} h={0.32} {...boxColors('#2b2b2b', GOLD_SOFT)} />
      <Box x={8.0} y={2.2} z={0.32} w={0.18} d={0.18} h={0.16} {...boxColors('#e5e7eb')} />
    </g>
  )
}

function Plant() {
  return (
    <g>
      <Box x={0.3} y={9.2} w={0.5} d={0.5} h={0.45} {...boxColors('#3f3f46', GOLD_SOFT)} />
      <Box x={0.35} y={9.25} z={0.45} w={0.4} d={0.4} h={0.55} {...boxColors('#166534')} />
      <Box x={0.42} y={9.32} z={1.0} w={0.26} d={0.26} h={0.3} {...boxColors('#15803d')} />
    </g>
  )
}

/** The office scene. Pure function of the validated state: nothing moves unless the data says so. */
export function IsometricOffice({ state, dimmed, t, locale }: IsometricOfficeProps) {
  const agents: AgentState[] = state && !dimmed
    ? state.agents
    : AGENT_IDS.map(id => ({ id, status: 'idle', label: '', last_event_at: null }))

  const byId = new Map(agents.map(a => [a.id, a]))
  const summary = agents.map(a => `${t.agents[a.id]}: ${t.status[a.status]}${a.label ? ` (${a.label})` : ''}`).join('; ')

  const [minX] = iso(0, ROOM)
  const [, minY] = iso(0, 0, WALL_H)
  const [, maxY] = iso(ROOM, ROOM)
  const pad = 0.3

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${-minX * 2 + pad * 2} ${maxY - minY + pad * 2}`}
      className={`w-full h-auto block ${dimmed ? 'ao-dimmed' : ''}`}
      role="img"
      aria-label={`${t.pageTitle}. ${summary}`}
    >
      <FloorAndWalls />
      <StatusWall state={state} agents={agents} dimmed={dimmed} t={t} />
      <ActivityWall state={state} dimmed={dimmed} t={t} locale={locale} />
      <Lounge agents={agents} dimmed={dimmed} />
      {DESKS.map(d => (
        <AgentDesk key={d.id} id={d.id} dx={d.dx} dy={d.dy} status={byId.get(d.id)?.status ?? 'idle'} dimmed={dimmed} />
      ))}
      <Plant />
      {DESKS.map(d => {
        const a = byId.get(d.id)
        if (!a || a.status === 'idle') return null
        const [sx, sy] = deskSeat(d.dx, d.dy)
        const text = a.label || t.status[a.status]
        return (
          <StatusBubble
            key={`bubble-${d.id}`}
            x={sx} y={sy} z={BUBBLE_HEAD_Z}
            text={text}
            tone={a.status === 'error' ? 'error' : 'working'}
            title={`${t.agents[d.id]}: ${text}`}
          />
        )
      })}
    </svg>
  )
}
