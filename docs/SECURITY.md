# Security

## Smart Contract Security

### Protections in place

| Protection | Detail |
|---|---|
| **ReentrancyGuard** | All state-changing functions protected |
| **CEI pattern** | Checks-Effects-Interactions enforced throughout |
| **AccessControl** | `ADMIN_ROLE` and `FUNDER_ROLE` separation |
| **Emergency withdraw** | Users can always exit positions, even if staking is paused |
| **recoverToken()** | Admin can recover accidentally sent tokens (non-staking tokens only) |
| **Staking pause** | Emergency stop mechanism controlled by multisig |

### Governance

All admin functions are controlled by a **3-of-5 Safe Multisig** on Base Mainnet:
- Address: `0x02320eCCB3B67e802C29f9e9F8703D5756535515`
- No single point of failure — 3 signers required for any protocol change
- Timelock: 24h delay on critical operations

### Audit

Contract v10.3 has been reviewed internally. See `AUDIT_REPORT.md` for findings.

---

## Agent Security

### Design principles

- **Private key never leaves user machine** — the agent runs locally, not on any server
- **Dedicated wallet required** — users are explicitly instructed never to use their main wallet
- **No key transmission** — `setup.js` wizard never requests or handles the private key
- **Gas validation** — agent checks ETH balance before attempting transactions
- **Error limit** — agent stops automatically after `MAX_CONSECUTIVE_ERRORS` failures
- **Min ETH check** — prevents failed transactions from empty wallets

### What the agent does NOT do

- Does not send tokens to any address other than the staking contract
- Does not interact with any contract other than `NexusClawStaking` and `$NEXUSCLAW` token
- Does not transmit any data to external servers
- Does not store or log the private key

---

## Reporting Vulnerabilities

Open an issue on [GitHub](https://github.com/kashikai/nexusclaw) or contact us on [Telegram](https://t.me/nexusclaw).

For critical vulnerabilities, contact directly via Telegram before public disclosure.
