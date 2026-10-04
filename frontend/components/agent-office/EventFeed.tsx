import { AGENT_COLORS } from './AgentDesk'
import { formatClock, formatRelative } from '@/lib/agent-office/format'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import type { OfficeEvent } from '@/lib/agent-office/types'
import { EVENTS_MAX } from '@/lib/agent-office/validate'

export function EventFeed({ events, now, t, locale }: { events: OfficeEvent[]; now: number; t: Strings; locale: Locale }) {
  const list = events.slice(0, EVENTS_MAX)
  return (
    <section className="border border-[#2a2a2a] bg-[#111111] p-4" aria-labelledby="ao-feed-title">
      <h2 id="ao-feed-title" className="text-xs uppercase tracking-widest text-[#f5c542] mb-3">{t.feed.title}</h2>
      {list.length === 0 ? (
        <p className="text-xs text-gray-500">{t.feed.empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {list.map((e, i) => (
            <li key={`${e.ts}-${i}`} className="text-xs leading-relaxed">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <span
                  className="inline-block w-2 h-2"
                  style={{ background: e.agent === 'system' ? '#9ca3af' : AGENT_COLORS[e.agent] }}
                  aria-hidden="true"
                />
                <span className="text-gray-300">{e.agent === 'system' ? t.feed.system : t.agents[e.agent]}</span>
                <time dateTime={e.ts} className="text-gray-500 normal-case tracking-normal" title={e.ts}>
                  {formatClock(e.ts, locale)} · {formatRelative(e.ts, now, locale)}
                </time>
              </div>
              <p className="text-gray-400 pl-4 break-words">{e.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
