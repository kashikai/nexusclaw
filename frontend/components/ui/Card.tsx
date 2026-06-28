import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  accentColor?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', accentColor, hover = false, onClick }: CardProps) {
  const hoverClass  = hover ? 'hover:border-cyan-900 transition-colors' : ''
  const cursorClass = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`border bg-[#111111] ${hoverClass} ${cursorClass} ${className}`}
      style={accentColor ? { borderColor: accentColor + '40' } : { borderColor: '#1f2937' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
