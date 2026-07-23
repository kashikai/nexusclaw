# County Hunter — Phase 1.3A preservation and staging handoff

## Decision

Phase 1.3A creates a local, reviewable preservation checkpoint. It does not
deploy, push, open a pull request, merge, activate production, or authorize
Phase 2.

```text
NO-GO FOR PHASE 2
```

The working branch is `feature/county-hunter-phase-1`; its original base remains
identifiable as `d3996936`.

## Global-file audit

| File | Why it changed and whether it is required | Existing behavior and scope |
|---|---|---|
| `frontend/package.json` | Adds Supabase SSR/client dependencies used by isolated County Hunter authentication and adds deterministic test, typecheck, and lint tooling. | No existing script or dependency was removed. Direct Next, Wagmi, Viem, RainbowKit and wallet-provider versions are unchanged. |
| `frontend/package-lock.json` | Reproducibly locks the reviewed Supabase and gate-tooling additions. It adds 353 package paths, deduplicates 3 paths, and re-resolves 26 existing compatible transitive versions. | Direct framework/wallet versions are unchanged. Some nested wallet-graph utilities changed resolution, so full wallet regression remains mandatory. Reducing the lockfile manually is unsafe; dependency cleanup belongs in the dedicated remediation branch. |
| `frontend/.env.example` | Documents disabled-by-default feature flags and the public/server/local staging variables required by County Hunter. | It does not activate behavior or contain a local credential. Existing WalletConnect configuration is untouched. |
| `frontend/.gitignore` | This path does not exist in the base or working tree. The repository-level `.gitignore` is the effective file and now ignores `**/.env.local` and `**/.env.staging.local`. | No existing ignore rule was removed. |
| `frontend/middleware.ts` | Adds the server kill switch, Supabase session refresh, and private no-store policy required for County Hunter authentication. | Its matcher is limited to `/county-hunter/:path*` and `/api/county-hunter/:path*`; it does not run for agents, staking, wallet pages, or other existing routes. |
| `frontend/.eslintrc.json` | Makes the required lint gate deterministic. It preserves two legacy rule exceptions while enforcing both rules as errors inside County Hunter. | It changes static analysis only, not runtime behavior. The exceptions can be narrowed after legacy lint cleanup, outside this preservation checkpoint. |
| `frontend/components/layout/TopNav.tsx` | Adds the discoverability entry requested for the separate County Hunter area. | The diff is three added lines: one public feature flag and one conditional item. No existing navigation entry or wallet behavior is removed or changed. |

No file changed under `contracts/`, `agents/`, or the existing staking
implementation.

## Environment-history audit

Metadata-only Git inspection shows that `frontend/.env.local` was added by
commit `3814a7934b2ac926ae80a99ae27a5b5781aa1405` on 2026-06-18. It is present in
the base, remains known to the index, is absent from the working tree, and its
removal is part of this checkpoint.

No historical value was printed, read, or restored. The replacement
`frontend/.env.example` documents the required variable names without local
secrets. Rotation and coordinated history-remediation requirements are recorded
in `docs/security/ENV_HISTORY_REMEDIATION.md`.

## Secret scan

No dedicated secret scanner was installed, so a local pattern scan covered all
79 changed or untracked files. It checked sensitive assignments, credentialed
PostgreSQL URLs, service-role/private-key/mnemonic/seed names, JWT-like values,
`sk_` token forms, and PEM/hex private keys.

Result: zero suspected real secrets. Empty examples were not treated as
credentials.

## Local gates

| Gate | Result |
|---|---|
| `npm ci` | PASS; exit 0; lockfile SHA-256 remained `F2BFF12F115F3DD983CBA0059F673DDEBCF7989DAF9527C057F178A59A5C5FBC` |
| `npm test` | PASS; 50 tests in 8 files |
| `npm run typecheck` | PASS; 0 errors |
| `npm run lint` | PASS; 0 errors and 6 existing warnings outside County Hunter changes |
| `npm run build` | PASS; County Hunter pages and APIs emitted as dynamic routes |
| Build warnings | Existing lint warnings plus Supabase 0.7.0 Edge Runtime compatibility warnings; no build error |
| `npm audit --omit=dev` | FAIL/BLOCKING; 27 findings: 4 critical, 4 high, 15 moderate, 4 low |
| Staging preflight without local config | FAIL CLOSED; `STAGING CONFIGURATION INCOMPLETE` with variable names only |
| Staging preflight with synthetic valid-format config | PASS; `READY FOR STAGING VALIDATION`; no connectivity requested |

The normal install also reports 37 findings when development dependencies are
included. No audit fix, dependency override, framework upgrade, or wallet-stack
upgrade was attempted.

## Staging and dependency handoff

The secret-free staging checklist is
`docs/county-hunter/STAGING_SETUP_CHECKLIST.md`. The default preflight is
non-destructive and performs no connectivity check:

```powershell
.\scripts\validate-county-hunter-staging.ps1 -PreflightOnly
```

Connectivity is read-only and opt-in with `-PreflightOnly -TestConnectivity`.
Migrations and provisioning remain separate, explicit later steps.

The future dependency branch is documented but not created:

```text
security/upgrade-next-wallet-stack
```

It must cover Next.js, Wagmi, Viem, RainbowKit, Coinbase providers, PostCSS,
wallet and SIWE regression, SSR, build, contracts, staking, and the complete
existing application before release.
