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
  database password, Supabase service role/secret key, disposable wallet, or
  localhost certificate;
- backup location, retention, restore operator, RPO, RTO, log sink, alert
  recipients, and incident channel are approved;
- the exact release SHA, dependency audit, tests, build, and disabled-mode
  smoke evidence are approved separately.

Use `frontend/.env.production.example` only as a field inventory. Never deploy
that file, and never replace its markers in Git.

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
9. Session cookies are `Secure`, `HttpOnly` where the server owns them, and use
   the reviewed `SameSite` policy. Login, refresh, and logout responses remain
   `private, no-store`.
10. Public signup is disabled. Invite only the named pilot users, and use no
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
7. Recheck objects, grants, RLS, function ownership/search paths, snapshot
   lineage, replay isolation, and the source lock.
8. Create exactly one pilot organization using an approved production admin
   workflow.
9. Invite only the named pilot users and create active memberships with the
   minimum role permissions.
10. Bootstrap the organization. Confirm the first result against the current
    seed and the second call returns zero new rows.
11. Configure only the official Gwinnett County source. A human must verify the
    URL, hostname, document type, and publication timestamp.
12. Keep collection disabled until a named Admin is ready for the manual run.
13. Temporarily enable collection under change control and run one manual
    Discovery as that Admin.
14. Compare the parsed count and each exception with the official publication
    at that moment. Do not assume the historical count of 25.
15. Run the second manual collection and validate idempotency/diffs against the
    unchanged or newly published source.
16. Run one manual replay from the selected stored snapshot and verify lineage,
    unchanged/diff results, actor, and tenant.
17. Validate Viewer read-only behavior, Manager denial for Discovery/replay and
    administration, Admin scope, missing/inactive memberships, payload tenant
    substitution, and cross-tenant SELECT/INSERT/UPDATE/DELETE denial.
18. Disable collection immediately after the controlled run unless another
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

The in-process limits are defense in depth and are not distributed. Configure
gateway/WAF limits for SIWE challenge and verification, Discovery reads,
Discovery execution, replay, bootstrap, and administrative endpoints. Keep
Discovery at one manual run per source/lock window.

### Rate-limit topology gate

The planned Vercel deployment is classified as
`DISTRIBUTED_BACKEND_REQUIRED`: separate serverless instances do not share
process memory. The application exposes a server-only asynchronous rate-limit
backend interface so an approved shared implementation can replace the local
fixed-window backend without changing authorization routes. No shared vendor
or paid service is selected by this preparation.

The in-memory backend remains useful for local validation and defense in depth
within one instance, but it is not the production enforcement boundary.
Production County Hunter flags must remain off until an approved distributed
backend or deployment gateway atomically enforces the documented global and
per-identity limits across all instances. This is a production-ON condition,
not a staging bypass.

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
acceptance, and no secret/local origin in the public bundle.

After an independently authorized deployment, but before enabling collection:

- Home, assets, SSR, navigation, Base 8453, RainbowKit, MetaMask,
  WalletConnect QR, disconnect/reconnect, and RPC degradation;
- County Hunter disabled state, then invite-only SIWE, refresh, logout, and
  no-store headers;
- role, membership, RLS, tenant-isolation, and rate-limit checks;
- one-tenant/Gwinnett-only configuration and no scheduled job;
- backup and alert delivery.

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
