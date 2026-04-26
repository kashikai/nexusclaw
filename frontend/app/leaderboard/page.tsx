'use client'

import dynamic from 'next/dynamic'

const LeaderboardContent = dynamic(() => import('./LeaderboardContent'), { ssr: false })

export default function LeaderboardPage() {
  return <LeaderboardContent />
}
