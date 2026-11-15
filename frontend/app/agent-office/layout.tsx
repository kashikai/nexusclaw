import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Office — NexusClaw',
  description: 'Live view of the signal desk: what each trading agent is doing right now, driven only by real bot events. Results are published when each trade closes.',
}

export default function AgentOfficeLayout({ children }: { children: React.ReactNode }) {
  return children
}
