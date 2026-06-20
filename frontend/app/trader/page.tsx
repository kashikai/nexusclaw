'use client'

import dynamic from 'next/dynamic'

const TraderContent = dynamic(() => import('../signal-agent/SignalAgentContent'), { ssr: false })

export default function TraderPage() {
  return <TraderContent />
}
