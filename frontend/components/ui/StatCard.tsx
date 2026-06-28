import { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  value: string
  label: string
  valueColor?: string
}

export function StatCard({ icon, value, label, valueColor = 'text-cyan-400' }: StatCardProps) {
  return (
    <div className="border border-[#1f2937] bg-[#111111] p-4">
      <div className="text-xl mb-2">{icon}</div>
      <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  )
}
