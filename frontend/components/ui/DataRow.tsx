import { ReactNode } from 'react'

interface DataRowProps {
  label: string
  value: ReactNode
  valueColor?: string
  noBorder?: boolean
}

export function DataRow({ label, value, valueColor = 'text-cyan-400', noBorder = false }: DataRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 ${noBorder ? '' : 'border-b border-[#1f2937]'}`}>
      <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">{label}</span>
      <span className={`text-xs font-bold font-mono ${valueColor}`}>{value}</span>
    </div>
  )
}
