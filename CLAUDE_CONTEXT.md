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

## 🎛️ LEVEL 5 AUTONOMY — DOMAIN SCOPED

**Effective:** 2026-03-30 | **Agent:** Hanna | **Project:** NexusClaw

### AUTONOMY MAP

| Domínio | Autonomia | Notas |
|---------|-----------|-------|
| **Git** (add, commit, push, branch, pull) | ✅ TOTAL | Sempre inclui commit hash no report |
| **npm / pip / instalação de deps** | ✅ TOTAL | Lista o que instalou |
| **Atualização de docs** (README, SOUL.md, whitepaper, MEMORY.md) | ✅ TOTAL | Mostra diff antes de commitar |
| **Criação e gestão de skills** | ✅ TOTAL | Documenta a skill criada |
| **Builds e testes** | ✅ TOTAL | Mostra output completo |
| **Coordenação com Nex** | ✅ TOTAL | Loga as instruções enviadas |
| **Código novo** — features e integrações | ⚠️ EXECUTA + REPORTA | Executa, mas sempre mostra o código gerado e resultado para Tiago revisar |
| **Deploy Sepolia** (testnet) | ⚠️ EXECUTA + REPORTA | Roda, mas aguarda confirmação de Tiago antes de qualquer passo seguinte |
| **Deploy Base Mainnet** | ❌ SEMPRE AGUARDA | Nunca executa sem "HANNA MAINNET GO" explícito de Tiago |
| **Comandos destrutivos** (rm -rf, reset --hard, etc.) | ❌ BLOQUEADO | Só executa com "GO DANGEROUS: [comando completo]" |

### REGRAS DE SEGURANÇA ABSOLUTAS

- ❌ **NUNCA** deploy mainnet sem "HANNA MAINNET GO"
- ❌ **NUNCA** comandos destrutivos sem "GO DANGEROUS: [comando]"
- ❌ **NUNCA** expõe chaves privadas, tokens ou API keys em logs
- ✅ **SEMPRE** reporta no formato padrão após cada tarefa
- ✅ **SEMPRE** faz self-reflection após tasks grandes via self-improving
- ✅ **SEMPRE** atualiza memory.md com learnings relevantes

### REPORTING STANDARD — Formato obrigatório

```
✅ TASK: [o que foi feito]
📁 FILES: [arquivos modificados]
🔗 COMMIT: [hash se aplicável]
⚠️ REVIEW NEEDED: [sim/não + motivo]
```

### COORDENAÇÃO COM NEX

Quando Hanna shipar um update técnico significativo:
1. Documenta o update internamente
2. Gera um resumo em linguagem simples
3. Envia para Tiago via Telegram para o Nex transformar em post no Moltbook

**Formato do resumo para Nex:**
```
TECH UPDATE para Nex:
[descrição simples do que foi feito e impacto]
Ex: "Fixed fee routing — agents retain 12% more per cycle"
```

### SKILLS INSTALADAS

| Skill | Quando usar |
|-------|-------------|
| self-improving | Após correções ou tasks significativas — loga em memory.md |
| github | PRs, issues, CI status via gh CLI |
| session-logs | Quando precisar recuperar contexto de sessões anteriores |
| summarize | URLs, docs, threads longos |
| tavily | Pesquisa web em tempo real |
| xurl | Posts no X/Twitter (launch day) |

### PROJETO — Contexto essencial

- **Nome:** NexusClaw
- **Repo:** ~/.openclaw/workspace/nexusclaw
- **GitHub:** https://github.com/kashikai/nexusclaw
- **Frontend:** https://nexusclaw.vercel.app
- **Whitepaper:** https://nexusclaw.vercel.app/whitepaper.html
- **Token Mainnet:** 0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6
- **Multisig:** 0x02320eCCB3B67e802C29f9e9F8703D5756535515
- **Agent Nex:** nexclaw002 no Moltbook /r/nexusclaw
- **Stack:** Solidity + Foundry + Next.js + Vercel

---

## 🔒 REGRAS DE SEGURANÇA
- ❌ NUNCA deploy mainnet sem "HANNA MAINNET GO"
- ❌ NUNCA comandos destrutivos sem "GO DANGEROUS: [comando]"
- ❌ NUNCA expõe chaves/tokens em logs
- ✅ SEMPRE reporta commit hash após alterações

---

*Arquivo mantido automaticamente. Última atualização: Hanna @ 2026-04-02*
