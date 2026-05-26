'use client'

import dynamic from 'next/dynamic'

const SignalAgentContent = dynamic(() => import('./SignalAgentContent'), { ssr: false })

export default function SignalAgentPage() {
  return <SignalAgentContent />
}
