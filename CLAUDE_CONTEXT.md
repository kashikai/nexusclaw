# 🦞 CLAUDE_CONTEXT.md — NexusClaw Project State

**Last Updated:** 2026-04-01 09:19 JST  
**Agent:** Hanna (Level 5 Autonomy)  
**Human:** Tiago (Asia/Tokyo)

---

## 📋 CONTRATOS

| Contrato | Rede | Endereço | Status |
|----------|------|----------|--------|
| **NexusClaw Token** | Base Mainnet (8453) | `0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6` | ✅ LIVE |
| **NexusClaw Token** | Base Sepolia (84532) | `0xb7Df4A46455594923150628cEA54f0a173f1b68a` | ✅ Test |
| **NexusClawStaking v10.1** | Base Sepolia | `0xa5c3770F632F08008dfE3C6F0610DB0C877D555B` | ✅ Deployed 01/04 |
| **NexusClawStaking** | Base Mainnet | — | ⏳ PENDING |

**Multisig Treasury:** `0x02320eCCB3B67e802C29f9e9F8703D5756535515` (3/5)

---

## 🌐 FRONTEND & INFRA

| Componente | URL | Status |
|------------|-----|--------|
| Web App | https://nexusclaw.vercel.app | ✅ Live |
| Whitepaper | https://nexusclaw.vercel.app/whitepaper.html | ✅ Live |
| Basescan Mainnet | https://basescan.org/token/0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6 | ✅ Verified |
| GitHub | https://github.com/kashikai/nexusclaw | ✅ Active |

---

## 🤖 AGENTES

| Agente | Plataforma | Handle | Status |
|--------|-----------|--------|--------|
| **Hanna** | OpenClaw | — | 🦞 Level 5 Autonomy |
| **Nex** | Moltbook | @nexclaw002 | 🦞⚡📡 Pipeline v3.0 |

**Daily Report:** 9:00 JST → Telegram (automated) ✅

---

## 📦 PENDÊNCIAS

### HIGH PRIORITY
- [ ] Deploy NexusClawStaking v10.1 → Base Mainnet (aguardando "HANNA MAINNET GO")
- [ ] Fund reward pool em Sepolia para testes
- [ ] Testar stake/unstake/claim na Sepolia v10.1
- [ ] Atualizar frontend com novo contrato staking

### MEDIUM PRIORITY  
- [ ] Subir liquidity pool em Mainnet (Uniswap V3)
- [ ] Ativar marketing e airdrop de tokens
- [ ] Expandir para outras chains (Solana, Arbitrum)

---

## 🔄 HISTÓRICO RECENTE

| Data | Commit | Descrição |
|------|--------|-----------|
| 2026-04-01 | `2ed03d7` | NexusClawStaking v10.1 — pool health, max stake, totalStakers |
| 2026-03-30 | `3185be1` | Staking v1.0 (obsoleto após v10.1) |
| 2026-03-30 | `529f1a3` | Daily Report System — 9:00 JST automation |
| 2026-03-25 | — | Frontend Next.js + Wagmi deployed to Vercel |

---

## ⚙️ CONFIGURAÇÕES

### Tokenomics
- Supply Total: 100B NEXUSCLAW
- APY Staking: 20% (bootstrap phase)
- Max Stake: 10M tokens (0.01% supply)
- Pool Alert Threshold: 50K tokens

### Autonomy Levels
- **Hanna:** L5 (Git total, npm total, docs total, skills total, builds total, Sepolia deploy exec+report, Mainnet blocked)
- **Nex:** L4 (coordenação via Moltbook, pipeline público)

---

## 🔒 REGRAS DE SEGURANÇA
- ❌ NUNCA deploy mainnet sem "HANNA MAINNET GO"
- ❌ NUNCA comandos destrutivos sem "GO DANGEROUS: [comando]"
- ❌ NUNCA expõe chaves/tokens em logs
- ✅ SEMPRE reporta commit hash após alterações

---

*Arquivo mantido automaticamente. Última atualização: Hanna @ 2026-04-01*
