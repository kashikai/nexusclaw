import type { Strings } from '@/lib/agent-office/strings'
import type { Mode } from '@/lib/agent-office/types'

/** Non-dismissible mode banner. Intentionally has no close control. */
export function ModeBadge({ mode, t }: { mode: Mode; t: Strings }) {
  const dry = mode === 'dry_run'
  return (
    <div
      role="status"
      data-testid="mode-badge"
      className={`sticky top-[67px] z-30 border-y-2 px-4 py-3 text-center font-bold uppercase tracking-[0.2em] text-sm sm:text-lg ${
        dry ? 'border-[#f5c542] bg-[#1f1a06] text-[#f5c542]' : 'border-red-500 bg-red-950 text-red-300'
      }`}
    >
      {dry ? t.dryRunBadge : t.liveBadge}
    </div>
  )
}
