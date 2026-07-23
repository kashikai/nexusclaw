# County Hunter — Phase 1.1 security hardening

## Scope and status

Phase 1.1 hardens only the additive County Hunter module. It does not implement crawling, discovery execution, parsing, valuation, bidding, payments, or agent automation, and it does not alter existing NexusClaw agent/on-chain flows.

The code is ready for a dedicated Supabase staging validation, but that validation has not been executed from this checkout because Supabase CLI, Docker and `psql` are unavailable. Phase 2 remains **NO-GO** until the staging script passes and the existing NexusClaw login establishes the expected Supabase cookie session.

## Security findings and corrections

| Finding | Risk | Correction |
|---|---|---|
| Browser read a session from local storage and sent an arbitrary bearer header | An API boundary depended on client-provided authorization material | Removed the client Supabase/token adapter and Authorization header; requests now use only the same-origin SSR cookie transport and server verification |
| API used `app_metadata.permissions` directly | Permission lifecycle was coupled to JWT claims | Added `county_hunter_memberships`; both API and RLS require an active matching membership |
| Public flag also controlled server authorization | A browser-visible value was acting as a server kill switch | Added private `COUNTY_HUNTER_ENABLED`; the public flag controls only TopNav visibility |
| Bootstrap accepted an organization RPC argument | Unnecessary tenant input increased mass-assignment risk | Replaced the RPC with a zero-argument function that derives user/org and verifies admin membership |
| Bootstrap did not write an invocation-level audit row | Repeated/failed review was harder | Every successful call records `bootstrap` and `counties_created`; repeated calls create no duplicate county |
| Stored URL validation did not cover DNS/redirect SSRF | A future worker could follow a hostname/redirect into a private network | Added a server-only DNS and redirect guard with private/reserved IPv4/IPv6 rejection; no worker or network crawling was added |
| Payload parsers silently ignored unknown fields | Tenant and system fields could be mistaken for accepted inputs | Every County Hunter mutation now rejects unexpected fields, including `organization_id` and `created_by` |

## Complete trust flow

```text
Existing NexusClaw login
→ Supabase session transported in SSR cookies
→ scoped middleware refreshes the session
→ supabase.auth.getUser() verifies the session token with Supabase Auth (the cookie itself is not trusted)
→ user_id = verified user.id
→ organization_id = verified user.app_metadata.organization_id
→ active county_hunter_memberships row for that user + organization
→ permissions = membership.permissions
→ County Hunter API authorization
→ user access token used only as PostgREST transport
→ RLS repeats user + organization + membership checks
```

Trust sources:

| Value | Authoritative source | Explicitly not accepted from |
|---|---|---|
| `user_id` | Verified `supabase.auth.getUser()` result | payload, route params, arbitrary header, unsigned cookie |
| `organization_id` | Signed JWT `app_metadata.organization_id`, then matching active membership | payload, query string, `user_metadata`, local storage |
| `permissions` | `county_hunter_memberships.permissions` | payload, headers, local storage, `user_metadata`, JWT permission arrays |
| PostgREST token | SSR cookie-transported session, read only after `getUser()` succeeds | cookie contents without token verification; browser-supplied Authorization header |

The current frontend still has no functional Supabase login. No parallel or fictitious login was added. The smallest secure integration is for the existing identity/login backend to complete the normal Supabase SSR code exchange and set the Supabase cookies; the County Hunter middleware then refreshes only requests under `/county-hunter` and `/api/county-hunter`. Until that integration exists, the module correctly returns 401 and stays hidden/disabled.

## Feature flags

```dotenv
COUNTY_HUNTER_ENABLED=false
NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=false
```

- `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED` controls only navigation visibility.
- `COUNTY_HUNTER_ENABLED` blocks pages, APIs, bootstrap, mutations, and the contract for future jobs. Missing or any value other than exact `true` fails closed.

## Bootstrap contract

`POST /api/county-hunter/bootstrap`:

- requires a verified session and `county_hunter.admin` membership;
- accepts only an empty body or `{}`;
- calls a zero-argument RPC—there is no client tenant argument;
- derives organization and actor in PostgreSQL;
- creates the six approved Georgia counties once (`6`, then `0`);
- records one audit row per successful invocation;
- uses the authenticated user/RLS path and a narrowly scoped `SECURITY DEFINER` RPC, never a service-role key;
- returns only `{ "counties_created": number }`.

## RLS and database validation

The per-table CRUD matrix is in [RLS_MATRIX.md](./RLS_MATRIX.md). Static/unit checks verify migration structure. The rollback-only staging test verifies two organizations and three real Auth users, cross-tenant denial, no-organization denial, `view` vs admin, `manage` vs admin, tenant mass assignment, bootstrap admin enforcement, idempotency and audit logging.

Prerequisites for a dedicated, non-production Supabase project:

1. Install PostgreSQL client tools so `psql` is on `PATH`.
2. Create three disposable users through Supabase Auth: viewer A, manager A, admin B.
3. Generate two distinct organization UUIDs.
4. Use the direct staging database connection string, never a production URL.

Run from PowerShell:

```powershell
$env:COUNTY_HUNTER_STAGING_CONFIRM='STAGING_ONLY'
$env:COUNTY_HUNTER_STAGING_DB_URL='postgresql://...staging...'
$env:COUNTY_HUNTER_TEST_ORG_A='00000000-0000-4000-8000-000000000001'
$env:COUNTY_HUNTER_TEST_ORG_B='00000000-0000-4000-8000-000000000002'
$env:COUNTY_HUNTER_TEST_VIEWER_A='<auth.users UUID>'
$env:COUNTY_HUNTER_TEST_MANAGER_A='<auth.users UUID>'
$env:COUNTY_HUNTER_TEST_ADMIN_B='<auth.users UUID>'
.\scripts\validate-county-hunter-staging.ps1
```

The runner applies all repository migrations in timestamp order and runs `supabase/tests/county_hunter_rls_test.sql`. Test data is wrapped in `BEGIN/ROLLBACK`; migrations remain applied to staging. Recovery for migration 004 is documented at its end. Because migration rollback would be destructive, recovery should be performed only from a staging backup/change window.

## Tests added

- missing session, organization and permission;
- non-admin bootstrap and private flag disabled;
- arbitrary Authorization header ignored;
- admin permission superset;
- HTTP/non-HTTPS, credentials, localhost, private IPv4, local/private IPv6;
- hostname resolving to private IP and redirect to private IP;
- extra payload fields, invalid UUID and attempted `organization_id` override;
- empty-only bootstrap body, repeated bootstrap result and no RPC tenant argument;
- nonexistent tenant-scoped resource returns 404;
- migration/membership/RLS/staging-script contracts;
- real staging SQL for cross-tenant role tests.

## Global changes

- `frontend/package.json`: added only `@supabase/ssr@0.7.0`, compatible with the pinned `@supabase/supabase-js@2.57.4`; no existing dependency or script was removed.
- `frontend/package-lock.json`: regenerated only to lock the SSR package and its dependency metadata.
- `frontend/.eslintrc.json`: no Phase 1.1 change. The existing County Hunter override remains additive.
- `frontend/.env.example`: added the private false-by-default flag and clarified the public flag.
- `frontend/components/layout/TopNav.tsx`: no Phase 1.1 change; its Phase 1 addition remains guarded only by the public navigation flag.
- `frontend/middleware.ts`: new, but its matcher is limited to County Hunter page/API paths, so existing agents and pages do not pass through it.

This checkout has no `.git`, so historical attribution of lint warnings cannot be cryptographically proven here. The warnings are outside County Hunter code and were present in the Phase 1 baseline; exact file/rule output is recorded after final validation below.

An `npm audit --omit=dev` also reports 26 production-tree advisories (4 low, 14 moderate, 6 high, 2 critical), including the existing direct pins `next@14.2.3`, `wagmi@2.12.3`, `viem@2.15.1`, and `postcss@8.4.31`. `@supabase/ssr` is not reported as vulnerable. Upgrading the existing application stack was intentionally not bundled into County Hunter because it can affect the working wallet/site; it requires a separate compatibility and regression task before enabling this module.

## Restore Git safely

The remote URL is documented in multiple existing project files as `https://github.com/kashikai/nexusclaw`, but the supplied `repo` directory contains no `.git` directory. It appears to be an exported/copied working tree; there is no local reflog or origin metadata to recover.

Do not run `git init` over this directory. Create a clean sibling clone and branch:

```powershell
cd 'G:\Meu Drive\Projetos\NexusClaw'
git clone https://github.com/kashikai/nexusclaw.git nexusclaw-clean
cd nexusclaw-clean
git switch -c feature/county-hunter-phase-1
```

Copy only the reviewed County Hunter files and the explicitly documented global files from `repo` into `nexusclaw-clean`. Then inspect before committing:

```powershell
git status --short
git diff --check
git diff -- frontend/package.json frontend/package-lock.json frontend/.env.example frontend/middleware.ts frontend/components/layout/TopNav.tsx
git diff -- frontend/app/county-hunter frontend/app/api/county-hunter frontend/features/county-hunter frontend/tests/county-hunter
git diff -- supabase/migrations supabase/tests scripts/validate-county-hunter-staging.ps1 docs/county-hunter
git add frontend/package.json frontend/package-lock.json frontend/.env.example frontend/middleware.ts frontend/components/layout/TopNav.tsx frontend/app/county-hunter frontend/app/api/county-hunter frontend/features/county-hunter frontend/tests/county-hunter supabase/migrations supabase/tests scripts/validate-county-hunter-staging.ps1 docs/county-hunter
git diff --cached --check
git diff --cached --stat
git commit -m "feat(county-hunter): add isolated phase 1 workspace and hardening"
```

No repository was initialized, no commit was created, and nothing was pushed by this work.

## Final validation record

- `npm test`: **PASS**, 37 tests in 6 files.
- `npm run typecheck`: **PASS**.
- `npm run lint`: **PASS with 6 warning messages in 4 existing files**, no County Hunter warning/error:
  - `app/layout.tsx:28` — `@next/next/no-page-custom-font`;
  - `app/layout.tsx:29` — `@next/next/google-font-display` and `@next/next/no-page-custom-font`;
  - `app/staking/StakingContent.tsx:54` — `react-hooks/exhaustive-deps`;
  - `app/start-agent/StartAgentContent.tsx:409` — `@next/next/no-img-element`;
  - `components/layout/TopNav.tsx:32` — `@next/next/no-img-element`.
- enabled production build: **PASS**, all County Hunter pages/APIs emitted. The pinned Supabase/Next dependency combination emits two non-fatal Edge-runtime compatibility warnings from the Supabase barrel import.
- real database migration/RLS execution: **NOT RUN**; local Supabase CLI, Docker and `psql` are missing. Exact staging runner delivered.
- Git: **NOT AVAILABLE** in this exported checkout; no init, commit or push performed.

Objective recommendation: **NO-GO for Phase 2** until the staging runner passes, the existing login issues SSR cookies, and the existing critical dependency advisories receive a separately tested remediation. Phase 1.1 application code itself passes its local test/type/lint/build gates.
