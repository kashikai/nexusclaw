# Estratégia Oficial de Launch – NexusClaw

## FASE 1 – Deploy Seguro (Dia 1)

- Deploy do contrato na Base Mainnet (100B supply total)
- Verificação completa no Basescan
- Testes on-chain (mint, burn, transfer, fee-on-transfer)
- Ativação via função launch() (se existir) ou liberação de transfers
- Transferência de DEFAULT_ADMIN_ROLE e MINTER_ROLE para multisig 3/5
- Revogação completa de roles do deployer
- Burn fee de 1% ativado desde o deploy
- Monitoramento intensivo por 12–24h

## FASE 2 – Liquidez Inicial (Dia 2–3)

- treasuryWithdraw de 8B → criação de pool Uniswap V3 (NEXUSCLAW/ETH)
- Lock dos LP tokens por mínimo 6 meses
- treasuryWithdraw de 5B → airdrop para early adopters e migrados do Clawnch
- ~77B restantes sob controle do multisig
- Anti-snipe ativo (limite máximo de compra de 0.5% do supply nas primeiras 24h)

## FASE 3 – Segurança e Proteção (Dia 3–7)

- Multisig 3/5 totalmente operacional
- Time-lock de 24h em todas operações críticas (v2 do contrato)
- Insurance fund de 5B separado para proteção contra exploits
- Whitelist inicial de pares DEX
- Tenderly alerts + monitoramento on-chain contínuo

## FASE 4 – Divulgação e Crescimento (Dia 7+)

- Post épico no X (@nexusclawbot) + anúncio no Telegram
- Atualização completa do README com endereço mainnet e links
- Pedidos de listing no CoinGecko, DexTools e CoinMarketCap
- Início do Agent Marketplace PoC

---

**Status**: Official Strategy Locked 🔐
**Version**: 1.0
**Date**: 2026-03-26
**Approved**: Tiago + Hanna 🦞
