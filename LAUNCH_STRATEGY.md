# 🚀 NexusClaw Base Mainnet Launch Strategy (Final)

## Security Features (v2 Roadmap)

### Timelock + Anti-Snipe
```solidity
// Adicionar ao NexusClaw.sol futuramente
uint256 public constant TIMELOCK_DELAY = 24 hours;
mapping(bytes32 => uint256) public timelockQueue;

// Whitelist DEX pairs (pular burn fee)
mapping(address => bool) public whitelistedPairs;

// Max buy limit nas primeiras 24h
uint256 public constant MAX_BUY_PERCENT_LAUNCH = 50; // 0.5% do supply
uint256 public launchTime;
```

### On-Chain Monitoring
- **Tenderly Alerts**: Real-time price/volume anomalies
- **MEV Protection**: Flashbots Protect via RPC
- **Slippage Guards**: Max 5% slippage padrão

---

## 🎯 FASE 1 — Deploy (Dia 1)

**Tasks:**
- [ ] Deploy Base Mainnet (forge create)
- [ ] Verificar Basescan source code
- [ ] Testes on-chain: transfer, burn, mint
- [ ] Transferir DEFAULT_ADMIN_ROLE → multisig (Gnosis Safe 3/5)
- [ ] Revogar MINTER_ROLE do deployer wallet
- [ ] Monitoramento 12-24h (nenhuma anomalia)

**Security Checklist:**
- ✅ Contract verified
- ✅ Admin functions locked to multisig
- ✅ No single points of failure
- ✅ Tenderly alerts ON

---

## 💧 FASE 2 — Liquidez (Dia 2-3)

**Allocation:**
```
Total Supply: 100B $NEXUSCLAW

Distribution:
- 8B → Uniswap V3 pool (NEXUSCLAW/ETH 0.3%)
- 5B → Airdrop snapshot (Clawnch migrants)
- 5B → Insurance fund (separado, multisig)
- 77B → Treasury multisig (controlado)
- 5B → Already burned (fee capture)
```

**Tasks:**
- [ ] `treasuryWithdraw(8B)` → Uniswap deployment
- [ ] LP tokens locked 6+ meses (no rug pull)
- [ ] Snapshot block height confirmado
- [ ] `treasuryWithdraw(5B)` airdrop distribuição
- [ ] Verify 80B+ sob multisig control

**Launch Price Estimate:**
- Base: ~$0.08 / token (extrapolated from Clawnch ATH)
- Market cap soft: $8B (conservative)
- TV liquidity: $0.6M initial pool

---

## 🔒 FASE 3 — Segurança (Dia 3-7)

**Operational Security:**
- [ ] Multisig 3/5 operacional (all signers online)
- [ ] Insurance fund 5B em separate wallet
- [ ] DEX pair whitelist aktiv (skip burn fee):
  - Uniswap V3 NEXUSCLAW/ETH (0.3%)
  - Uniswap V3 NEXUSCLAW/USDC (0.05%)
- [ ] Tenderly rules:
  - Price spike >20% → alert
  - Volume spike >5x → alert
  - Large withdrawal >1B → alert
- [ ] Time-lock v2 implementado (future upgrade)

**Gas Optimization:**
- Transfer 1% burn fee optimized (Solidity v0.8.24)
- ~60k gas per transfer (vs. 21k base)

---

## 📢 FASE 4 — Divulgação (Dia 7+)

### X/Twitter Devlog Post (Epic)
```
🦞 NexusClaw Base Mainnet LIVE!

Contract: 0x[ADDRESS]
Explorer: https://basescan.org/address/0x[ADDRESS]

100B $NEXUSCLAW minted
Verified ✅ | Multisig 3/5 ✅ | Insurance 5B ✅

Uniswap V3: [POOL_LINK]
Airdrop: Clawnch migrants eligible

Built for agents. Global scale. No BS.

Repo: https://github.com/kashikai/nexusclaw
#NexusClaw #DeFi #MultiChain #BaseMainnet
```

### Marketing
- [ ] Discord/Telegram announcement
- [ ] CoinGecko listing request (with contract)
- [ ] DexTools featured listing
- [ ] Bankr / Giza / Aave integrations (inbound)
- [ ] Dev blog: "Why NexusClaw > Clawnch"

### README Update
- [ ] Add mainnet address
- [ ] Mainnet liquidity links
- [ ] Insurance fund transparency
- [ ] Multisig details (members + timelock)

---

## 📊 KPIs to Monitor (Weekly)

| Metric | Target | Alert |
|--------|--------|-------|
| Market Cap | >$1B (30d) | <$100M |
| Liquidity | >$5M (30d) | <$1M |
| Holders | >10k (30d) | <1k |
| Burn Rate | >1% (weekly) | <0.1% |
| Exploit Attempts | 0 | Any |

---

## 🚨 Emergency Procedures

**If exploit detected:**
1. Pause transfers (multisig vote 24h timelock)
2. Drain insurance 5B to affected accounts
3. Post-mortem analysis (open-source)
4. Compensation + vested recovery plan

**If price crash >50%:**
1. Buy pressure via treasury (if approved)
2. Staking rewards boost
3. Marketing blitz + partnerships

---

## Timeline Summary
```
Day 1: Deploy + Verification
Day 2: Liquidity + Airdrop
Day 3-7: Security + Monitoring
Day 7+: Marketing + Listings
Day 30: Mainnet stable, plan Phase 2 (Solana bridge)
```

---

**Status**: Strategy Locked In 🔐
**Last Updated**: 2026-03-26
**Approvals**: Tiago + Hanna 🦞
