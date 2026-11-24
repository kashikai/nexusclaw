import { DESKS, type DeskId } from './types'

/** Storage object each desk publishes to (bucket agent-office). desk1 keeps the historical file name. */
export const DESK_STATE_OBJECTS: Record<DeskId, string> = {
  desk1: 'public_state.json',
  desk2: 'desk2_state.json',
  quantbot: 'quantbot_state.json',
  desk3: 'desk3_state.json',
}

/** Desks that are announced but not trading yet: shown as "coming soon" and never polled. */
export const COMING_SOON_DESKS: ReadonlySet<DeskId> = new Set<DeskId>([])

/** Identity colour of each bot on the floor (character, nameplate, card accent). */
export const DESK_COLORS: Record<DeskId, string> = {
  desk1: '#22d3ee',
  desk2: '#c084fc',
  quantbot: '#f5c542',
  desk3: '#4ade80',
}

/** URL ?desk= value -> desk. The old 'copier' name (and no value) is desk1. */
export function resolveDesk(value: string | null | undefined): DeskId {
  const v = (value ?? '').trim().toLowerCase()
  if (v === '' || v === 'copier' || v === 'default') return 'desk1'
  return (DESKS as readonly string[]).includes(v) ? (v as DeskId) : 'desk1'
}

export function isQuantDesk(desk: DeskId): boolean {
  return desk === 'quantbot'
}
