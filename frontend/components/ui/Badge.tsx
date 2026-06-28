interface BadgeProps {
  label: string
  variant: 'live' | 'coming-soon' | 'active' | 'info'
}

const styles: Record<BadgeProps['variant'], string> = {
  live:          'border-green-500 text-green-400 bg-green-950/30',
  'coming-soon': 'border-yellow-600 text-yellow-500 bg-yellow-950/20',
  active:        'border-cyan-700 text-cyan-400 bg-cyan-950/20',
  info:          'border-gray-700 text-gray-400 bg-gray-900/20',
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono ${styles[variant]}`}>
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {label}
    </span>
  )
}
