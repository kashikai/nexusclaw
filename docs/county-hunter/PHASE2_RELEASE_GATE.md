# County Hunter Phase 2 release gate

## Approved base and recovery checkpoint

- Pipeline base: `6d38c55b2b4782cef1f2367a1c9f99eb5c69a442`.
- Workspace/documentation base:
  `7f5c1623fc6f7e74ca2ea2d96648949d0bb8e804`.
- Hardening branch:
  `hardening/county-hunter-phase2-release-gate`.
- Local annotated tag: `county-hunter-phase2-gwinnett-approved`.
- External recovery bundle:
  `C:\dev\backups\nexusclaw-county-hunter-phase2.bundle`.

The bundle contains the approved feature branch, the wallet security branch,
the annotated tag and complete restoration history. It contains Git objects
only; ignored environment files and local certificates are not included.

## Validated source baseline

The only Phase 2 source remains the official Gwinnett County Tax Commissioner
Tax Liens & Tax Sales page. The initial current-list PDF was textual and
produced 25 records without OCR. The second official discovery run produced
25 `unchanged` records and zero added, changed or removed records.

The date and URL of that initial document remain evidence, not permanent
configuration. Normal discovery still rediscovers the current document from
the official landing page.

## Administrative snapshot replay

Replay reprocesses an already stored `official_document` snapshot and never
contacts the official site.

1. An authenticated Admin selects the stored document in the Discovery
   workspace.
2. `POST /api/county-hunter/discovery/replay` accepts only a UUID
   `snapshotId`.
3. A narrowly granted database RPC derives the tenant from the verified
   Supabase session, verifies an active Admin membership, verifies the snapshot
   belongs to the same tenant and verifies the source is the approved Gwinnett
   adapter.
4. The RPC creates a new `snapshot_replay` run, records `source_run_id` and the
   deployed `adapter_version`, acquires the same source lock used by official
   discovery, and returns the raw PDF only to the server route.
5. The server validates content type, bounded length and SHA-256 before parsing.
6. Parser output is compared with the raw records from the source run. Replay
   writes new raw records and diff rows, but does not update canonical
   properties, auctions, the source or the original snapshot.
7. The run is completed only after records and diffs persist and the lock is
   released. Any partial failure is recorded as `failed`.

Viewer and Manager cannot initiate replay. Admin B cannot replay an Admin A
snapshot. Snapshot bytes are never returned by the browser API or rendered in
the UI.

A future deployed parser version can replay the same snapshot. Its run records
the new adapter version while retaining the original source run and snapshot,
allowing deterministic comparison without relabeling or modifying provenance.

## Migration review

The Phase 2 migrations are ordered as:

1. `20260726153642_county_hunter_gwinnett_discovery.sql`: additive discovery
   columns, snapshots, raw records, diffs, locks, tenant foreign keys, indexes,
   RLS, explicit Data API grants and official-source RPCs.
2. `20260726160827_county_hunter_gwinnett_discovery_rpc_fix.sql`: reconciles
   the source through the existing named logical unique constraint.
3. `20260726174825_county_hunter_snapshot_replay.sql`: replay lineage, a
   tenant self-foreign-key, partial lineage index and the Admin-only replay RPC.

Every new exposed table has mandatory `organization_id`, composite tenant
foreign keys, RLS and explicit grants. The replay RPC is `SECURITY DEFINER`
only because authenticated roles deliberately lack raw snapshot-column access.
It has a fixed `search_path`, explicit caller/tenant/Admin checks, exact source
checks, revoked `PUBLIC`/`anon` execution and an `authenticated` grant.

The migrations preserve the six seeded counties. Gwinnett is added
idempotently when absent and no second discovery county is configured.

## Release-gate evidence

- `npm ci` completed from the committed lockfile and its SHA-256 remained
  unchanged.
- The default local suite completed with 98 passing tests. The one skipped test
  is the intentionally opt-in live-source test.
- Typecheck, lint and the Next 15.5.21 production build passed. The build kept
  County Hunter pages and authenticated APIs dynamic, including the replay
  route.
- The staging RLS runner completed with exit code zero inside its
  `BEGIN`/`ROLLBACK` transaction. Admin replay, Viewer/Manager denial, Admin B
  isolation, missing/inactive membership, audit attribution and tenant
  boundaries were exercised without persistent fixture changes.
- The staging Discovery E2E completed with real disposable-wallet SIWE for
  Admin A, Viewer A, Manager A and Admin B. Normal discovery parsed 25 records,
  the second run reported 25 unchanged, two stored-snapshot replays each
  reported 25 unchanged, cross-tenant replay was blocked, session refresh
  passed and every session was logged out.
- Manual wallet smoke on the valid public Base RPC passed: one RainbowKit
  modal, WalletConnect QR reopen, MetaMask connect/disconnect, Base chain 8453
  and refresh without a loop. No transaction was submitted.
- Manual Home smoke with a closed loopback RPC passed: the page and navigation
  remained usable, failed metrics displayed `Temporarily unavailable`, no
  failed value became a false zero and no RPC/refresh loop occurred.
- After removing the generated `.next` state, the valid public RPC was restored
  and all three read-only Home contract calls succeeded again.

These results approve development/staging hardening evidence only. They do not
override the production blockers documented below.

## Destructive rollback

Normal recovery does not delete evidence: disable the managed source, revoke
the four discovery/replay RPCs and let an active lock expire.

The reviewed destructive procedure is:

`supabase/rollback/county_hunter_phase2.sql`

It must never run on shared staging or production as routine recovery. Before
using it in a disposable clone:

1. stop County Hunter writers and confirm no discovery lock exists;
2. take a full `pg_dump --format=custom` backup and verify it with
   `pg_restore --list`;
3. restore that backup into a disposable database;
4. set
   `county_hunter.allow_destructive_phase2_rollback = 'YES'` in that database
   session;
5. run the rollback with `psql -X -v ON_ERROR_STOP=1`;
6. verify Phase 1 tables, memberships, RLS and bootstrap still work;
7. discard the database.

The rollback revokes and drops replay/discovery RPCs, removes Phase 2 policies
and foreign keys in dependency order, deletes Phase 2 runs and the managed
Gwinnett source, drops snapshots/raw records/diffs/locks, removes additive
columns and restores the Phase 1 source/run policies and status constraint.
The Gwinnett county registry row and the original six county rows are preserved.

Data loss is intentional and total for Phase 2 runs, snapshot bodies, raw
records, diffs and normalized discovery provenance. Audit rows remain. Reapply
only by restoring the backup or applying the three Phase 2 migrations in order
to a clean Phase 1-compatible database.

The current workstation has the PostgreSQL client but no Docker or disposable
Postgres server. Automated tests therefore validate the rollback guard,
dependency order, restored policies and preservation of foundation tables.
An actual destructive execution remains a production release prerequisite on
a separately provisioned disposable database.

## Dependency advisories

The production audit baseline remains 0 critical, 3 high and 10 moderate:

- Axios 1.16.0 is transitive through the Coinbase/CDP wallet path. The high
  advisory requires the Node HTTP adapter; NexusClaw reaches the dependency in
  the browser connector and does not call Axios directly. Latest CDP still pins
  the vulnerable version.
- Sharp 0.34.5 is optional under Next 15.5.21 and reachable through server image
  optimization. Current inputs are trusted local images, but the high remains.
  Next 15.5.22 still declares Sharp `^0.34.3`, so no compatible patch is
  available in the approved framework line.
- Next is marked high through the Sharp dependency; the audit payload does not
  report a separate new Next vulnerability.

No advisory is suppressed or declared fixed. No forced install, incompatible
override, React override, beta, RC or canary package is used. Detailed paths
and reachability are recorded in
`docs/security/DEPENDENCY_REMEDIATION.md`.

## Accepted and unaccepted risks

Accepted for development and staging:

- the Axios Node-only advisory is installed in a client wallet path and not
  reached by NexusClaw server requests;
- Sharp receives only repository-controlled local image inputs during the
  current staging validation;
- historical failed/review runs remain as immutable diagnostic provenance.

Not accepted for production:

- a reachable high advisory without a supported fix;
- replay without destructive rollback rehearsal in a disposable database;
- missing RLS, tenant, audit, wallet or SIWE smoke evidence;
- any service role, private endpoint, Project ID, wallet secret or session
  token in source control or runtime logs.

## Production criteria

Production remains disabled until all of the following are true:

- a supported Next release accepts patched Sharp, or image optimization is
  removed through a separately reviewed architecture change;
- the wallet parent chain upgrades Axios to a patched version or an equivalent
  upstream fix is verified;
- the destructive rollback succeeds on a disposable restored database;
- migrations, RLS, four Web3 profiles, replay, normal discovery, SIWE,
  WalletConnect QR, MetaMask, Base 8453 and RPC-resilience smokes all pass;
- production audit has no unmitigated reachable critical/high findings;
- an explicit production deployment authorization is issued.

## Criteria for a second county

A second county requires separate authorization and cannot reuse Gwinnett
assumptions. It needs an official current-list source, independent fixtures and
adapter, safe-fetch hostname review, deterministic parser, reason codes,
snapshot/diff/replay compatibility, tenant/RLS tests, staging validation and a
county-specific rollback impact review. No automatic fallback county is
permitted.
