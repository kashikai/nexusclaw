import React, { useState, useEffect, useCallback } from 'react';

const STAKING_ADDRESS = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe';
const TOKEN_ADDRESS = '0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6';
const AGENT_ADDRESS = '0xF350367d4E3e0e45dc0f9E425741A86b8cf7e66f';
const DEPLOY_BLOCK = BigInt(39000000);
const RPC_URL = 'https://base-mainnet.public.blastapi.io';

const DS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #070707;
    --bg-nav: #0a0a0a;
    --bg-card: #0e0e0e;
    --bg-raised: #161616;
    --bg-glow: #1a1a1a;
    --t1: #EBEBEB;
    --t2: rgba(235,235,235,0.75);
    --t3: rgba(235,235,235,0.40);
    --primary: #abc7ff;
    --secondary: #00eefc;
    --blue: #3A8BFF;
    --teal: #1DBEAC;
    --red: #E63946;
    --gold: #FFBF47;
    --purple: #9B7CF4;
    --green: #5DCE6A;
    --border: rgba(235,235,235,0.08);
    --border-h: rgba(235,235,235,0.15);
    --glow-sm: 0 0 20px rgba(171, 199, 255, 0.15);
    --glow-md: 0 0 40px rgba(171, 199, 255, 0.1);
    --r: 0px;
    --mono: "Space Mono","SF Mono","Fira Code",monospace;
    --display: "Syne",system-ui,sans-serif;
    --body: "Space Grotesk",system-ui,sans-serif;
  }
  html,body { background:var(--bg); color:var(--t1); font-family:var(--body); min-height:100vh; -webkit-font-smoothing:antialiased; }
  .nav { position:sticky; top:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:0 24px; height:56px; background:rgba(7,7,7,0.92); backdrop-filter:blur(12px); border-bottom:0.5px solid var(--border); }
  .nav-left { display:flex; align-items:center; gap:16px; }
  .nav-logo { font-family:var(--display); font-size:15px; font-weight:800; letter-spacing:-0.3px; color:var(--t1); text-decoration:none; display:flex; align-items:center; gap:8px; }
  .nav-icon { width:28px; height:28px; background:linear-gradient(135deg,var(--blue),var(--secondary)); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:13px; }
  .nav-links { display:flex; gap:2px; }
  .nav-link { padding:6px 14px; font-size:12px; font-weight:500; color:var(--t3); text-decoration:none; border-radius:var(--r); transition:all 0.15s ease; }
  .nav-link:hover { color:var(--t1); background:rgba(255,255,255,0.04); }
  .nav-link.active { color:var(--primary); }
  .nav-right { display:flex; align-items:center; gap:8px; }
  .btn-ghost { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; background:transparent; color:var(--t2); font-size:12px; font-weight:500; border:0.5px solid var(--border); cursor:pointer; transition:all 0.15s ease; text-decoration:none; font-family:var(--body); }
  .btn-ghost:hover { border-color:var(--border-h); color:var(--t1); background:rgba(255,255,255,0.03); }
  .page { max-width:900px; margin:0 auto; padding:48px 24px 96px; }
  .header { margin-bottom:48px; }
  .header-top { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; letter-spacing:0.06em; text-transform:uppercase; padding:4px 12px; border-radius:var(--r); background:rgba(0,238,252,0.08); color:var(--secondary); border:0.5px solid rgba(0,238,252,0.2); }
  .badge-dot { width:5px; height:5px; border-radius:50%; background:var(--secondary); animation:pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .header-title { font-family:var(--display); font-size:clamp(36px,6vw,56px); font-weight:800; letter-spacing:-2px; line-height:0.95; color:var(--t1); margin-bottom:12px; }
  .header-title span { color:var(--secondary); }
  .header-sub { font-size:14px; color:var(--t3); max-width:480px; line-height:1.6; }
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; margin-bottom:32px; border:0.5px solid var(--border); border-radius:var(--r); overflow:hidden; background:var(--border); }
  .stat-card { padding:20px 24px; background:var(--bg-card); display:flex; flex-direction:column; gap:8px; }
  .stat-label { font-family:var(--mono); font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--t3); }
  .stat-value { font-family:var(--display); font-size:28px; font-weight:800; letter-spacing:-1px; color:var(--t1); }
  .stat-value.teal { color:var(--teal); }
  .stat-value.gold { color:var(--gold); }
  .stat-value.blue { color:var(--blue); }
  .stat-sub { font-size:11px; color:var(--t3); font-family:var(--mono); }
  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .section-title { font-family:var(--display); font-size:14px; font-weight:700; letter-spacing:-0.2px; color:var(--t1); }
  .leaderboard { border:0.5px solid var(--border); border-radius:var(--r); overflow:hidden; background:var(--bg-card); }
  .leaderboard-header { display:grid; grid-template-columns:64px 1fr 120px 120px 100px; gap:12px; padding:12px 20px; background:var(--bg-raised); border-bottom:0.5px solid var(--border); }
  .leaderboard-header span { font-family:var(--mono); font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:var(--t3); }
  .leaderboard-row { display:grid; grid-template-columns:64px 1fr 120px 120px 100px; gap:12px; padding:16px 20px; border-bottom:0.5px solid var(--border); background:var(--bg-card); transition:background 0.15s ease; cursor:default; }
  .leaderboard-row:last-child { border-bottom:none; }
  .leaderboard-row:hover { background:var(--bg-raised); }
  .leaderboard-row.agent { background:rgba(0,238,252,0.04); border-left:2px solid var(--secondary); }
  .leaderboard-row.agent:hover { background:rgba(0,238,252,0.07); }
  .rank { font-family:var(--mono); font-size:13px; font-weight:700; color:var(--t3); display:flex; align-items:center; }
  .rank-top { color:var(--gold); font-size:16px; }
  .rank-top-1 { color:var(--gold); text-shadow:0 0 12px rgba(255,191,71,0.4); }
  .rank-top-2 { color:#C0C0C0; }
  .rank-top-3 { color:#CD7F32; }
  .rank-agent { font-size:9px; color:var(--secondary); letter-spacing:0.05em; }
  .address { font-family:var(--mono); font-size:12px; color:var(--t2); display:flex; align-items:center; gap:8px; }
  .address-icon { width:20px; height:20px; border-radius:2px; background:var(--bg-raised); display:flex; align-items:center; justify-content:center; font-size:10px; }
  .address-agent { color:var(--secondary); font-size:10px; }
  .staked { font-family:var(--mono); font-size:13px; color:var(--t1); text-align:right; }
  .pending { font-family:var(--mono); font-size:12px; text-align:right; }
  .pending-value { color:var(--green); }
  .pending-value.high { color:var(--teal); }
  .date { font-family:var(--mono); font-size:11px; color:var(--t3); text-align:right; }
  .loading { display:flex; align-items:center; justify-content:center; padding:80px 24px; color:var(--t3); font-family:var(--mono); font-size:13px; gap:12px; }
  .loading-spinner { width:16px; height:16px; border:2px solid var(--border); border-top-color:var(--secondary); border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .error { padding:32px 24px; text-align:center; color:var(--red); font-family:var(--mono); font-size:13px; background:var(--bg-card); border:0.5px solid rgba(230,57,70,0.2); border-radius:var(--r); }
  .empty { padding:60px 24px; text-align:center; color:var(--t3); font-size:13px; }
  .agent-tag { display:inline-flex; align-items:center; gap:4px; padding:2px 6px; background:rgba(0,238,252,0.1); border:0.5px solid rgba(0,238,252,0.25); border-radius:2px; font-family:var(--mono); font-size:9px; color:var(--secondary); letter-spacing:0.04em; }
  .refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:transparent; border:0.5px solid var(--border); font-family:var(--mono); font-size:11px; color:var(--t3); cursor:pointer; transition:all 0.15s ease; }
  .refresh-btn:hover { border-color:var(--secondary); color:var(--secondary); }
  @media(max-width:640px) {
    .stats-grid { grid-template-columns:repeat(2,1fr); }
    .leaderboard-header { display:none; }
    .leaderboard-row { grid-template-columns:48px 1fr; gap:8px; padding:14px 16px; }
    .staked-col,.pending-col,.date-col { display:none; }
    .header-title { font-size:32px; }
  }
`;

const STAKING_ABI = [
  { inputs: [], name: 'totalStaked', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'rewardPool', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'rewardPoolRunway', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }], name: 'getUserInfo', outputs: [{ name: 'staked', type: 'uint256' }, { name: 'pending', type: 'uint256' }, { name: 'stakedAt', type: 'uint256' }, { name: 'effectiveAPY', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const EVENTS_ABI = [
  { name: 'StakerAdded', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }] },
  { name: 'Staked', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
  { name: 'Unstaked', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }] },
] as const;

interface StakerInfo {
  address: string;
  staked: bigint;
  pending: bigint;
  stakedAt: number;
  effectiveAPY: number;
  rank?: number;
  isAgent?: boolean;
}

interface ProtocolStats {
  totalStaked: string;
  rewardPool: string;
  runwayDays: string;
  totalStakers: number;
}

function shorten(addr: string) {
  return `${addr.slice(0,6)}...${addr.slice(-4)}`;
}

function formatNum(n: bigint, d = 2) {
  const v = Number(n) / 1e18;
  if (v >= 1e6) return (v/1e6).toFixed(1)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(1)+'K';
  return v.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function formatDate(ts: number) {
  if (!ts) return '—';
  return new Date(Number(ts)*1000).toLocaleDateString('en', { month:'short', day:'numeric' });
}

export default function LeaderboardPage() {
  const [stakers, setStakers] = useState<StakerInfo[]>([]);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getLogs',
          params: [{
            address: STAKING_ADDRESS,
            topics: ['0x4e7e50a09e9479816ef70cb1d2d6d0c780ef3b4c9f2b7d7c9f4b7e6a8f0c1d2'],
            fromBlock: '0x'+DEPLOY_BLOCK.toString(16),
            toBlock: 'latest'
          }]
        })
      });
      const data = await res.json();
      let addresses: string[] = [];
      if (data.result && Array.isArray(data.result)) {
        addresses = Array.from(new Set(data.result.map((log: any) => log.topics[1] ? '0x'+log.topics[1].slice(-40) : null).filter(Boolean)));
      }
      if (addresses.length === 0) addresses = [AGENT_ADDRESS];
      
      const [totalStaked, rewardPool, runway] = await Promise.all([
        fetch(RPC_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc:'2.0',id:1,method:'eth_call',params:[{to: STAKING_ADDRESS, data:'0xf8c4e957'},'latest'] }) }).then(r=>r.json()),
        fetch(RPC_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc:'2.0',id:2,method:'eth_call',params:[{to: STAKING_ADDRESS, data:'0x79c63c73'},'latest'] }) }).then(r=>r.json()),
        fetch(RPC_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jsonrpc:'2.0',id:3,method:'eth_call',params:[{to: STAKING_ADDRESS, data:'0x6ae3a3e2'},'latest'] }) }).then(r=>r.json()),
      ]);
      
      const totalStakedVal = totalStaked.result ? BigInt(totalStaked.result) : BigInt(0);
      const rewardPoolVal = rewardPool.result ? BigInt(rewardPool.result) : BigInt(0);
      const runwayVal = runway.result ? BigInt(runway.result) : BigInt(0);

      const userInfos = await Promise.all(addresses.map(async (addr) => {
        const dataHex = '0x9c2c6d5e'+addr.slice(2).padStart(64,'0');
        const r = await fetch(RPC_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:STAKING_ADDRESS,data:dataHex},'latest']})}).then(x=>x.json());
        if (!r.result || r.result === '0x') return null;
        const decoded = r.result.slice(2);
        const staked = BigInt('0x'+decoded.slice(0,64));
        const pending = BigInt('0x'+decoded.slice(64,128));
        const stakedAt = parseInt('0x'+decoded.slice(128,192), 16);
        const effectiveAPY = parseInt('0x'+decoded.slice(192,256), 16) / 100;
        if (staked === BigInt(0) && addr.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) return null;
        return { address: addr, staked, pending, stakedAt, effectiveAPY, isAgent: addr.toLowerCase() === AGENT_ADDRESS.toLowerCase() };
      }));

      let sorted = userInfos.filter(Boolean).sort((a,b) => {
        if (a!.isAgent && !b!.isAgent) return -1;
        if (!a!.isAgent && b!.isAgent) return 1;
        return Number(b!.staked - a!.staked);
      }) as StakerInfo[];

      sorted = sorted.map((s,i) => ({...s, rank: i+1}));
      const agentInList = sorted.findIndex(s => s.isAgent);
      if (agentInList === -1 && totalStakedVal > BigInt(0)) {
        sorted.push({ address: AGENT_ADDRESS, staked: BigInt(0), pending: BigInt(0), stakedAt: 0, effectiveAPY: 0, rank: sorted.length+1, isAgent: true });
      }

      setStakers(sorted);
      setStats({
        totalStaked: formatNum(totalStakedVal),
        rewardPool: formatNum(rewardPoolVal),
        runwayDays: runwayVal.toString(),
        totalStakers: sorted.length
      });
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: DS}} />
      <nav className="nav">
        <div className="nav-left">
          <a href="/" className="nav-logo">
            <div className="nav-icon">🦞</div>
            NexusClaw
          </a>
          <div className="nav-divider" />
          <div className="nav-links">
            <a href="/" className="nav-link">Stake</a>
            <a href="/leaderboard" className="nav-link active">Leaderboard</a>
            <a href="/analytics" className="nav-link">Analytics</a>
          </div>
        </div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={fetchLeaderboard} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </nav>

      <main className="page">
        <header className="header">
          <div className="header-top">
            <div className="badge">
              <span className="badge-dot" />
              Live On-Chain
            </div>
          </div>
          <h1 className="header-title">
            Leader<span>board</span>
          </h1>
          <p className="header-sub">
            Real-time ranking of all NexusClaw stakers. Data pulled directly from Base Mainnet — no intermediaries.
          </p>
        </header>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Staked</span>
              <span className="stat-value">{stats.totalStaked}</span>
              <span className="stat-sub">$NEXUSCLAW</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Reward Pool</span>
              <span className="stat-value teal">{stats.rewardPool}</span>
              <span className="stat-sub">$NEXUSCLAW</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Runway</span>
              <span className="stat-value gold">{stats.runwayDays}d</span>
              <span className="stat-sub">estimated</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Stakers</span>
              <span className="stat-value blue">{stats.totalStakers}</span>
              <span className="stat-sub">unique addresses</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
            Fetching on-chain data...
          </div>
        )}

        {error && (
          <div className="error">
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <div className="section-header">
            <span className="section-title">Top Stakers — {stakers.length} total</span>
          </div>
        )}

        {!loading && !error && stakers.length === 0 && (
          <div className="empty">No stakers found yet. Be the first to stake!</div>
        )}

        {!loading && !error && stakers.length > 0 && (
          <div className="leaderboard">
            <div className="leaderboard-header">
              <span>Rank</span>
              <span>Address</span>
              <span>Staked</span>
              <span>Pending</span>
              <span>Since</span>
            </div>
            {stakers.map((s) => (
              <div key={s.address} className={`leaderboard-row${s.isAgent ? ' agent' : ''}`}>
                <div className="rank">
                  {s.rank && s.rank <= 3
                    ? <span className={`rank-top rank-top-${s.rank}`}>{s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : '🥉'}</span>
                    : <span className="rank">{s.rank}</span>
                  }
                </div>
                <div className="address">
                  <div className="address-icon">🦞</div>
                  <span>{shorten(s.address)}</span>
                  {s.isAgent && <span className="agent-tag">⚡ AGENT</span>}
                </div>
                <div className="staked">
                  <span className="staked">{formatNum(s.staked)}</span>
                </div>
                <div className="pending">
                  <span className={`pending-value${Number(s.pending)/1e18 > 1 ? ' high' : ''}`}>{formatNum(s.pending, 4)}</span>
                </div>
                <div className="date">{formatDate(s.stakedAt)}</div>
              </div>
            ))}
          </div>
        )}

        {lastUpdated && (
          <div style={{marginTop:'20px', fontSize:'11px', color:'var(--t3)', fontFamily:'var(--mono)'}}>
            Last updated: {lastUpdated.toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit',second:'2-digit'})} UTC
          </div>
        )}
      </main>
    </>
  );
}
