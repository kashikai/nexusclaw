import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent Office — NexusClaw',
  description: 'Live view of the Polyagent team: what each agent is doing, driven only by logged events. Verifiable track record, dry run.',
}

export default function AgentOfficeLayout({ children }: { children: React.ReactNode }) {
  return children
}
