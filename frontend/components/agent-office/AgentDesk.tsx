import { Box, boxColors, iso, pts } from './iso'
import { truncate } from '@/lib/agent-office/format'
import type { AgentId, AgentStatus } from '@/lib/agent-office/types'

export const AGENT_COLORS: Record<AgentId, string> = {
  scanner: '#22d3ee',
  analyst: '#c084fc',
  executor: '#f5c542',
  reporter: '#4ade80',
}

const GRAY = '#6b7280'
const GOLD_EDGE = 'rgba(245,197,66,0.55)'
const DESK = boxColors('#2b2b2b', GOLD_EDGE)
const SEAT = boxColors('#3a3a3a')
const SKIN = boxColors('#e8c39e')

const SCREEN_FILL: Record<AgentStatus, string> = {
  idle: '#0d1418',
  working: '#00eefc',
  error: '#ff4d4d',
}

export const DESK_W = 1
export const DESK_D = 2.2
const DESK_H = 0.75
const SEAT_H = 0.45

/** Seated position of the agent at a desk whose back-left corner is (dx, dy). */
export function deskSeat(dx: number, dy: number): [number, number] {
  return [dx + DESK_W + 0.55, dy + DESK_D / 2]
}

interface CharacterProps {
  x: number
  y: number
  z: number
  color: string
  animate?: boolean
}

/** Blocky seated character centred on (x, y), sitting at height z. */
export function Character({ x, y, z, color, animate }: CharacterProps) {
  const body = boxColors(color)
  return (
    <g className={animate ? 'ao-typing' : undefined}>
      <Box x={x - 0.22} y={y - 0.22} z={z} w={0.44} d={0.44} h={0.48} {...body} />
      <Box x={x - 0.17} y={y - 0.17} z={z + 0.48} w={0.34} d={0.34} h={0.32} {...SKIN} />
      <Box x={x - 0.18} y={y - 0.18} z={z + 0.74} w={0.36} d={0.36} h={0.08} {...boxColors('#1f1f1f')} />
    </g>
  )
}

interface AgentDeskProps {
  id: AgentId
  status: AgentStatus
  dx: number
  dy: number
  dimmed: boolean
}

/** Desk, monitor and seat; the agent sits here only when not idle. */
export function AgentDesk({ id, status, dx, dy, dimmed }: AgentDeskProps) {
  const [sx, sy] = deskSeat(dx, dy)
  const atDesk = status !== 'idle'
  const screenFill = dimmed ? SCREEN_FILL.idle : SCREEN_FILL[status]
  const mx = dx + 0.18
  const my = dy + 0.45
  const md = DESK_D - 0.9
  const mz = DESK_H + 0.12
  const mh = 0.72

  return (
    <g data-agent={id} data-status={status}>
      <Box x={dx} y={dy} w={DESK_W} d={DESK_D} h={DESK_H} {...DESK} />
      {/* monitor stand + body, screen on the +x face so it faces the seated agent */}
      <Box x={mx + 0.02} y={my + md / 2 - 0.08} z={DESK_H} w={0.08} d={0.16} h={0.12} {...boxColors('#1a1a1a')} />
      <Box x={mx} y={my} z={mz} w={0.1} d={md} h={mh} {...boxColors('#151515', GOLD_EDGE)} />
      <polygon
        className={atDesk && !dimmed && status === 'working' ? 'ao-screen' : undefined}
        points={pts(iso(mx + 0.1, my + 0.06, mz + 0.06), iso(mx + 0.1, my + md - 0.06, mz + 0.06), iso(mx + 0.1, my + md - 0.06, mz + mh - 0.06), iso(mx + 0.1, my + 0.06, mz + mh - 0.06))}
        fill={screenFill}
        opacity={status === 'idle' || dimmed ? 1 : 0.85}
      />
      <Box x={sx - 0.25} y={sy - 0.25} w={0.5} d={0.5} h={SEAT_H} {...SEAT} />
      {atDesk && (
        <Character x={sx} y={sy} z={SEAT_H} color={dimmed ? GRAY : AGENT_COLORS[id]} animate={!dimmed && status === 'working'} />
      )}
    </g>
  )
}

export const BUBBLE_HEAD_Z = SEAT_H + 0.95

interface BubbleProps {
  x: number
  y: number
  z: number
  text: string
  tone: 'working' | 'error'
  title: string
}

/** Screen-space speech bubble anchored above a character's head. */
export function StatusBubble({ x, y, z, text, tone, title }: BubbleProps) {
  const [hx, hy] = iso(x, y, z)
  const label = truncate(text, 30)
  const fontSize = 0.24
  const width = Math.max(1.2, label.length * fontSize * 0.6 + 0.4)
  const height = 0.46
  const bx = hx - width / 2
  const by = hy - height - 0.18
  const bg = tone === 'error' ? '#ff4d4d' : '#f5f5f0'
  const fg = tone === 'error' ? '#1a0000' : '#111111'

  return (
    <g className="ao-bubble" pointerEvents="visiblePainted">
      <title>{title}</title>
      <rect x={bx} y={by} width={width} height={height} rx={0.1} fill={bg} stroke="#f5c542" strokeWidth={0.025} />
      <polygon points={pts([hx - 0.1, by + height], [hx + 0.1, by + height], [hx, by + height + 0.16])} fill={bg} />
      <text
        x={hx}
        y={by + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={600}
        fill={fg}
      >
        {tone === 'error' ? `! ${label}` : label}
      </text>
    </g>
  )
}
