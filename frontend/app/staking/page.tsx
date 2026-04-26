'use client'

import dynamic from 'next/dynamic'

const StakingContent = dynamic(() => import('./StakingContent'), { ssr: false })

export default function StakingPage() {
  return <StakingContent />
}
