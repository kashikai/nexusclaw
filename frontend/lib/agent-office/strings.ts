import type { AgentId, AgentStatus, MockScenario, SurvivalTier } from './types'

export const LOCALES = ['en', 'pt'] as const
export type Locale = (typeof LOCALES)[number]

const en = {
  pageTitle: 'Agent Office',
  pageSubtitle: 'Live view of the signal desk. Every movement on this page is driven by a real event from the trading bot. ' +
    'Entry details stay private while a trade is open; results are published when it closes.',
  dryRunBadge: 'DEMO ACCOUNT, simulated, no real funds',
  liveBadge: 'LIVE, real funds at risk',
  dataStale: 'Bot offline',
  dataStaleDetail: 'No update in the last 5 minutes. All agents are shown as idle until the bot is back online.',
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
    scanner: 'Listens for incoming trade signals',
    analyst: 'Checks price, spread and timing before entry',
    executor: 'Places orders and manages positions',
    reporter: 'Records the result of every closed trade',
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
    modeDryRun: 'Demo account',
    modeLive: 'Live',
    tier: 'Survival tier',
    totalPnl: 'Total PnL',
    dailyPnl: 'Daily PnL',
    trades: 'Trades',
    resolved: 'closed',
    winRate: 'Win rate',
    insufficientData: (n: number) => `insufficient data (${n} closed)`,
    openPositions: 'Open trades',
    transferred: 'Transferred to treasury',
    simulatedNote: 'Demo account: all figures are simulated, no real funds.',
  },
  feed: {
    title: 'Event log',
    empty: 'No events recorded yet.',
    system: 'System',
  },
  wall: {
    desk: 'SIGNAL DESK',
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
    'Experimental software. Leveraged trading in forex, gold and CFDs carries a substantial risk of loss, including total loss. ' +
    'Past activity does not indicate future results, and nothing on this page is financial advice or a trade signal. ' +
    'This page exists to show a track record of what the agents actually did.',
}

export type Strings = typeof en

const pt: Strings = {
  pageTitle: 'Escritório dos Agentes',
  pageSubtitle: 'Visão ao vivo da mesa de sinais. Todo movimento nesta página vem de um evento real do bot de trading. ' +
    'Os detalhes da entrada ficam privados enquanto o trade está aberto; os resultados são publicados quando ele fecha.',
  dryRunBadge: 'CONTA DEMO, simulado, sem fundos reais',
  liveBadge: 'LIVE, fundos reais em risco',
  dataStale: 'Bot offline',
  dataStaleDetail: 'Nenhuma atualização nos últimos 5 minutos. Todos os agentes aparecem ociosos até o bot voltar.',
  loading: 'Carregando estado do escritório…',
  missingTitle: 'Estado público indisponível',
  missingDetail: 'O arquivo public_state.json não foi encontrado. Nenhuma atividade é exibida.',
  invalidTitle: 'Estado público rejeitado',
  invalidDetail: 'O arquivo falhou na validação e não foi exibido.',
  errorTitle: 'Não foi possível carregar o estado público',
  updated: 'Atualizado',
  agents: { scanner: 'Scanner', analyst: 'Analista', executor: 'Executor', reporter: 'Repórter' },
  roles: {
    scanner: 'Escuta os sinais de trade que chegam',
    analyst: 'Confere preço, spread e tempo antes de entrar',
    executor: 'Envia ordens e gerencia posições',
    reporter: 'Registra o resultado de cada trade fechado',
  },
  status: { idle: 'Ocioso', working: 'Trabalhando', error: 'Erro' },
  restingInLounge: 'descansando no lounge',
  tiers: { normal: 'Normal', cautious: 'Cauteloso', low_compute: 'Pouco compute', critical: 'Crítico' },
  panel: {
    title: 'Histórico verificável',
    mode: 'Modo',
    modeDryRun: 'Conta demo',
    modeLive: 'Live',
    tier: 'Nível de sobrevivência',
    totalPnl: 'PnL total',
    dailyPnl: 'PnL diário',
    trades: 'Trades',
    resolved: 'fechados',
    winRate: 'Taxa de acerto',
    insufficientData: (n: number) => `dados insuficientes (${n} fechados)`,
    openPositions: 'Trades abertos',
    transferred: 'Transferido ao tesouro',
    simulatedNote: 'Conta demo: todos os números são simulados, sem fundos reais.',
  },
  feed: { title: 'Log de eventos', empty: 'Nenhum evento registrado ainda.', system: 'Sistema' },
  wall: {
    desk: 'MESA DE SINAIS',
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
    'Software experimental. Operar forex, ouro e CFDs com alavancagem envolve risco substancial de perda, inclusive total. ' +
    'Atividade passada não indica resultados futuros, e nada nesta página é recomendação financeira nem sinal de trade. ' +
    'Esta página existe para mostrar um histórico do que os agentes realmente fizeram.',
}

const DICTS: Record<Locale, Strings> = { en, pt }

export function getStrings(locale: Locale): Strings {
  return DICTS[locale]
}

export function resolveLocale(value: string | null | undefined): Locale {
  return value === 'pt' ? 'pt' : 'en'
}

export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', pt: 'pt-BR' }
