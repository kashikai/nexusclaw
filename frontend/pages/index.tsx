import React, { useState, useRef } from 'react';

const CONTRACT_ADDRESS = '0xb7Df4A46455594923150628cEA54f0a173f1b68a';
const MULTISIG_ADDRESS = '0xDde691ce2a083DEC8Ad8C8a117657045da60d93c';
const CHAIN_NAME = 'Base Sepolia';
const TICKER = '$NEXUSCLAW';

const DS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:       #070707;
    --bg-nav:   #111111;
    --bg-card:  #0F0F0F;
    --bg-raised:#1A1A1A;
    --t1: #EBEBEB;
    --t2: rgba(235,235,235,0.55);
    --t3: rgba(235,235,235,0.30);
    --red:    #E63946;
    --teal:   #1DBEAC;
    --blue:   #3A8BFF;
    --gold:   #FFBF47;
    --purple: #9B7CF4;
    --green:  #5DCE6A;
    --border: rgba(235,235,235,0.10);
    --border-h: rgba(235,235,235,0.18);
    --r: 6px; --r-md: 8px; --r-lg: 12px;
    --mono: "SF Mono","Fira Code","JetBrains Mono",monospace;
    --display: "Syne",system-ui,sans-serif;
    --ui: system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
  }
  html,body { background:var(--bg); color:var(--t1); font-family:var(--ui); min-height:100vh; -webkit-font-smoothing:antialiased; }

  /* NAV */
  .nav {
    position:sticky; top:0; z-index:100;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:52px;
    background:var(--bg-nav); border-bottom:0.5px solid var(--border);
  }
  .nav-left { display:flex; align-items:center; gap:16px; }
  .nav-logo {
    font-family:var(--display); font-size:16px; font-weight:800;
    letter-spacing:-0.5px; color:var(--t1);
    display:flex; align-items:center; gap:8px;
  }
  .nav-icon {
    width:26px; height:26px; background:var(--blue); border-radius:5px;
    display:flex; align-items:center; justify-content:center; font-size:14px;
  }
  .nav-divider { width:0.5px; height:16px; background:var(--border); }
  .nav-chain {
    display:flex; align-items:center; gap:5px;
    font-family:var(--mono); font-size:11px; color:var(--t3); letter-spacing:0.04em;
  }
  .nav-dot { width:5px; height:5px; border-radius:50%; background:var(--teal); animation:blink 2s ease-in-out infinite; }
  .nav-right { display:flex; align-items:center; gap:6px; }

  /* BUTTONS */
  .btn-ghost {
    display:inline-flex; align-items:center; gap:5px;
    padding:6px 12px; border-radius:var(--r);
    background:transparent; color:var(--t2);
    font-size:12px; font-weight:500; font-family:var(--ui);
    border:0.5px solid var(--border); cursor:pointer;
    transition:all 0.15s ease; text-decoration:none;
  }
  .btn-ghost:hover { border-color:var(--border-h); color:var(--t1); background:rgba(235,235,235,0.04); }

  .btn-primary {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:11px 20px; border-radius:var(--r);
    background:var(--t1); color:#111; font-size:13px; font-weight:600;
    border:none; cursor:pointer; font-family:var(--ui);
    transition:all 0.15s ease; width:100%;
  }
  .btn-primary:hover { background:#fff; transform:translateY(-1px); }

  .btn-teal {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:11px 20px; border-radius:var(--r);
    background:rgba(29,190,172,0.10); color:var(--teal);
    font-size:13px; font-weight:600; font-family:var(--ui);
    border:0.5px solid rgba(29,190,172,0.22); cursor:pointer;
    transition:all 0.15s ease; width:100%;
  }
  .btn-teal:hover { background:rgba(29,190,172,0.16); }

  .btn-stake {
    display:flex; align-items:center; justify-content:center;
    width:100%; padding:12px; border-radius:var(--r);
    background:var(--t1); color:#111; font-size:13px; font-weight:600;
    border:none; cursor:pointer; font-family:var(--ui);
    transition:all 0.15s ease;
  }
  .btn-stake:hover:not(:disabled) { background:#fff; transform:translateY(-1px); }
  .btn-stake:disabled { opacity:0.2; cursor:not-allowed; transform:none; }

  /* PAGE */
  .page { max-width:540px; margin:0 auto; padding:48px 20px 96px; display:flex; flex-direction:column; gap:1px; }

  /* HERO */
  .hero { padding:16px 0 44px; animation:fade-up 0.5s ease both; }
  .hero-tag {
    display:inline-flex; align-items:center; gap:5px;
    font-family:var(--mono); font-size:11px; font-weight:600;
    letter-spacing:0.06em; text-transform:uppercase;
    padding:3px 10px; border-radius:100px; margin-bottom:20px;
    background:rgba(230,57,70,0.10); color:var(--red);
    border:0.5px solid rgba(230,57,70,0.22);
  }
  .hero-title {
    font-family:var(--display); font-size:clamp(44px,9vw,62px);
    font-weight:800; letter-spacing:-2.5px; line-height:0.95;
    color:var(--t1); margin-bottom:16px;
  }
  .hero-title span { color:var(--blue); }
  .hero-sub { font-size:14px; color:var(--t2); line-height:1.6; max-width:380px; }

  /* STATS */
  .stats {
    display:grid; grid-template-columns:repeat(3,1fr);
    border:0.5px solid var(--border); border-radius:var(--r-lg); overflow:hidden;
    animation:fade-up 0.5s 0.05s ease both;
  }
  .stat { padding:18px 16px; border-right:0.5px solid var(--border); background:var(--bg-card); }
  .stat:last-child { border-right:none; }
  .stat-num {
    font-family:var(--display); font-size:26px; font-weight:800;
    letter-spacing:-1px; line-height:1; margin-bottom:4px;
  }
  .stat-key { font-family:var(--mono); font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:var(--t3); }

  /* CARD */
  .card {
    background:var(--bg-card); border:0.5px solid var(--border);
    border-radius:var(--r-lg); padding:20px; position:relative;
    transition:border-color 0.2s;
  }
  .card:hover { border-color:var(--border-h); }
  .card-label { font-family:var(--mono); font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--t3); margin-bottom:14px; }

  /* WALLET CONNECTED */
  .wallet-info {
    display:flex; align-items:center; gap:8px; margin-top:10px;
    padding:9px 12px; border-radius:var(--r);
    background:rgba(29,190,172,0.05); border:0.5px solid rgba(29,190,172,0.16);
    font-family:var(--mono); font-size:11px; color:var(--teal);
  }
  .pulse { width:5px; height:5px; border-radius:50%; background:var(--teal); animation:blink 1.8s ease-in-out infinite; flex-shrink:0; }

  /* INPUT */
  .input-wrap { position:relative; margin-bottom:8px; }
  .input {
    width:100%; background:var(--bg-raised); border:0.5px solid var(--border);
    border-radius:var(--r); padding:12px 90px 12px 14px;
    font-family:var(--mono); font-size:16px; font-weight:500; color:var(--t1);
    outline:none; transition:border-color 0.15s, box-shadow 0.15s;
    -moz-appearance:textfield;
  }
  .input::-webkit-inner-spin-button, .input::-webkit-outer-spin-button { -webkit-appearance:none; }
  .input:focus { border-color:rgba(58,139,255,0.45); box-shadow:0 0 0 2px rgba(58,139,255,0.07); }
  .input::placeholder { color:var(--t3); }
  .input-suffix {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    font-family:var(--mono); font-size:10px; font-weight:600;
    letter-spacing:0.06em; color:var(--blue); pointer-events:none;
  }
  .reward {
    display:flex; justify-content:space-between; align-items:center;
    padding:9px 12px; margin-top:8px; border-radius:var(--r);
    background:rgba(58,139,255,0.05); border:0.5px solid rgba(58,139,255,0.12);
  }
  .reward-label { font-family:var(--mono); font-size:11px; color:var(--t3); }
  .reward-val { font-family:var(--mono); font-size:12px; font-weight:500; color:var(--teal); }

  /* INFO TABLE */
  .info-table { width:100%; border-collapse:collapse; }
  .info-table tr { border-bottom:0.5px solid rgba(235,235,235,0.06); }
  .info-table tr:last-child { border-bottom:none; }
  .info-table td { padding:9px 0; vertical-align:middle; }
  .td-k { font-family:var(--mono); font-size:11px; color:var(--t3); letter-spacing:0.04em; }
  .td-v { font-family:var(--mono); font-size:12px; color:var(--t2); text-align:right; }
  .td-v a { color:var(--blue); text-decoration:none; transition:color 0.15s; }
  .td-v a:hover { color:var(--teal); }
  .status-pill {
    display:inline-flex; align-items:center; gap:4px;
    padding:2px 8px; border-radius:100px;
    font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:0.05em;
    background:rgba(29,190,172,0.08); color:var(--teal); border:0.5px solid rgba(29,190,172,0.2);
  }
  .status-pill::before { content:''; width:4px; height:4px; border-radius:50%; background:var(--teal); animation:blink 1.8s ease-in-out infinite; }

  /* FEE */
  .fee-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
  .fee-title { font-size:13px; font-weight:600; color:var(--t1); }
  .fee-sub { font-family:var(--mono); font-size:10px; color:var(--t3); margin-top:2px; letter-spacing:0.04em; }
  .fee-badge {
    font-family:var(--mono); font-size:10px; font-weight:600; padding:3px 8px;
    border-radius:var(--r); background:rgba(230,57,70,0.10); color:var(--red);
    border:0.5px solid rgba(230,57,70,0.20);
  }
  .fee-track { display:flex; height:4px; border-radius:100px; overflow:hidden; gap:2px; margin-bottom:12px; }
  .fee-seg { height:100%; border-radius:2px; }
  .fee-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid rgba(235,235,235,0.06); }
  .fee-row:last-child { border-bottom:none; }
  .fee-row-l { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--t2); }
  .fee-dot { width:7px; height:7px; border-radius:2px; flex-shrink:0; }
  .fee-pct { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--t1); }

  /* SECURITY */
  .sec-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:0.5px solid rgba(235,235,235,0.06); }
  .sec-row:last-child { border-bottom:none; }
  .sec-k { font-family:var(--mono); font-size:11px; color:var(--t3); letter-spacing:0.04em; }
  .sec-v { font-family:var(--mono); font-size:11px; color:var(--t2); }

  /* FOOTER */
  .footer {
    padding-top:24px; margin-top:32px; border-top:0.5px solid var(--border);
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:10px; animation:fade-up 0.5s 0.25s ease both;
  }
  .footer-copy { font-family:var(--mono); font-size:11px; color:var(--t3); }
  .footer-links { display:flex; gap:4px; }
  .footer-link {
    font-size:12px; color:var(--t3); text-decoration:none;
    padding:5px 10px; border-radius:var(--r);
    transition:color 0.15s, background 0.15s;
  }
  .footer-link:hover { color:var(--t1); background:rgba(235,235,235,0.05); }

  /* TOAST */
  .toast {
    position:fixed; bottom:20px; left:50%;
    transform:translateX(-50%) translateY(60px);
    background:var(--bg-raised); border:0.5px solid var(--border-h);
    border-radius:var(--r); padding:9px 16px;
    font-family:var(--mono); font-size:12px; color:var(--teal);
    z-index:300; transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
    white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,0.5);
    pointer-events:none;
  }
  .toast.show { transform:translateX(-50%) translateY(0); }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  @media (max-width:480px) {
    .nav { padding:0 16px; }
    .nav-right .btn-ghost:first-child { display:none; }
    .page { padding:32px 16px 72px; }
    .hero-title { letter-spacing:-1.5px; }
    .footer { flex-direction:column; align-items:flex-start; }
  }
`;

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [toast, setToast] = useState('');
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setShowToast(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowToast(false), 2600);
  };

  const copy = (val: string, label: string) =>
    navigator.clipboard.writeText(val).then(() => notify(`${label} copied`));

  const short = (a: string) => a.slice(0, 6) + '...' + a.slice(-4);

  const yearlyReward = stakeAmount && parseFloat(stakeAmount) > 0
    ? (parseFloat(stakeAmount) * 0.20).toLocaleString('en', { maximumFractionDigits: 2 })
    : null;

  return (
    <>
      <style>{DS}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-left">
          <div className="nav-logo">
            <div className="nav-icon">🦞</div>
            NexusClaw
          </div>
          <div className="nav-divider" />
          <div className="nav-chain">
            <div className="nav-dot" />
            Base Sepolia
          </div>
        </div>
        <div className="nav-right">
          <a className="btn-ghost" href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <a className="btn-ghost" href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
            Basescan ↗
          </a>
        </div>
      </nav>

      {/* ── PAGE ── */}
      <div className="page">

        {/* Hero */}
        <div className="hero">
          <div className="hero-tag">🦞 Testnet Live</div>
          <h1 className="hero-title">Stake<br /><span>{TICKER}</span></h1>
          <p className="hero-sub">
            The worldwide economic layer for autonomous AI agents.
            Earn 20% APY while powering the agent economy on Base.
          </p>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <div className="stat-num" style={{ color: 'var(--teal)' }}>20%</div>
            <div className="stat-key">APY</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: 'var(--red)' }}>1%</div>
            <div className="stat-key">Burn Fee</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: 'var(--blue)' }}>100B</div>
            <div className="stat-key">Supply</div>
          </div>
        </div>

        {/* Wallet */}
        <div className="card" style={{ animationDelay: '0.08s', animation: 'fade-up 0.5s 0.08s ease both' }}>
          <div className="card-label">// wallet</div>
          <button className={connected ? 'btn-teal' : 'btn-primary'} onClick={() => { setConnected(v => !v); notify(connected ? 'Wallet disconnected' : 'Connected to Base Sepolia'); }}>
            {connected ? `✓ Connected · 0xB097...E572` : 'Connect Wallet'}
          </button>
          {connected && (
            <div className="wallet-info">
              <div className="pulse" />
              0xB097...E572 · Base Sepolia · Chain 84532
            </div>
          )}
        </div>

        {/* Staking */}
        {connected && (
          <div className="card" style={{ animation: 'fade-up 0.4s ease both' }}>
            <div className="card-label">// stake</div>
            <div className="input-wrap">
              <input
                type="number"
                className="input"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder="0.00"
                min="0"
              />
              <span className="input-suffix">NEXUSCLAW</span>
            </div>
            <button
              className="btn-stake"
              disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
              onClick={() => notify(`Staking ${parseFloat(stakeAmount).toLocaleString()} ${TICKER}…`)}
            >
              Stake {stakeAmount && parseFloat(stakeAmount) > 0 ? `${parseFloat(stakeAmount).toLocaleString()} ` : ''}{TICKER}
            </button>
            {yearlyReward && (
              <div className="reward">
                <span className="reward-label">Estimated yearly reward</span>
                <span className="reward-val">+{yearlyReward} NEXUSCLAW</span>
              </div>
            )}
          </div>
        )}

        {/* Contract Info */}
        <div className="card" style={{ animation: 'fade-up 0.5s 0.1s ease both' }}>
          <div className="card-label">// contract</div>
          <table className="info-table">
            <tbody>
              <tr>
                <td className="td-k">token</td>
                <td className="td-v">
                  <span style={{ color: 'var(--blue)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '11px' }}
                    onClick={() => copy(CONTRACT_ADDRESS, 'Contract address')}
                    title={CONTRACT_ADDRESS}>
                    {short(CONTRACT_ADDRESS)}
                  </span>
                </td>
              </tr>
              <tr><td className="td-k">network</td><td className="td-v">{CHAIN_NAME}</td></tr>
              <tr><td className="td-k">supply</td><td className="td-v">100,000,000,000</td></tr>
              <tr><td className="td-k">burn fee</td><td className="td-v"><span className="status-pill">1% active</span></td></tr>
              <tr><td className="td-k">staking apy</td><td className="td-v" style={{ color: 'var(--teal)' }}>20% bootstrap</td></tr>
              <tr><td className="td-k">status</td><td className="td-v" style={{ color: 'var(--gold)' }}>testnet · mainnet soon</td></tr>
            </tbody>
          </table>
        </div>

        {/* Fee Distribution */}
        <div className="card" style={{ animation: 'fade-up 0.5s 0.13s ease both' }}>
          <div className="card-label">// fee distribution</div>
          <div className="fee-top">
            <div>
              <div className="fee-title">1% per transfer</div>
              <div className="fee-sub">applied to all swaps including DEX pairs</div>
            </div>
            <div className="fee-badge">BURN ON</div>
          </div>
          <div className="fee-track">
            <div className="fee-seg" style={{ width: '50%', background: 'var(--red)' }} />
            <div className="fee-seg" style={{ width: '30%', background: 'var(--blue)' }} />
            <div className="fee-seg" style={{ width: '20%', background: 'var(--teal)' }} />
          </div>
          <div>
            {[
              { label: 'Burn', pct: '50%', color: 'var(--red)' },
              { label: 'Treasury', pct: '30%', color: 'var(--blue)' },
              { label: 'Staking Rewards', pct: '20%', color: 'var(--teal)' },
            ].map(({ label, pct, color }) => (
              <div className="fee-row" key={label}>
                <div className="fee-row-l">
                  <div className="fee-dot" style={{ background: color }} />
                  {label}
                </div>
                <span className="fee-pct">{pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card" style={{ animation: 'fade-up 0.5s 0.16s ease both' }}>
          <div className="card-label">// security</div>
          <div className="sec-row">
            <span className="sec-k">multisig</span>
            <span className="sec-v" style={{ color: 'var(--purple)', cursor: 'pointer' }}
              onClick={() => copy(MULTISIG_ADDRESS, 'Multisig address')}>
              {short(MULTISIG_ADDRESS)}
            </span>
          </div>
          <div className="sec-row">
            <span className="sec-k">threshold</span>
            <span className="sec-v" style={{ color: 'var(--purple)' }}>3 / 5 signers</span>
          </div>
          <div className="sec-row">
            <span className="sec-k">timelock</span>
            <span className="sec-v" style={{ color: 'var(--teal)' }}>24h on admin ops</span>
          </div>
          <div className="sec-row">
            <span className="sec-k">deployer roles</span>
            <span className="sec-v" style={{ color: 'var(--green)' }}>revoked ✓</span>
          </div>
          <div className="sec-row">
            <span className="sec-k">audit</span>
            <span className="sec-v">
              <a href="https://github.com/kashikai/nexusclaw/blob/main/AUDIT_REPORT.md"
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--blue)', textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                AUDIT_REPORT.md ↗
              </a>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <span className="footer-copy">© 2026 NexusClaw · Built by Tiago &amp; Hanna 🦞</span>
          <div className="footer-links">
            <a className="footer-link" href="https://github.com/kashikai/nexusclaw" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a className="footer-link" href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">Basescan ↗</a>
          </div>
        </div>

      </div>

      {/* Toast */}
      <div className={`toast${showToast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}
