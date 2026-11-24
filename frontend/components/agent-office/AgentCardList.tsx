import { AGENT_COLORS } from './AgentDesk'
import { formatRelative } from '@/lib/agent-office/format'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import type { AgentState, DeskId } from '@/lib/agent-office/types'

const STATUS_STYLE: Record<AgentState['status'], string> = {
  idle: 'border-gray-700 text-gray-400',
  working: 'border-cyan-700 text-cyan-300',
  error: 'border-red-600 text-red-300',
}

/** Text fallback for narrow screens; same data as the isometric scene. */
export function AgentCardList({ agents, dimmed, now, t, locale, desk = 'desk1' }: {
  agents: AgentState[]; dimmed: boolean; now: number; t: Strings; locale: Locale; desk?: DeskId
}) {
  const roles = desk === 'quantbot' ? t.quantRoles : t.roles
  return (
    <ul className="grid gap-2">
      {agents.map(a => {
        const status = dimmed ? 'idle' : a.status
        return (
          <li key={a.id} className="border border-[#2a2a2a] bg-[#111111] p-3 flex items-start gap-3">
            <span
              className="mt-1 w-3 h-3 shrink-0"
              style={{ background: dimmed ? '#6b7280' : AGENT_COLORS[a.id] }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">{t.agents[a.id]}</span>
                <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLE[status]}`}>
                  {t.status[status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 break-words">
                {status === 'idle' ? t.restingInLounge : a.label || t.status[status]}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {roles[a.id]} · {formatRelative(a.last_event_at, now, locale)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
