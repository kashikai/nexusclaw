import { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'

interface PageShellProps {
  children: ReactNode
  variant?: 'public' | 'app'
  active?: string
  className?: string
}

export function PageShell({ children, variant = 'public', active, className = '' }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col">
      <SiteNav variant={variant} active={active} />
      <main className={`pt-20 flex-1 ${className}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
