'use client'

import dynamic from 'next/dynamic'

const GovernanceContent = dynamic(() => import('./GovernanceContent'), { ssr: false })

export default function GovernancePage() {
  return <GovernanceContent />
}
