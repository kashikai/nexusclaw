import type { AgentId, AgentStatus, MockScenario, SurvivalTier } from './types'

export const LOCALES = ['en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]

const en = {
  pageTitle: 'Agent Office',
  pageSubtitle: 'Live view of the Polyagent team. Every movement on this page is driven by a real logged event.',
  dryRunBadge: 'DRY RUN, simulated, no real funds',
  liveBadge: 'LIVE, real funds at risk',
  dataStale: 'Data stale',
  dataStaleDetail: 'Last update is older than 3 hours. All agents are shown as idle until fresh data arrives.',
  loading: 'Loading office state…',
  missingTitle: 'Public state unavailable',
  missingDetail: 'The public_state.json file was not found. No activity is shown.',
  invalidTitle: 'Public state rejected',
  invalidDetail: 'The file failed validation and was not rendered.',
  errorTitle: 'Could not load public state',
  updated: 'Updated',
  agents: {
    scanner: 'Scanner',
    analyst: 'Analyst',
    executor: 'Executor',
    reporter: 'Reporter',
  } satisfies Record<AgentId, string>,
  roles: {
    scanner: 'Scans Polymarket for candidate markets',
    analyst: 'Estimates probabilities and edge',
    executor: 'Places orders and manages positions',
    reporter: 'Publishes logs and daily reports',
  } satisfies Record<AgentId, string>,
  status: {
    idle: 'Idle',
    working: 'Working',
    error: 'Error',
  } satisfies Record<AgentStatus, string>,
  restingInLounge: 'resting in the lounge',
  tiers: {
    normal: 'Normal',
    cautious: 'Cautious',
    low_compute: 'Low compute',
    critical: 'Critical',
  } satisfies Record<SurvivalTier, string>,
  panel: {
    title: 'Track record',
    mode: 'Mode',
    modeDryRun: 'Dry run',
    modeLive: 'Live',
    tier: 'Survival tier',
    totalPnl: 'Total PnL',
    dailyPnl: 'Daily PnL',
    trades: 'Trades',
    resolved: 'resolved',
    winRate: 'Win rate',
    insufficientData: (n: number) => `insufficient data (${n} resolved)`,
    openPositions: 'Open positions',
    transferred: 'Transferred to treasury',
    simulatedNote: 'All figures are simulated while in dry run.',
  },
  feed: {
    title: 'Event log',
    empty: 'No events recorded yet.',
    system: 'System',
  },
  wall: {
    desk: 'POLYAGENT DESK',
    mode: 'MODE',
    tier: 'TIER',
    activity: 'RECENT ACTIVITY',
    noActivity: 'no recent events',
  },
  dev: {
    title: 'Dev data source',
    live: 'Live file',
    scenarios: {
      idle: 'Mock: idle',
      working: 'Mock: working',
      error: 'Mock: error',
      stale: 'Mock: stale',
    } satisfies Record<MockScenario, string>,
  },
  disclaimer:
    'Experimental software. Prediction-market trading carries a substantial risk of loss, including total loss. ' +
    'Past activity does not indicate future results, and nothing on this page is financial advice. ' +
    'This page exists to show a verifiable track record of what the agents actually did.',
}

export type Strings = typeof en

const pt: Strings = {
  pageTitle: 'Escritório dos Agentes',
  pageSubtitle: 'Visão ao vivo da equipe Polyagent. Todo movimento nesta página vem de um evento real registrado.',
  dryRunBadge: 'DRY RUN, simulado, sem fundos reais',
  liveBadge: 'LIVE, fundos reais em risco',
  dataStale: 'Dados desatualizados',
  dataStaleDetail: 'A última atualização tem mais de 3 horas. Todos os agentes aparecem ociosos até chegarem dados novos.',
  loading: 'Carregando estado do escritório…',
  missingTitle: 'Estado público indisponível',
  missingDetail: 'O arquivo public_state.json não foi encontrado. Nenhuma atividade é exibida.',
  invalidTitle: 'Estado público rejeitado',
  invalidDetail: 'O arquivo falhou na validação e não foi exibido.',
  errorTitle: 'Não foi possível carregar o estado público',
  updated: 'Atualizado',
  agents: { scanner: 'Scanner', analyst: 'Analista', executor: 'Executor', reporter: 'Repórter' },
  roles: {
    scanner: 'Varre o Polymarket em busca de mercados candidatos',
    analyst: 'Estima probabilidades e edge',
    executor: 'Envia ordens e gerencia posições',
    reporter: 'Publica logs e relatórios diários',
  },
  status: { idle: 'Ocioso', working: 'Trabalhando', error: 'Erro' },
  restingInLounge: 'descansando no lounge',
  tiers: { normal: 'Normal', cautious: 'Cauteloso', low_compute: 'Pouco compute', critical: 'Crítico' },
  panel: {
    title: 'Histórico verificável',
    mode: 'Modo',
    modeDryRun: 'Dry run',
    modeLive: 'Live',
    tier: 'Nível de sobrevivência',
    totalPnl: 'PnL total',
    dailyPnl: 'PnL diário',
    trades: 'Trades',
    resolved: 'resolvidos',
    winRate: 'Taxa de acerto',
    insufficientData: (n: number) => `dados insuficientes (${n} resolvidos)`,
    openPositions: 'Posições abertas',
    transferred: 'Transferido ao tesouro',
    simulatedNote: 'Todos os números são simulados enquanto em dry run.',
  },
  feed: { title: 'Log de eventos', empty: 'Nenhum evento registrado ainda.', system: 'Sistema' },
  wall: {
    desk: 'MESA POLYAGENT',
    mode: 'MODO',
    tier: 'NÍVEL',
    activity: 'ATIVIDADE RECENTE',
    noActivity: 'sem eventos recentes',
  },
  dev: {
    title: 'Fonte de dados (dev)',
    live: 'Arquivo real',
    scenarios: { idle: 'Mock: ocioso', working: 'Mock: trabalhando', error: 'Mock: erro', stale: 'Mock: desatualizado' },
  },
  disclaimer:
    'Software experimental. Operar em mercados de previsão envolve risco substancial de perda, inclusive total. ' +
    'Atividade passada não indica resultados futuros, e nada nesta página é recomendação financeira. ' +
    'Esta página existe para mostrar um histórico verificável do que os agentes realmente fizeram.',
}

const DICTS: Record<Locale, Strings> = { en, pt }

export function getStrings(locale: Locale): Strings {
  return DICTS[locale]
}

export function resolveLocale(value: string | null | undefined): Locale {
  return value === 'pt' ? 'pt' : 'en'
}

export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', pt: 'pt-BR' }
