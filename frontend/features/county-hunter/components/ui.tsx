import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#2c3442] bg-[#15191f] p-5 ${className}`}>{children}</section>
}

export function Button({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`rounded-md bg-[#abc7ff] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#00285a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function SecondaryButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`rounded-md border border-[#414754] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#c4c7cf] transition hover:border-[#abc7ff] hover:text-[#abc7ff] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'warning' | 'danger' | 'neutral' | 'info' }) {
  const tones = {
    good: 'border-[#4ddbc9]/30 bg-[#4ddbc9]/10 text-[#78e7d8]',
    warning: 'border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5d878]',
    danger: 'border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]',
    info: 'border-[#abc7ff]/30 bg-[#abc7ff]/10 text-[#abc7ff]',
    neutral: 'border-[#414754] bg-[#20252d] text-[#aeb4bf]',
  }
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b919f]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[#69717e]">{hint}</span>}
    </label>
  )
}

const fieldClass = 'w-full rounded-md border border-[#343b47] bg-[#0f1217] px-3 py-2.5 text-sm text-[#e5e2e1] outline-none transition placeholder:text-[#59606b] focus:border-[#abc7ff]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-24 ${props.className ?? ''}`} />
}

export function PageHeader({ eyebrow = 'County Hunter', title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="mb-2 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.24em] text-[#abc7ff]">{eyebrow}</p>
        <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#f0f1f4]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b919f]">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function LoadingState() {
  return <Card><p className="animate-pulse text-sm text-[#8b919f]">Loading verified County Hunter data…</p></Card>
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-[#ffb4ab]/30">
      <Badge tone="danger">Access or data error</Badge>
      <p className="mt-3 text-sm leading-6 text-[#c8c9ce]">{message}</p>
    </Card>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="text-center">
      <span className="material-symbols-outlined text-4xl text-[#59606b]">inventory_2</span>
      <h2 className="mt-3 font-['Space_Grotesk'] text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#8b919f]">{description}</p>
    </Card>
  )
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2c3442] bg-[#15191f]">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead className="border-b border-[#2c3442] bg-[#11151a]">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#747c89]">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#252c35]">{children}</tbody>
      </table>
    </div>
  )
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not confirmed'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Not confirmed'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}
