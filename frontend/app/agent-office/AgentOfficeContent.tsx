'use client'

import { useEffect, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { IsometricOffice } from '@/components/agent-office/IsometricOffice'
import { StatusPanel } from '@/components/agent-office/StatusPanel'
import { EventFeed } from '@/components/agent-office/EventFeed'
import { ModeBadge } from '@/components/agent-office/ModeBadge'
import { AgentCardList } from '@/components/agent-office/AgentCardList'
import { useOfficeState } from '@/lib/agent-office/useOfficeState'
import { formatRelative } from '@/lib/agent-office/format'
import { getStrings, resolveLocale, type Locale, type Strings } from '@/lib/agent-office/strings'
import { AGENT_IDS, MOCK_SCENARIOS, type AgentState, type DataSource, type LoadResult } from '@/lib/agent-office/types'

const IS_DEV = process.env.NODE_ENV !== 'production'
const DEV_SOURCE_KEY = 'agent-office:source'

function parseSource(value: string | null): DataSource | null {
  if (value === 'live') return { kind: 'live' }
  const scenario = MOCK_SCENARIOS.find(s => value === `mock:${s}`)
  return scenario ? { kind: 'mock', scenario } : null
}

function sourceKey(s: DataSource): string {
  return s.kind === 'live' ? 'live' : `mock:${s.scenario}`
}

function DevToggle({ source, onChange, t }: { source: DataSource; onChange: (s: DataSource) => void; t: Strings }) {
  const options: { key: string; label: string }[] = [
    ...MOCK_SCENARIOS.map(s => ({ key: `mock:${s}`, label: t.dev.scenarios[s] })),
    { key: 'live', label: t.dev.live },
  ]
  return (
    <div className="border border-dashed border-gray-700 p-3 text-[11px]" aria-label={t.dev.title}>
      <div className="uppercase tracking-widest text-gray-500 mb-2">{t.dev.title}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const active = o.key === sourceKey(source)
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(parseSource(o.key)!)}
              aria-pressed={active}
              className={`px-2 py-1 border transition-colors ${
                active ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Notice({ tone, title, detail }: { tone: 'warn' | 'error' | 'info'; title: string; detail?: string }) {
  const style = {
    warn: 'border-yellow-600 bg-yellow-950/30 text-yellow-300',
    error: 'border-red-600 bg-red-950/30 text-red-300',
    info: 'border-gray-700 bg-[#111111] text-gray-300',
  }[tone]
  return (
    <div role={tone === 'info' ? 'status' : 'alert'} className={`border px-4 py-3 text-xs ${style}`}>
      <div className="font-bold uppercase tracking-widest">{title}</div>
      {detail && <div className="mt-1 opacity-80 break-words">{detail}</div>}
    </div>
  )
}

function LoadNotice({ result, t }: { result: LoadResult; t: Strings }) {
  switch (result.status) {
    case 'loading': return <Notice tone="info" title={t.loading} />
    case 'missing': return <Notice tone="error" title={t.missingTitle} detail={t.missingDetail} />
    case 'invalid': return <Notice tone="error" title={t.invalidTitle} detail={`${t.invalidDetail} ${result.reason}`} />
    case 'error': return <Notice tone="error" title={t.errorTitle} detail={result.reason} />
    default: return null
  }
}

export default function AgentOfficeContent() {
  const [locale, setLocale] = useState<Locale>('en')
  const [source, setSource] = useState<DataSource>(IS_DEV ? { kind: 'mock', scenario: 'working' } : { kind: 'live' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setLocale(resolveLocale(params.get('lang')))
    if (!IS_DEV) return
    let stored: string | null = null
    try { stored = window.localStorage.getItem(DEV_SOURCE_KEY) } catch { /* storage unavailable */ }
    const fromUrl = parseSource(params.get('source'))
    const initial = fromUrl ?? parseSource(stored)
    if (initial) setSource(initial)
  }, [])

  const changeSource = (s: DataSource) => {
    setSource(s)
    try { window.localStorage.setItem(DEV_SOURCE_KEY, sourceKey(s)) } catch { /* storage unavailable */ }
  }

  const t = getStrings(locale)
  const { result, state, stale, now } = useOfficeState(source)
  const dimmed = !state || stale
  const agents: AgentState[] = state?.agents ?? AGENT_IDS.map(id => ({ id, status: 'idle', label: '', last_event_at: null }))

  return (
    <PageShell active="/agent-office">
      {state && <ModeBadge mode={state.mode} t={t} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-white">{t.pageTitle}</h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">{t.pageSubtitle}</p>
          </div>
          {state && (
            <p className="text-[11px] text-gray-500">
              {t.updated}:{' '}
              <time dateTime={state.updated_at} title={state.updated_at} className={stale ? 'text-yellow-400' : 'text-gray-300'}>
                {formatRelative(state.updated_at, now, locale)}
              </time>
            </p>
          )}
        </header>

        <div className="space-y-3 mb-4">
          {result.status !== 'ok' && <LoadNotice result={result} t={t} />}
          {stale && <Notice tone="warn" title={t.dataStale} detail={t.dataStaleDetail} />}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 min-w-0">
            <div className="hidden sm:block border border-[#3a3216] bg-[#0b0b0b] p-2">
              <IsometricOffice state={state} dimmed={dimmed} t={t} locale={locale} />
            </div>
            <div className="sm:hidden">
              <AgentCardList agents={agents} dimmed={dimmed} now={now} t={t} locale={locale} />
            </div>
            <EventFeed events={state?.recent_events ?? []} now={now} t={t} locale={locale} />
          </div>
          <aside className="space-y-4">
            {state && <StatusPanel state={state} t={t} locale={locale} />}
            {IS_DEV && <DevToggle source={source} onChange={changeSource} t={t} />}
          </aside>
        </div>

        <p className="mt-10 border-t border-[#1f2937] pt-4 text-[11px] leading-relaxed text-gray-500 max-w-3xl">
          {t.disclaimer}
        </p>
      </div>
    </PageShell>
  )
}
