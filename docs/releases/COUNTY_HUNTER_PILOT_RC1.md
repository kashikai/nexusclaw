# County Hunter Pilot RC1

## Release identity

- Status: local release candidate only
- Branch: `release/county-hunter-production-pilot-prep`
- Previous base: `0b388668d02e`
- Push performed: no
- Pull request created: no
- Merge performed: no
- Deployment performed: no

## RC1 commits

| Commit | Change |
|---|---|
| `585c4785` | `security(county-hunter): migrate staging admin tooling to Supabase secret key` |
| `2da502aa` | `fix(county-hunter): make staging migrations replay safe` |
| `dfe21d2e` | `security(county-hunter): harden SIWE RPC boundary and grants` |
| `c7fa2880` | `fix(county-hunter): isolate SIWE rate limits by wallet` |
| `68be8a86` | `test(county-hunter): strengthen staging release validation` |
| `ea6f6e4b` | `chore(security): update runtime dependency audit policy` |

## Database artifacts

The release candidate contains the following County Hunter migrations:

- `202607230001_county_hunter_foundation.sql`
- `202607230002_county_hunter_rls.sql`
- `202607230003_county_hunter_seed_counties.sql`
- `202607230004_county_hunter_auth_hardening.sql`
- `202607230005_county_hunter_wallet_auth.sql`
- `20260726153642_county_hunter_gwinnett_discovery.sql`
- `20260726160827_county_hunter_gwinnett_discovery_rpc_fix.sql`
- `20260726174825_county_hunter_snapshot_replay.sql`
- `20260804181518_county_hunter_siwe_server_only_hardening.sql`

The replay-safety migration gate passed twice against staging before this local
packaging step. The SIWE hardening migration was applied and validated. No
database write, migration, fixture rotation, provisioning, or rollback was
performed while preparing this release candidate.

## Validation evidence

- Local tests: 166 passed; one live-source opt-in test skipped.
- TypeScript typecheck: passed.
- Lint: passed with the pre-existing documented warnings.
- Next.js 15.5.21 production build: passed with the pre-existing documented
  wallet-stack and lint warnings.
- RLS matrix: passed with tenant isolation for Viewer A, Manager A, Admin A,
  and Admin B.
- Cross-tenant SELECT, INSERT, UPDATE, and DELETE: denied as expected.
- SIWE: valid sign-in, invalid signature, expired challenge, incorrect chain,
  incorrect origin, single consumption, replay denial, refresh, and logout
  passed.
- SIWE privileged RPC boundary: direct `PUBLIC`, `anon`, and `authenticated`
  execution denied; server-only execution path passed.
- Gwinnett Discovery: passed; repeated execution remained idempotent.
- Snapshot replay: passed and remained tenant-scoped.
- Runtime administrative key selection: `SUPABASE_SECRET_KEY`.
- Legacy fallback used: false.
- Staging commercial data remained preserved.

## Dependency security gate

- `npm audit --omit=dev --audit-level=high`: passed.
- Critical advisories: 0.
- High advisories: 0.
- Moderate package-level findings: 9.
- The nine moderate findings are the documented UUID advisory propagated by
  the approved Wagmi/MetaMask connector tree. The vulnerable UUID buffer API is
  not directly called by NexusClaw, and the npm-proposed fix requires a breaking
  Wagmi 3 migration. The accepted pilot risk and required follow-up are recorded
  in `docs/security/PHASE2_PRODUCTION_GATE.md`.

## Rollback and production boundary

- The Phase 2 rollback artifact remains
  `supabase/rollback/county_hunter_phase2.sql`.
- The validated rollback procedure and recovery order remain documented in the
  production gate and pilot runbook.
- `COUNTY_HUNTER_ENABLED=false` remains required for production.
- `COUNTY_HUNTER_DISCOVERY_ENABLED=false` remains required for production.
- `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=false` remains required for production.
- No production confirmation was activated.
- Legacy Supabase API Keys remain active pending a separately authorized panel
  change; this RC does not use the legacy fallback.
- No credential, tenant identifier, wallet address, private key, token, cookie,
  project reference, database URL, or connection string is recorded here.
- This document does not authorize push, pull request, merge, deployment, or
  production enablement.
