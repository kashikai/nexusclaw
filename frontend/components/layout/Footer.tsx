export function Footer() {
  return (
    <footer className="ml-64 bg-nc-surface-dim border-t border-nc-blue/10 py-4 px-8 flex justify-between items-center text-[10px] uppercase tracking-widest">
      <span className="text-nc-blue font-bold font-mono-nc">© 2024 NEXUS CLAW // SECURED</span>
      <div className="flex gap-6">
        <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-nc-blue transition-colors font-mono-nc">Explorer</a>
        <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-nc-blue transition-colors font-mono-nc">GitHub</a>
      </div>
    </footer>
  )
}
