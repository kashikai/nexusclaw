import { Badge } from './Badge'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'live' | 'coming-soon' | 'active' | 'info'
}

export function SectionHeader({ title, subtitle, badge, badgeVariant = 'live' }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-white font-mono">{title}</h2>
        {badge && <Badge label={badge} variant={badgeVariant} />}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500 font-mono">{subtitle}</p>
      )}
    </div>
  )
}
