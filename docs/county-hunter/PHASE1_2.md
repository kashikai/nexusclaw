# County Hunter — Phase 1.2 staging validation and authentication integration

> Historical Phase 1.2 record. Phase 1.3 supersedes the runtime nonce access,
> cache policy, staging wallet provisioner and clean-install results. In
> particular, the deployed runtime no longer reads the service-role key.

## Executive status

Phase 1.2 now has a clean Git branch, a server-issued SIWE authentication bridge, disposable staging fixture tooling, expanded rollback-only RLS checks, hardened cookie handling, a complete `SECURITY DEFINER` review, and passing offline application gates.

The dedicated Supabase staging configuration was not available in this environment. No database URL, project ref, anon key, service-role key, staging users, organizations, or staging wallet identities were present. Therefore no remote migration, real RLS run, Auth login, refresh/logout browser scenario, or end-to-end staging scenario was executed. No production endpoint was contacted.

Decision: **NO-GO FOR PHASE 2** until all real staging gates below pass. No commit or push is permitted before that point.

## Authentication architecture

The pre-existing NexusClaw identity surface was only RainbowKit/Wagmi wallet connection on Base. It had no signed challenge, nonce, trusted backend authentication, user mapping, Auth session, cookie, or logout. Connecting a wallet was therefore not authentication.

The additive Phase 1.2 flow is:

```text
Existing RainbowKit/Wagmi wallet connection (Base, chain 8453)
→ POST /api/county-hunter/auth/challenge with public wallet address
→ trusted server reads fixed COUNTY_HUNTER_AUTH_ORIGIN (never Host)
→ server creates EIP-4361 message with address/domain/URI/chain/nonce/issued/expiry/statement/request ID
→ server stores only SHA-256(nonce) for five minutes in a table with no direct API grants
→ existing wallet signs the exact message
→ POST /api/county-hunter/auth/verify with message + signature
→ server revalidates every SIWE field and verifies EOA/smart-account signature through Viem on Base
→ server atomically DELETEs the matching unexpired challenge (replay then fails)
→ server calls the supported Supabase Auth signInWithWeb3({ chain: 'ethereum', message, signature })
→ @supabase/ssr writes HttpOnly, SameSite=Lax cookies; Secure is mandatory for HTTPS/production
→ County Hunter-scoped middleware refreshes the cookie session
→ supabase.auth.getUser() verifies the session with Auth
→ organization_id comes only from verified app_metadata
→ current active county_hunter_memberships row supplies permissions on every request
→ user access token calls PostgREST
→ RLS repeats user + organization + active membership checks
```

Supabase Auth's own `auth.identities` wallet identity is the mapping source. No parallel login and no `county_hunter_identity_links` table were created. Phase 1.3 removed the service-role key from the deployed runtime entirely; it is now used only by the ignored local staging provisioner. Session tokens are never placed in local storage or manually accepted from browser Authorization headers.

Logout calls the supported SSR `signOut` path and expires only cookie names matching Supabase's auth-cookie format. Logout remains available even if the County Hunter flag is later switched off so a session can always be cleared.

## Database validation

| Item | Offline/static result | Real staging result |
|---|---|---|
| Foundation, RLS, seed, membership hardening migrations | PASS through contract tests/type/build | NOT RUN — staging credentials absent |
| SIWE challenge migration | PASS: hash-only row, 5-minute DB constraint, Base chain constraint, forced RLS, no `anon`/`authenticated` grants | NOT RUN |
| Migration order and runner | PASS: chronological all-repository enumeration; project-ref/host guard; password moved to `PGPASSWORD` rather than process arguments | NOT RUN |
| Seed idempotency | PASS in SQL contract and rollback-only test design (`6`, then `0` for each tenant) | NOT RUN |
| Viewer/manager/admin RLS | Expanded SQL supplied | NOT RUN |
| Cross-tenant SELECT/INSERT/UPDATE/DELETE | Expanded SQL supplied | NOT RUN |
| Missing org/membership/inactive membership | Expanded SQL supplied | NOT RUN |
| Forged user metadata/JWT permission/header | Expanded SQL supplied | NOT RUN |
| Audit actor/org/action/time/no-secret | Expanded SQL supplied | NOT RUN |

The rollback-only SQL now uses Organization A and B plus viewer A, manager A, admin A and admin B. It bootstraps A and B independently, checks `6 → 0`, verifies audit rows, exercises authorized manager source mutations, and proves that tenant IDs cannot be injected or moved.

## SECURITY DEFINER and function audit

Migration `202607230005_county_hunter_wallet_auth.sql` sets every County Hunter function to `search_path = pg_catalog, public`. The result below is a static audit pending real execution in staging.

| Function | SECURITY DEFINER | search_path | Permission | Tenant source | Result |
|---|---:|---|---|---|---|
| `county_hunter_current_organization_id()` | No | `pg_catalog, public` | Execute only for `authenticated` | Verified JWT `app_metadata.organization_id`; no client argument | PASS static |
| `county_hunter_has_permission(text)` | No | `pg_catalog, public` | Execute only for `authenticated`; one permission name | `auth.uid()` + session org + active membership | PASS static |
| `county_hunter_set_updated_at()` | No | `pg_catalog, public` | Trigger function; no client tenant input | Row already accepted by table policy | PASS static |
| `county_hunter_write_audit_log()` | Yes | `pg_catalog, public` | Trigger-only; all execute revoked from `public`; no dynamic SQL | RLS-approved row organization + `auth.uid()` | PASS static; staging pending |
| `county_hunter_seed_georgia()` | Yes | `pg_catalog, public` | Zero arguments; execute only for `authenticated`; explicit active admin check | `auth.uid()` + session organization + active admin membership | PASS static; staging pending |

Neither definer function accepts `organization_id`, executes dynamic SQL, returns secrets, or grants broad execution. The audit trigger cannot be called directly by authenticated users. The bootstrap returns only `counties_created`.

## Local validation record

Validation ran in a clean temporary copy because Google Drive made `npm ci` impractically slow and left an ignored partial `node_modules`; the code and lockfile came from the clean Git clone and the final artifacts were not copied back.

| Gate | Result |
|---|---|
| `npm ci` | FAIL in the Google Drive clone with `TAR_ENTRY_ERROR`; a local install produced the exact final manifests, but npm 11's project `postinstall: npm dedupe` did not complete before the bounded run. This remains a formal gate failure. |
| `npm test` | PASS — 43 tests in 7 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with six existing warnings outside County Hunter; no County Hunter warning/error |
| Enabled `npm run build` | PASS — County Hunter pages plus challenge/verify/session/logout routes emitted |
| `npm audit --omit=dev` | FAIL for production — 36 package-level findings (4 critical, 10 high, 18 moderate, 4 low) |
| Staging SQL | NOT RUN — dedicated credentials absent |
| Browser E2E login/refresh/logout/role matrix | NOT RUN — staging project and test wallets absent |

The dependency disposition is in `docs/security/DEPENDENCY_REMEDIATION.md`. No automatic audit fix was run.

## Tooling

- Node.js 24.11.1 and npm 11.6.2 are available.
- PostgreSQL `psql` 17.10 was installed as a user-local client containing only `psql.exe` and runtime DLLs at `C:\Users\yarak\AppData\Local\PostgreSQL\17-client\bin`. No PostgreSQL service or local database was installed.
- Supabase CLI and Docker are not available, so the intended target is a dedicated remote staging project.

## Manual staging configuration

> Superseded. Follow the ordered Phase 1.3 runbook in `PHASE1_3.md`; do not use
> the placeholder email-user sequence below.

1. Create or select a dedicated non-production Supabase project and put only its values in ignored `.env.staging.local`.
2. Enable the Ethereum Web3 provider. Register the exact `COUNTY_HUNTER_AUTH_ORIGIN` in Supabase Redirect URLs, including the required path/glob. Configure the Web3 Auth rate limit and CAPTCHA in the Supabase dashboard.
3. Set `COUNTY_HUNTER_STAGING_PROJECT_REF`, DB URL, Supabase URL/anon key, server-only service role, fixed HTTPS auth origin, two new organization UUIDs, and both flags. Never reuse production values.
4. From `frontend`, run `node scripts/provision-county-hunter-staging.mjs`. Before migrations this creates the four disposable Auth users via Admin API and saves their non-secret UUIDs locally; a missing memberships table is expected at this first pass.
5. Run `scripts/validate-county-hunter-staging.ps1`. It confirms the project ref against the DB host/user, applies every repository migration in order, then executes the rollback-only RLS suite without exposing the password in command arguments.
6. Rerun the provisioning script after migrations so the four active memberships persist outside the rollback-only test.
7. Enable Web3 sign-in in staging, authenticate four disposable wallets once, and use the Admin API to assign each resulting Supabase wallet user its staging organization in `app_metadata` plus the corresponding active membership. Do not manually edit `auth.users` and do not link the disposable email users to wallets by hand.
8. Execute the browser matrix for admin A, viewer A, manager A, admin B and no session: login, refresh, expiration, invalid cookie, logout/cookie deletion, disabled user, revoked membership, changed organization/permission, bootstrap `6 → 0`, source mutation, audit, and cross-tenant 404/non-disclosure.
9. Rerun all local gates and the production audit. Keep both production flags false.

Required local variables are already named in ignored `.env.staging.local`; values remain blank because no dedicated staging credentials were supplied.

## Git and scope

- Clean clone: `G:\Meu Drive\Projetos\NexusClaw\nexusclaw-clean`
- Branch: `feature/county-hunter-phase-1`
- The remote-tracked `frontend/.env.local` was removed without reading its contents and matching local env files are ignored.
- No contract, staking, agent, crawler, parser, OCR, valuation, bidding, payment, recurring job, or on-chain integration was changed.
- No commit, push, or pull request was created because the mandatory real staging gates are not complete.

## Phase 2 recommendation

```text
NO-GO FOR PHASE 2
```

Blocking reasons: no real staging migration/RLS/bootstrap execution, no real Supabase Web3 SSR login/refresh/logout test, no membership-revocation browser proof, no role/tenant E2E matrix, and unresolved critical production dependency advisories.
