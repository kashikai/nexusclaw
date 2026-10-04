'use client'

import dynamic from 'next/dynamic'

const AgentOfficeContent = dynamic(() => import('./AgentOfficeContent'), { ssr: false })

export default function AgentOfficePage() {
  return <AgentOfficeContent />
}
