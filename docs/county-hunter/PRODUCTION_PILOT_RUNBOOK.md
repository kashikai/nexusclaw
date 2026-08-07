# County Hunter private production pilot runbook

Status: preparation only. This document does not authorize a push, deployment,
database access, migration, or feature enablement.

The first pilot is limited to one production tenant, manually invited users,
and the existing Gwinnett County adapter. It has no schedule, cron, second
county, public signup, purchase, bid, financial integration, on-chain
transaction, title conclusion, or legal conclusion.

## Owners and approval boundaries

Assign named people to every role before infrastructure is created:

| Role | Responsibility |
|---|---|
| Release owner | Approves the exact source SHA and deployment window. |
| Supabase owner | Creates the isolated project, applies migrations, validates RLS, and owns database recovery. |
| Security owner | Confirms historical credential rotation, environment separation, allowlists, and log redaction. |
| Pilot operator | Invites the pilot users and performs manual Discovery/replay. |
| Incident commander | Owns abort, rollback, communication, and recovery decisions. |
| Data reviewer | Compares the current official Gwinnett publication with parsed records and resolves `review_required`. |

No person should use staging credentials to fill a production requirement.
Production must have its own Supabase project/database/Storage, publishable key,
WalletConnect/Reown project, DNS name, TLS certificate, Base RPC, deployment
environment, logs, alerts, cookies, sessions, backups, and access policy.

## Prerequisites

All items require recorded evidence and two-person review:

- historical credentials listed in
  `docs/security/PRODUCTION_SECRET_CHECK.md` are confirmed deactivated or
  rotated;
- any coordinated history rewrite has separate authorization and a contributor
  migration plan;
- the production origin is selected, uses HTTPS, and is not a staging or local
  hostname;
- a new Supabase project is created in the intended organization and region;
- production and staging project refs are compared out of band and differ;
- Storage buckets and policies are created only in the production project;
- a dedicated WalletConnect/Reown project allows only the exact production
  origin;
- public and server Base RPC endpoints are dedicated to production, restricted
  as supported by the provider, and monitored;
- the deployment platform contains no staging/test variables, database URL,
  database password, generic Supabase secret, legacy service role, disposable
  wallet, or localhost certificate; the dedicated
  `COUNTY_HUNTER_SUPABASE_SECRET_KEY` and the independent
  `COUNTY_HUNTER_RATE_LIMIT_SECRET` are stored only as server secrets;
- backup location, retention, restore operator, RPO, RTO, log sink, alert
  recipients, and incident channel are approved;
- the exact release SHA, dependency audit, tests, build, and disabled-mode
  smoke evidence are approved separately.

Use `frontend/.env.production.example` only as a field inventory. Never deploy
that file, and never replace its markers in Git.

The production Supabase boundary uses four explicit classes:

- `PUBLIC_BROWSER`: `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL` and
  `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY`. These identify only the
  isolated County Hunter project.
- `PRIVATE_SERVER_RUNTIME`: `COUNTY_HUNTER_SUPABASE_SECRET_KEY`,
  `COUNTY_HUNTER_RATE_LIMIT_BACKEND=postgres`, and the independent
  `COUNTY_HUNTER_RATE_LIMIT_SECRET`. They are used only by server-only SIWE
  challenge and distributed rate-limit code. The admin client disables session
  persistence, token refresh, and URL session detection.
- `MIGRATION_ONLY`: `COUNTY_HUNTER_PRODUCTION_DB_URL`, supplied only to a
  separately authorized migration or backup process and never to Next.js.
- `FORBIDDEN_IN_PRODUCTION`: generic `SUPABASE_SECRET_KEY`, legacy
  `SUPABASE_SERVICE_ROLE_KEY`, every `COUNTY_HUNTER_STAGING_*`, and every
  `COUNTY_HUNTER_TEST_*` variable.

The generic `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
remain assigned exclusively to agents, signal-agent, and legacy NexusClaw
flows. County Hunter has no production fallback to them. The temporary generic
publishable/secret compatibility exists only outside `NODE_ENV=production`
while the already validated staging environment transitions.

## Initial production state

The deployment must begin with all three values false:

```text
COUNTY_HUNTER_ENABLED=false
COUNTY_HUNTER_DISCOVERY_ENABLED=false
NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=false
```

`COUNTY_HUNTER_ENABLED` and `COUNTY_HUNTER_DISCOVERY_ENABLED` are server-side
security controls. The public flag controls only navigation. Discovery cannot
be enabled while the module is disabled. A production module enablement also
requires the complete, validated environment and the explicit
`COUNTY_HUNTER_PRODUCTION_CONFIRM` value documented in the environment matrix.

Changing a flag never rolls back a migration or deletes data. A separate,
explicit pilot authorization is required before either server flag is enabled.

## Domain, Supabase Auth, and SIWE checklist

Use the selected configured origin; the conceptual form is
`https://county-hunter.DOMINIO-DE-PRODUCAO`. Do not hard-code that marker.

Before enabling the module, verify:

1. DNS and TLS are valid for the exact origin.
2. `NEXT_PUBLIC_APP_ORIGIN` and `COUNTY_HUNTER_AUTH_ORIGIN` are the same
   pathless origin.
3. The WalletConnect/Reown allowlist contains only the exact approved origin
   needed by the provider; it contains no staging, localhost, or broad
   wildcard.
4. Supabase Site URL and redirect allowlist contain only reviewed production
   paths; no staging, localhost, or insecure wildcard remains.
5. Web3 Wallet and Ethereum are enabled in the isolated production Supabase
   project.
6. SIWE domain is the production host, SIWE URI is the canonical configured
   HTTPS origin, and chain ID is Base `8453`.
7. HTTP, localhost, staging hostnames, unexpected URI paths, mismatched or
   duplicated origins, and other chain IDs fail closed.
8. Nonces expire, are consumed exactly once, and an expired nonce or replayed
   signature is rejected.
9. Challenge issue/consume calls run only through the County Hunter
   server-only admin client. Normal sessions use the namespaced publishable key
   plus the user's JWT; no administrative key or response reaches the browser.
10. Session cookies are `Secure`, `HttpOnly` where the server owns them, and use
   the reviewed `SameSite` policy. Login, refresh, and logout responses remain
   `private, no-store`.
11. Public signup is disabled. Invite only the named pilot users, and use no
    staging or disposable test user.

Run anonymous, Viewer, Manager, Admin, inactive-membership, missing-membership,
logout, refresh, nonce-reuse, and cross-tenant checks before enablement.

## Database and data procedure

Do not use the staging provisioner against production. Do not copy Auth users,
memberships, runs, snapshots, test fixtures, or staging data.

Every SQL command must use `ON_ERROR_STOP=1`, a verified production project ref,
an approved maintenance window, and a fresh backup:

1. Create a clean, isolated Supabase production project.
2. Record and independently verify its project ref and intended region.
3. Take and verify the pre-migration backup.
4. Apply the five Phase 1 migrations, in filename order:
   `202607230001` through `202607230005`.
5. Verify tables, functions, grants, indexes, constraints, RLS enablement, and
   policies. Run the two-tenant RLS matrix in a rollback-only transaction using
   temporary identities; do not retain those identities.
6. Apply the three Phase 2 migrations, in filename order:
   `20260726153642`, `20260726160827`, and `20260726174825`.
7. Apply the SIWE server-only hardening migration
   `20260804181518_county_hunter_siwe_server_only_hardening.sql` and verify that
   privileged issue/consume RPCs remain executable only by the approved
   server-side role.
8. Apply `20260806081241_county_hunter_distributed_rate_limit.sql`. Verify the
   bucket table exists only in the private schema, has no Data API grants, and
   the consume and bounded-cleanup RPCs are executable only by `service_role`.
   Exercise atomic same-bucket concurrency before enablement.
9. Recheck objects, grants, RLS, function ownership/search paths, snapshot
   lineage, replay isolation, and the source lock.
10. Create exactly one pilot organization using an approved production admin
   workflow.
11. Invite only the named pilot users and create active memberships with the
   minimum role permissions.
12. Bootstrap the organization. Confirm the first result against the current
   seed and the second call returns zero new rows.
13. Configure only the official Gwinnett County source. A human must verify the
   URL, hostname, document type, and publication timestamp.
14. Keep collection disabled until a named Admin is ready for the manual run.
15. Temporarily enable collection under change control and run one manual
   Discovery as that Admin.
16. Compare the parsed count and each exception with the official publication
   at that moment. Do not assume the historical count of 25.
17. Run the second manual collection and validate idempotency/diffs against the
   unchanged or newly published source.
18. Run one manual replay from the selected stored snapshot and verify lineage,
   unchanged/diff results, actor, and tenant.
19. Validate Viewer read-only behavior, Manager denial for Discovery/replay and
   administration, Admin scope, missing/inactive memberships, payload tenant
   substitution, and cross-tenant SELECT/INSERT/UPDATE/DELETE denial.
20. Disable collection immediately after the controlled run unless another
   approved operator window is active.

Discovery retains the source lock, duplicate prevention, cooldown, fetch
timeout, body-size limit, redirect limit, SSRF protection, content checks, and
human-review flags. A disabled browser button is never an authorization
control.

## Pilot role matrix

| Role | Allowed | Denied |
|---|---|---|
| Viewer | Authorized tenant-scoped reads | Discovery, replay, source/admin changes |
| Manager | Authorized non-admin operations already defined by RLS | Discovery, replay, pilot configuration, admin operations |
| Admin | Manual Discovery and replay within the active membership tenant | Other tenants, scheduling, second adapter/county, on-chain or financial action |

## Backup, recovery, and rollback

Minimum pilot policy:

- verified full backup before Phase 1, before Phase 2, and before any destructive
  change;
- daily automated backups during the pilot with 30-day retention;
- encrypted storage, least-privilege restore access, audit trail, and a
  separately protected copy;
- quarterly restore rehearsal and a restore rehearsal before first enablement;
- pilot target RPO of 24 hours and RTO of 4 hours, or stricter values approved
  by the system owner before launch;
- application rollback and database recovery remain independent.

Operational rollback order:

1. set `COUNTY_HUNTER_DISCOVERY_ENABLED=false`;
2. if needed, set `COUNTY_HUNTER_ENABLED=false` and hide the public navigation;
3. restore the previous approved application version;
4. preserve the database and evidence;
5. investigate and verify recovery using read-only checks;
6. restore a verified backup only when the incident commander and database
   owner approve;
7. use the destructive Phase 2 rollback only as a last resort, after a restored
   disposable rehearsal and separate explicit approval.

Never make the destructive rollback the automatic response to an application
incident.

## Observability and alerts

Route logs are structured and allowlisted. Actor and tenant identifiers are
one-way opaque references. Record event type, safe reason code, status, counts,
and duration; never record signatures, reusable nonces, cookies, access/refresh
tokens, service keys, complete Project IDs, wallet addresses, full headers,
source document bodies, or confidential URLs.

Monitor:

- SIWE challenge/login success and failure, including expired/reused nonce
  reason classes;
- permission denial and repeated cross-tenant/RLS rejection;
- Discovery and replay start, completion, failure, record counts, and duration;
- fetch rejection, source lock/cooldown, invalid document, and source structure
  change reason codes;
- kill-switch blocks and unexpected enablement changes;
- migration/backup/restore failure, RPC failure, fatal exceptions, stuck runs,
  abnormal run volume, and repeated official-source failures.

Alert the incident commander and pilot operator on three authentication or
cross-tenant failures from the same opaque source in five minutes, a run beyond
twice the approved timeout, more than the approved number of manual runs in a
window, two consecutive source failures, any migration/backup failure, or any
fatal exception. Exact thresholds must also be enforced by the deployment
gateway/log platform.

### Rate-limit topology gate

Production SIWE rate limiting uses the dedicated County Hunter PostgreSQL
database. `COUNTY_HUNTER_RATE_LIMIT_BACKEND` must be exactly `postgres`; the
in-memory adapter is limited to local development and unit tests and is
rejected while the production module is enabled.

The server derives fixed-length bucket identifiers with HMAC-SHA-256 and the
independent `COUNTY_HUNTER_RATE_LIMIT_SECRET`. Raw IP addresses and wallet
addresses are never stored or logged. Verification consumes both applicable
buckets atomically:

- route plus IP: 30 requests per fixed 300-second window;
- route plus IP plus normalized wallet: 10 requests per fixed 300-second
  window;
- invalid payload: route plus IP plus the fixed `invalid-payload` discriminator,
  10 requests per fixed 300-second window.

Challenge issuance retains its own policies and buckets, separate from verify.
Every denial returns HTTP 429 with `Retry-After`, `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset`. If the shared backend cannot
make an authoritative decision, the route fails closed with a sanitized HTTP
503; it never falls back to process memory.

The atomic RPC signature is
`public.county_hunter_consume_rate_limit_buckets(text[], text[], integer[], integer[])`.
It accepts only validated HMAC hashes, approved scopes, limits, and 300-second
windows, and returns only bucket position, `allowed`, `limit`, `remaining`, and
`reset_at`. Its empty `search_path`, fully qualified relations, and grants are
part of the production database review gate.

Expired rows stop affecting decisions as soon as their database-clock window
ends. Requests perform a small bounded opportunistic cleanup. The privileged
bounded-cleanup RPC is available to the database operator; a daily Supabase
Cron invocation is optional and must be configured manually under separate
authorization. Lack of cron does not change enforcement correctness.

Vercel WAF is an additional future defense and is not configured by this local
preparation. On Hobby, use the single available rate-limit rule for POST
`/api/county-hunter/auth/*`, counted by IP, 60 requests per 300 seconds, with
HTTP 429. This manual step does not replace the PostgreSQL global and
per-wallet limits.

Rollback order for this component is: keep all production flags false, restore
the previous approved application, revoke the consume/cleanup RPC grants if
needed, and preserve bucket rows as security evidence. Do not drop the private
table automatically. Removing the migration requires separate database-owner
approval and a verified backup.

## User notices

The Discovery UI must continue to state that:

- information comes from an official public source and can change without
  notice;
- users must confirm directly with the county;
- `removed_from_current_source` does not mean sold or cancelled;
- amounts are not market valuations;
- results are not title analysis and do not guarantee clear ownership or lack
  of liens;
- nothing is legal or financial advice;
- last collection time, official-source link, adapter version, and
  `review_required` status remain visible.

## Disabled-mode and pilot smoke

Before deployment authorization, build and run locally with synthetic
placeholders and all flags false. Require Home health, RPC degradation,
County Hunter 404/safe unavailability, Discovery/replay denial, no staging
acceptance, no application-owned local origin in the public bundle, explicit
WalletConnect metadata, and a documented classification for vendor tokens.

After an independently authorized deployment, but before enabling collection:

- Home, assets, SSR, navigation, Base 8453, RainbowKit, MetaMask,
  WalletConnect QR, disconnect/reconnect, and RPC degradation;
- County Hunter disabled state, then invite-only SIWE, refresh, logout, and
  no-store headers;
- role, membership, RLS, tenant-isolation, and rate-limit checks;
- one-tenant/Gwinnett-only configuration and no scheduled job;
- backup and alert delivery.

For the first real-domain deployment, install the DevTools Snippet from
`frontend/scripts/browser/wallet-production-network-smoke.js` before opening
RainbowKit. With all County Hunter flags still false, start the monitor, open
the wallet modal, open and close the WalletConnect QR flow, exercise MetaMask
connect/disconnect without signing or transacting, then call
`__NEXUSCLAW_WALLET_NETWORK_SMOKE__.finish()`. The sanitized result must report
`passed=true` and `forbiddenRequests=0`. The harness monitors `fetch`,
`XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, and
`window.open`; it stores no URL, query, Project ID, cookie, token, wallet, or
signature. Official WalletConnect/Reown destinations are observed but not
blocked.

No smoke test may use real funds or send a transaction.

## Abort, success, and shutdown

Abort immediately on secret exposure, project-ref mismatch, staging value,
backup failure, migration error, RLS/role/cross-tenant failure, SIWE replay,
unexpected public signup, unbounded run, source structure change without human
review, incorrect official-source comparison, fatal UI/API loop, or missing
alerts. Disable collection first and preserve evidence.

Pilot success requires an approved window; one isolated tenant; manually
invited roles; verified backups; SIWE/session/RLS checks; a manual Gwinnett run,
idempotent second run, and replay matching the official publication; sanitized
logs and alerts; no cross-tenant access; and no transaction/on-chain action.

At pilot shutdown:

1. disable collection and the module;
2. revoke unneeded memberships and sessions;
3. export the audit/evidence manifest without secrets;
4. take and verify the final backup;
5. retain or delete pilot data only under the approved retention policy;
6. rotate temporary operator credentials;
7. close alerts and document incidents, counts, review decisions, and the final
   state.

Secret rotation creates a new value in the owning provider, updates the
deployment secret store through two-person review, restarts/redeploys only
under separate approval, validates service, revokes the old value, and records
only identifiers and timestamps. Never place the old or new value in Git,
tickets, logs, or this runbook.
