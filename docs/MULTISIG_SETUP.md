# NexusClaw Multisig 3/5 Setup Guide

**Status**: ⏳ PENDING SAFE DEPLOYMENT
**Timeline**: Parallel to 48h Sepolia monitoring
**Deadline**: Before mainnet role transfer
**Platform**: Safe (Gnosis Safe) on Base Sepolia → Base Mainnet

---

## Phase 1 — Deploy Safe on Base Sepolia (Test)

### Step 1: Create Safe Wallet
1. Go to: https://app.safe.global
2. Click "Create new Safe"
3. Select network: **Base Sepolia** (chainId: 84532)
4. Choose: **3/5 Multisig** (3 confirmations required out of 5 owners)

### Step 2: Add 5 Signers

| # | Role | Address | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Lead Signer (Tiago) | 0xB09736A4eB00bBF0F9ee5F18e4A075621220E572 | ✅ Required | Primary signer |
| 2 | Backup Signer (Tiago) | 0x2bf47bc64039D78d0487F309f3b3fC850F093a3E | ✅ Required | Secondary signer |
| 3 | Agent Signer (Hanna) | TBA | ⏳ PENDING | Agent operations |
| 4 | Security Signer | TBA | ⏳ PENDING | Hardware wallet recommended |
| 5 | Redundancy Signer | TBA | ⏳ PENDING | Trusted party / second agent |

### Step 3: Fund Safe for Testing
Send ~0.5 ETH (Sepolia) to the Safe address for gas during testing.

### Step 4: Record Safe Address
```
Safe Address (Sepolia): [DEPLOYED_ADDRESS]
Safe Address (Mainnet): [TBA - deploy after Sepolia confirmed]
Threshold: 3/5
Signer Count: 5
```

---

## Phase 2 — Test Multisig on Sepolia

### Test 1: Administrative Timelock (Planned)
```
⏳ Design administrative timelock for privileged operations
⏳ Implement queue + execute flow
⏳ Require 3/5 signers to approve execution
⏳ Verify delayed execution on-chain before marking operational
```

### Test 2: Whitelist DEX Pair
```
✅ One signer queues: queueSetDexWhitelist(UNISWAP_PAIR, true)
✅ 3/5 signers approve execution
✅ Execute: executeSetDexWhitelist(UNISWAP_PAIR, true)
✅ Verify dexWhitelist mapping updated on-chain
```

### Test 3: Treasury Withdraw
```
✅ One signer calls: treasuryWithdraw(RECIPIENT, 100_000_000 * 10^18)
✅ 3/5 signers approve transaction
✅ Verify 100B tokens moved to recipient
```

### Test 4: Verify on Basescan
```
https://sepolia.basescan.org/address/0xb7Df4A46455594923150628cEA54f0a173f1b68a#readProxyContract

Check:
- DEFAULT_ADMIN_ROLE holder: SAFE_ADDRESS
- TREASURY_ROLE holder: SAFE_ADDRESS
- burnFeeEnabled: false (after administrative control test)
- dexWhitelist[UNISWAP]: true (after DEX test)
```

---

## Phase 3 — Transfer Roles to Multisig (Sepolia)

**Prerequisites:**
- ✅ Safe deployed on Base Sepolia
- ✅ All 5 signers confirmed
- ✅ Safe funded for gas
- ✅ Multisig tests passed

### Step 1: Grant DEFAULT_ADMIN_ROLE to Multisig

**Using cast (installed locally):**
```bash
export SEPOLIA_RPC="https://sepolia.base.org"
export CONTRACT="0xb7Df4A46455594923150628cEA54f0a173f1b68a"
export MULTISIG="[SAFE_ADDRESS_FROM_STEP_1]"
export DEPLOYER_KEY="[YOUR_TESTNET_PK]"

# DEFAULT_ADMIN_ROLE = 0x0000...0000 (32 zero bytes)
cast send $CONTRACT "grantRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $MULTISIG \
  --rpc-url $SEPOLIA_RPC \
  --private-key $DEPLOYER_KEY \
  --gas-limit 100000
```

### Step 2: Grant TREASURY_ROLE to Multisig

```bash
# TREASURY_ROLE = keccak256("TREASURY_ROLE")
# = 0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9

cast send $CONTRACT "grantRole(bytes32,address)" \
  0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9 \
  $MULTISIG \
  --rpc-url $SEPOLIA_RPC \
  --private-key $DEPLOYER_KEY \
  --gas-limit 100000
```

### Step 3: Revoke Deployer Roles (Clean Up)

```bash
# Revoke DEFAULT_ADMIN_ROLE from deployer
cast send $CONTRACT "revokeRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  0xB09736A4eB00bBF0F9ee5F18e4A075621220E572 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $DEPLOYER_KEY \
  --gas-limit 100000

# Revoke TREASURY_ROLE from deployer (if granted initially)
cast send $CONTRACT "revokeRole(bytes32,address)" \
  0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9 \
  0xB09736A4eB00bBF0F9ee5F18e4A075621220E572 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $DEPLOYER_KEY \
  --gas-limit 100000
```

### Step 4: Verify Role Transfer on Basescan

```
https://sepolia.basescan.org/address/0xb7Df4A46455594923150628cEA54f0a173f1b68a#readProxyContract

hasRole(0x0000...0000, MULTISIG) → should be TRUE
hasRole(0x0000...0000, 0xB097...) → should be FALSE

hasRole(0xe1dc...dca9, MULTISIG) → should be TRUE
hasRole(0xe1dc...dca9, 0xB097...) → should be FALSE
```

---

## Phase 4 — Disable Minting (One-Way, Permanent)

**After roles transferred to multisig, call disableMinting():**

1. One multisig signer opens Safe UI
2. Navigate to Transactions > "New transaction"
3. Select contract: 0xb7Df4A46455594923150628cEA54f0a173f1b68a
4. Function: `disableMinting()`
5. Submit transaction for approval
6. **3/5 signers must approve**
7. Execute (one-way, permanent)

**Verify on Basescan:**
```
mintingDisabled() → should return TRUE
```

---

## Phase 5 — Deploy Safe on Base Mainnet (Post-Sepolia Confirmed)

**Only after:**
- ✅ 48h Sepolia monitoring clean
- ✅ All multisig tests passed
- ✅ All 5 signers confirmed
- ✅ Deployer roles revoked on Sepolia

**Repeat Phase 1-4 on Base Mainnet (production):**
1. Deploy Safe on Base mainnet (chainId: 8453)
2. Same 5 signers, same 3/5 threshold
3. Transfer roles on mainnet contract
4. Call disableMinting() on mainnet

---

## Checklist (Sepolia → Mainnet)

### Sepolia Testing (48h Window)
- [ ] Safe deployed on Sepolia (record address)
- [ ] 5 signers added + confirmed
- [ ] Multisig funded for gas (0.5 ETH)
- [ ] Test 1: Administrative timelock queue/execute
- [ ] Test 2: DEX whitelist ✅
- [ ] Test 3: Treasury withdraw ✅
- [ ] Test 4: Basescan verification ✅
- [ ] Roles transferred to multisig
- [ ] Deployer roles revoked
- [ ] disableMinting() called (permanent)
- [ ] Final Basescan check: deployer = zero roles ✅

### Mainnet Deployment (Post-48h Monitoring)
- [ ] 48h Sepolia monitoring confirmed clean
- [ ] All 5 signers re-confirmed for mainnet
- [ ] Safe deployed on Base mainnet
- [ ] Mainnet contract deployed (0x...)
- [ ] Roles transferred to mainnet multisig
- [ ] Deployer roles revoked on mainnet
- [ ] disableMinting() called on mainnet
- [ ] Mainnet Basescan verification ✅
- [ ] Ready for launch (trading + DEX listing)

---

## Support

For issues:
- Safe UI documentation: https://help.safe.global
- Cast reference: https://book.getfoundry.sh/cast/
- NexusClaw contract: 0xb7Df4A46455594923150628cEA54f0a173f1b68a (Sepolia)

Report progress to: Tiago (lead) + Hanna 🦞 (monitoring)

---

**Status**: ⏳ Ready for TU execution
**Version**: 1.0
**Date**: 2026-03-27
**Timeline**: Parallel to 48h monitoring
