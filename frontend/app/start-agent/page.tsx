'use client'

import dynamic from 'next/dynamic'

const StartAgentContent = dynamic(() => import('./StartAgentContent'), { ssr: false })

export default function StartAgentPage() {
  return <StartAgentContent />
}
