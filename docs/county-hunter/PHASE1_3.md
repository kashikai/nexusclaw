# County Hunter — Phase 1.3 clean environment and real staging validation

## Executive status

Work moved to the clean local clone `C:\dev\nexusclaw` on branch
`feature/county-hunter-phase-1`, based on `d3996936`. Only the reviewed County
Hunter files were transferred. `node_modules`, `.next`, environment files,
credentials, logs, caches and Google Drive backup directories were not copied.

The clean local `npm ci` passed, including the unchanged
`postinstall: npm dedupe`. Cache/session hardening and local tests pass. Real
staging is blocked because no dedicated Supabase URL, publishable key, service
role, database URL or auth origin is configured locally. No production endpoint
was contacted.

Decision remains:

```text
NO-GO FOR PHASE 2
```

## Required staging environment checklist

Create `C:\dev\nexusclaw\.env.staging.local` locally only. The Git ignore rule
already covers this exact path. Do not send these values through chat and do not
copy a production environment.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
COUNTY_HUNTER_STAGING_DB_URL=
COUNTY_HUNTER_AUTH_ORIGIN=
COUNTY_HUNTER_ENABLED=true
NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=true
```

The local runners additionally require non-secret/safety identifiers:

```dotenv
COUNTY_HUNTER_STAGING_CONFIRM=STAGING_ONLY
COUNTY_HUNTER_STAGING_PROJECT_REF=
COUNTY_HUNTER_TEST_ORG_A=
COUNTY_HUNTER_TEST_ORG_B=
```

The provisioning script generates four disposable wallet private keys and stores
them only in this ignored file. It never prints them. Generated wallet addresses
and Supabase user UUIDs are non-secret and are also saved locally for the SQL and
browser matrix.

`SUPABASE_SERVICE_ROLE_KEY` is read only by
`frontend/scripts/provision-county-hunter-staging.mjs`. Deployed pages, API
routes, middleware and runtime server modules do not reference it.

## Required Supabase dashboard checks

These checks are **UNVERIFIED** until a dedicated project is available:

- project is staging-only and its exact 20-character ref matches both API and DB;
- Ethereum Web3 Auth is enabled;
- exact HTTPS `COUNTY_HUNTER_AUTH_ORIGIN` is registered in Redirect URLs;
- localhost is registered only for the bounded local E2E run;
- Web3 Auth rate limits are configured;
- CAPTCHA is configured before public exposure;
- JWT expiry/signing settings are recorded;
- none of the County Hunter migrations has been applied to production.

## Supabase SSR and cache decision

Installed versions after the clean install:

- `@supabase/ssr@0.7.0`;
- `@supabase/supabase-js@2.58.0`.

`@supabase/ssr` started forwarding the required refresh cache headers to
`setAll` only in 0.10.0. Phase 1.3 intentionally uses the older-package fallback
instead of mixing a library upgrade into this branch:

```http
Cache-Control: private, no-store
Pragma: no-cache
Expires: 0
```

The complete policy is applied by County Hunter middleware, login, session
refresh, logout, cookie mutation and error responses. The County Hunter layout
and all County Hunter API routes are `force-dynamic`; positive ISR revalidation
is forbidden by tests. Auth responses return only booleans or the public SIWE
challenge. They do not serialize access tokens, refresh tokens, cookies or the
service-role key.

## Runtime service-role removal

The nonce table keeps forced RLS and no table grants to `anon` or
`authenticated`. Runtime challenge access now uses two narrow functions:

- `county_hunter_issue_auth_challenge(...)`: anonymous execute only, database-time
  window validation, five challenges per wallet per five minutes, advisory-lock
  serialization and one-hour expired-hash cleanup;
- `county_hunter_consume_auth_challenge(...)`: anonymous execute only, exact
  ID/hash/wallet/domain/URI/chain matching and atomic delete of an unexpired row.

Both are `SECURITY DEFINER` with `search_path = pg_catalog, public`. They return
no challenge row, nonce, cookie, token or service credential.

## Disposable staging wallets

The provisioner now authenticates four real, randomly generated Web3 wallets
through Supabase `signInWithWeb3`, then uses the local administrative client only
to set trusted `app_metadata.organization_id` and persist memberships:

| Wallet | Organization | Membership permissions |
|---|---|---|
| viewer A | A | `county_hunter.view` |
| manager A | A | `county_hunter.view`, `county_hunter.manage` |
| admin A | A | `county_hunter.view`, `county_hunter.manage`, `county_hunter.admin` |
| admin B | B | `county_hunter.view`, `county_hunter.manage`, `county_hunter.admin` |

Email/password placeholder users are no longer created. The test wallets have no
funds and must never be reused outside the dedicated staging project.

## Validation status

| Gate | Result |
|---|---|
| Clone outside Google Drive | PASS — `C:\dev\nexusclaw` |
| Protected scope (`contracts/`, `agents/`, `staking/`) | PASS — no changes |
| `npm cache verify` | PASS |
| Normal `npm ci` | PASS twice — second run exit 0; lockfile SHA-256 unchanged before/after dedupe |
| Supabase versions | PASS — SSR 0.7.0, JS 2.58.0 |
| Cache policy regression tests | PASS |
| SIWE nonce matrix offline | PASS — valid once, replay, expiry, wallet, domain, URI, chain and signature |
| `npm test` | PASS — 50 tests in 8 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 6 pre-existing warnings outside County Hunter; 0 errors |
| Enabled `npm run build` | PASS — all County Hunter pages/APIs emitted as dynamic routes |
| Staging preflight | FAIL CLOSED — `COUNTY_HUNTER_STAGING_DB_URL is required.` |
| Migrations applied to staging | NOT RUN |
| Real RLS / `6 → 0` bootstrap | NOT RUN |
| Real browser SIWE / refresh / logout | NOT RUN |
| Active-session membership revocation | NOT RUN |
| Real cross-tenant role matrix | NOT RUN |
| `npm audit --omit=dev` and JSON form | FAIL — 27 total: 4 critical, 4 high, 15 moderate, 4 low |
| Local commit | NOT CREATED — real staging and audit gates are incomplete |

## Required execution order once local credentials exist

1. Confirm the dashboard checklist and keep both production flags false.
2. Run `scripts\validate-county-hunter-staging.ps1 -MigrationsOnly`; it verifies
   the exact project ref and applies every migration chronologically without
   requiring fixture IDs.
3. Run `frontend\scripts\provision-county-hunter-staging.mjs` after Web3 Auth and
   migrations are ready; it creates/reuses the four ignored disposable keys,
   wallet identities and memberships.
4. Run `scripts\validate-county-hunter-staging.ps1` in full; it reapplies the
   idempotent migrations and executes the rollback-only two-tenant/four-user SQL
   matrix.
5. Start the frontend against staging and execute the Admin A, Viewer A,
   Manager A and Admin B browser matrix.
6. Revoke Admin A membership during the live session, prove the next API request
   and page refresh are blocked, then restore view-only and prove mutations and
   bootstrap remain forbidden.
7. Rerun every local gate and the audit. Only then review/stage files and create
   the requested local commit. Do not push or open a pull request.

## Dependency decision

The clean production audit reports 4 critical and 4 high package-level findings.
Next.js 14.2.3 and the shared Wagmi/Coinbase/Viem graph are production-reachable
and block release. The package-by-package reachability, fixed versions, breaking
changes, tests and branch decisions are in
`docs/security/DEPENDENCY_REMEDIATION.md`.

The final bundle inspection found no `shell-quote` or `react-devtools-core`
string in emitted server/browser JavaScript. They remain installed production
transitives and are accepted only as unreachable optional React Native tooling;
this does not mitigate the separate reachable wallet-stack findings.
