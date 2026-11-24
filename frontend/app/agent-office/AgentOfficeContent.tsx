'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { IsometricOffice } from '@/components/agent-office/IsometricOffice'
import { StatusPanel } from '@/components/agent-office/StatusPanel'
import { EventFeed } from '@/components/agent-office/EventFeed'
import { ModeBadge } from '@/components/agent-office/ModeBadge'
import { AgentCardList } from '@/components/agent-office/AgentCardList'
import { TradingFloor, type FloorDesk } from '@/components/agent-office/TradingFloor'
import { BotCards, FloorOverallPanel } from '@/components/agent-office/FloorOverview'
import { useAllDesks } from '@/lib/agent-office/useAllDesks'
import { projectPublicState } from '@/lib/agent-office/presentation'
import { formatRelative } from '@/lib/agent-office/format'
import { deskPresence, summarizeFloor } from '@/lib/agent-office/floor'
import { COMING_SOON_DESKS, isQuantDesk, resolveDesk } from '@/lib/agent-office/desks'
import { getStrings, resolveLocale, type Strings } from '@/lib/agent-office/strings'
import { AGENT_IDS, DESKS, MOCK_SCENARIOS, type AgentState, type DataSource, type DeskId, type LoadResult } from '@/lib/agent-office/types'
import type { Locale } from '@/lib/agent-office/strings'

const Office3D = dynamic(
  () => import('@/components/agent-office/Office3D').then(m => m.Office3D),
  { ssr: false },
)

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

function useMinWidth(px: number): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(`(min-width: ${px}px)`)
    const update = () => setMatches(mq.matches)
    update()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [px])
  return matches
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
  const [desk, setDesk] = useState<DeskId>('desk1')
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const [cameraResetSeq, setCameraResetSeq] = useState(0)
  const [source, setSource] = useState<DataSource>(IS_DEV ? { kind: 'mock', scenario: 'working' } : { kind: 'live' })
  // WebGL is only mounted where the 3D panel is visible (sm and up); mobile keeps the cards.
  const isSmUp = useMinWidth(640)
  const { views, now } = useAllDesks(source)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setLocale(resolveLocale(params.get('lang')))
    if (params.get('desk')) setDesk(resolveDesk(params.get('desk')))
    if (params.get('view') === '2d') setViewMode('2d')
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

  const selectDesk = (next: DeskId) => {
    setDesk(next)
    try {
      const url = new URL(window.location.href)
      if (next === 'desk1') url.searchParams.delete('desk')
      else url.searchParams.set('desk', next)
      window.history.replaceState({}, '', url.toString())
    } catch { /* history unavailable */ }
  }

  const t = getStrings(locale)
  const floorDesks: FloorDesk[] = DESKS.map(d => ({ desk: d, presence: deskPresence(d, views[d]), state: views[d].state }))
  const summary = summarizeFloor(views)

  // Detail of the selected bot: only its own data is ever rendered here.
  const { result, state, stale } = views[desk]
  const comingSoon = COMING_SOON_DESKS.has(desk)
  const dimmed = !state || stale
  // Display projection for every visual sink (3D, 2D, cards, feed); aggregates (StatusPanel, ModeBadge) keep the raw state.
  const projected = useMemo(() => projectPublicState(state, t.view.protectedEvent), [state, t.view.protectedEvent])
  const agents: AgentState[] = projected?.agents ?? AGENT_IDS.map(id => ({ id, status: 'idle', label: '', last_event_at: null }))
  const subtitle = isQuantDesk(desk) ? t.desks.quantbotSubtitle : t.desks.copierSubtitle
  const viewKey = `${desk}:${sourceKey(source)}`

  return (
    <PageShell active="/agent-office">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-5">
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-white">{t.pageTitle}</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">{t.pageSubtitle}</p>
        </header>

        {/* Whole floor: overall result, every bot at its desk, one card per bot */}
        <div className="space-y-4 mb-10">
          <FloorOverallPanel summary={summary} t={t} locale={locale} />
          <div className="border border-[#3a3216] bg-[#0b0b0b] p-2">
            <TradingFloor desks={floorDesks} summary={summary} selected={desk} onSelect={selectDesk} t={t} locale={locale} />
          </div>
          <p className="text-[11px] text-gray-500">{t.floor.selectHint}</p>
          <BotCards cards={floorDesks} selected={desk} onSelect={selectDesk} now={now} t={t} locale={locale} />
        </div>

        {/* Selected bot in detail */}
        <section role="tabpanel" aria-labelledby={`desk-tab-${desk}`} tabIndex={0} className="focus-visible:outline-none">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#262626] pb-3">
            <div>
              <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">{t.floor.detailsTitle(t.desks[desk])}</h2>
              {!comingSoon && <p className="text-xs text-gray-400 mt-1 max-w-2xl">{subtitle}</p>}
            </div>
            {state && !comingSoon && (
              <p className="text-[11px] text-gray-500">
                {t.updated}:{' '}
                <time dateTime={state.updated_at} title={state.updated_at} className={stale ? 'text-yellow-400' : 'text-gray-300'}>
                  {formatRelative(state.updated_at, now, locale)}
                </time>
              </p>
            )}
          </div>

          {comingSoon ? (
            <Notice tone="info" title={t.floor.presence.soon} detail={t.floor.comingSoonDetail} />
          ) : (
            <>
              {state && <div className="mb-4"><ModeBadge mode={state.mode} t={t} /></div>}
              <div className="space-y-3 mb-4">
                {result.status !== 'ok' && <LoadNotice result={result} t={t} />}
                {stale && <Notice tone="warn" title={t.dataStale} detail={t.dataStaleDetail} />}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4 min-w-0">
                  <div className="hidden sm:block border border-[#3a3216] bg-[#0b0b0b] p-2">
                    <div
                      className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1f2937] text-[11px] font-mono"
                      role="toolbar"
                      aria-label={t.view.controlsLabel}
                    >
                      <div className="flex items-center gap-1.5">
                        {(['3d', '2d'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={viewMode === m}
                            onClick={() => setViewMode(m)}
                            className={`px-2.5 py-1 border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${
                              viewMode === m
                                ? 'border-[#f5c542] text-[#f5c542] bg-[#1c180b]'
                                : 'border-gray-700 text-gray-400 hover:text-white'
                            }`}
                          >
                            {m === '3d' ? t.view.mode3d : t.view.mode2d}
                          </button>
                        ))}
                      </div>
                      {viewMode === '3d' && (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-500 hidden md:inline">{t.view.dragHint}</span>
                          <button
                            type="button"
                            onClick={() => setCameraResetSeq(n => n + 1)}
                            className="px-2 py-1 border border-gray-700 text-gray-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542]"
                          >
                            {t.view.resetCamera}
                          </button>
                        </div>
                      )}
                    </div>

                    {viewMode === '3d' ? (
                      isSmUp && (
                        <Office3D
                          state={projected}
                          dimmed={dimmed}
                          t={t}
                          locale={locale}
                          desk={desk}
                          resetSignal={cameraResetSeq}
                          sessionKey={viewKey}
                        />
                      )
                    ) : (
                      <IsometricOffice state={projected} dimmed={dimmed} t={t} locale={locale} desk={desk} />
                    )}
                  </div>
                  <div className="sm:hidden">
                    <AgentCardList agents={agents} dimmed={dimmed} now={now} t={t} locale={locale} desk={desk} />
                  </div>
                  <EventFeed events={projected?.recent_events ?? []} now={now} t={t} locale={locale} />
                </div>
                <aside className="space-y-4">
                  {state && <StatusPanel state={state} t={t} locale={locale} />}
                  {IS_DEV && <DevToggle source={source} onChange={changeSource} t={t} />}
                </aside>
              </div>
            </>
          )}
        </section>

        <p className="mt-10 border-t border-[#1f2937] pt-4 text-[11px] leading-relaxed text-gray-500 max-w-3xl">
          {t.disclaimer}
        </p>
      </div>
    </PageShell>
  )
}
