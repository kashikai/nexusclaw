export function Footer() {
  return (
    <footer className="ml-64 bg-nc-surface-dim border-t border-nc-blue/10 py-4 px-8 flex justify-between items-center text-[10px] uppercase tracking-widest">
      <span className="text-nc-blue font-bold font-mono-nc">© 2024 NEXUS CLAW // SECURED</span>
      <div className="flex gap-6 items-center">
        <a href="https://t.me/nexusclaw_live" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#229ED9] transition-colors font-mono-nc flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/></svg>
          Telegram
        </a>
        <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-nc-blue transition-colors font-mono-nc">Explorer</a>
        <a href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-nc-blue transition-colors font-mono-nc">GitHub</a>
      </div>
    </footer>
  )
}
