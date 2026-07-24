# County Hunter — Phase 1.4 real SIWE session and revocation E2E

## Decision

Phase 1.4 validates the County Hunter authentication and tenant authorization
boundary against the confirmed Supabase staging project. It does not deploy,
push, open a pull request, merge, access production, or authorize Phase 2.

```text
SIWE E2E APPROVED
NO-GO FOR PHASE 2
NO-GO FOR PRODUCTION UNTIL THE SEPARATE DEPENDENCY ADVISORIES ARE REMEDIATED
```

The existing NexusClaw RainbowKit/Wagmi wallet connection was reused. No second
wallet connector or parallel authentication UI was added. The manual wallet and
the three automated role fixtures were referenced only by their staging labels.

## Staging and secret boundary

- The frontend ran locally at exactly `https://localhost:3000`.
- The Supabase URL, publishable key, database connection and project ref were
  cross-checked against the explicit `STAGING_ONLY` confirmation.
- The server runtime received only the public staging configuration and County
  Hunter feature flags. It did not receive the service role, database URL,
  disposable private keys, fixture identifiers or tenant identifiers.
- The real E2E harness refuses a non-local app origin, a mismatched Supabase
  host, an unconfirmed staging environment, invalid fixture bindings or equal
  tenant identifiers.
- Private keys, addresses, SIWE messages, signatures, tokens, cookies, tenant
  identifiers and user identifiers were never printed by the harness.
- The disposable wallets were reused from the ignored staging environment. No
  wallet was generated and no wallet received funds.
- No production endpoint was accessed.

## Manual Admin A browser validation

| Check | Result |
|---|---|
| Existing wallet connection | PASS; the existing NexusClaw connection remained in use |
| SIWE challenge and signature | PASS; real browser signature completed |
| Supabase SSR session | PASS; `Supabase session active` displayed |
| Dashboard authorization | PASS |
| Tenant A bootstrap | PASS; first execution created 6, second execution created 0 |
| County dashboard count | PASS; 6 monitored counties |
| County registry | PASS; 6 tenant A counties |
| Direct authenticated API | PASS; 6 JSON records |
| Response-body token isolation | PASS; no session cookie or token was returned in page/API content |
| Cache policy | PASS; `Cache-Control: private, no-store`, `Pragma: no-cache`, `Expires: 0` |
| Single refresh | PASS; session remained valid |
| Three sequential refreshes | PASS; session and 6-county view remained valid |
| Logout | PASS; County Hunter session removed without disconnecting the global wallet |
| Post-logout refresh | PASS; the previous session was not restored |
| Post-logout API | PASS; `401 Authentication is required` |
| Second login | PASS; a new challenge and successful verification were observed |
| Active-session revocation | PASS; inactive membership immediately blocked Counties and Dashboard |
| Revocation response | PASS; `403` with no active membership |
| Membership restoration | PASS; access returned without reusing stale authorization claims |
| View-only downgrade | PASS; Dashboard read remained available |
| View-only bootstrap | PASS; `403 Missing permission: county_hunter.admin` |
| Final restoration | PASS; Admin A returned to the exact active admin permission set |

The membership revocation and permission downgrade were applied only to the
confirmed Admin A staging membership. The restoration command and exact target
validation existed before either temporary change was made. No temporary
membership state remains.

## Real staging role sessions

The integration harness used the real County Hunter challenge/verify endpoints,
real Web3 Auth, in-memory SSR cookie jars, the real application APIs and real
RLS. It did not manufacture sessions with a service role.

### Viewer A

- Real Web3 login: PASS.
- Read tenant A counties: PASS; exactly 6.
- Source creation: blocked with `403`.
- County update: blocked with `403`.
- Bootstrap: blocked with `403`.
- Logout followed by protected API: PASS; API returned `401`.

### Manager A

- Real Web3 login: PASS.
- Read tenant A counties: PASS; exactly 6.
- Create a temporary source without an official URL: PASS.
- Update the temporary source: PASS.
- Bootstrap: blocked with `403`.
- Read a tenant B county by identifier: blocked with `404`.
- Temporary source cleanup through the real Admin A session: PASS.
- Logout followed by protected API: PASS; API returned `401`.

### Admin B

- Real Web3 login: PASS.
- Bootstrap tenant B: PASS; `6 → 0`.
- Read tenant B counties: PASS; exactly 6.
- Tenant A rows in the tenant B response: none.
- Read a tenant A county by identifier: blocked with `404`.
- Update a tenant A county by identifier: blocked with `404`.
- Logout followed by protected API: PASS; API returned `401`.

The temporary Manager A source was removed. Its URL was always null and it was
never represented as an official source. The tenant B bootstrap is approved
staging data and remains intentionally provisioned.

## SIWE negative matrix

One real Viewer A challenge was used for the complete negative matrix. Failed
proofs did not consume it; the original valid proof consumed it once, and a
final replay was rejected.

| Failure case | Result |
|---|---|
| Incorrect domain | PASS; rejected with `401` |
| URI without the required trailing slash | PASS; rejected with `401` |
| URI with an unauthorized path | PASS; rejected with `401` |
| Chain other than Base chain ID 8453 | PASS; rejected with `401` |
| Expired challenge | PASS; rejected with `401` |
| Signature from a different disposable wallet | PASS; rejected with `401` |
| Invalid signature | PASS; rejected with `401` |
| Valid proof | PASS; session created |
| Replay of the consumed proof | PASS; rejected with `401` |

## Issues found and corrected

### Ambiguous PostgREST relationships

The first real County Registry read failed because both the original foreign
key and the composite tenant foreign key connect counties to states. PostgREST
correctly refused to choose between the two relationships.

The API now uses explicit `relation!foreign_key` selectors and always chooses
the composite tenant constraints for:

- county → state;
- auction → county;
- property → county;
- property → auction.

No migration, constraint, index or data was changed. A regression scans every
County Hunter API route for unqualified embedded relationships and verifies
that each selected constraint exists in the additive foundation migration.

### Supabase URL origin validation

The ignored staging environment previously allowed a Supabase URL containing a
`/rest/v1/` path, which caused duplicated REST paths. The local ignored value
was normalized to the Supabase origin without printing it.

The staging runner now rejects a Supabase URL containing a path, query,
fragment or credentials during `-PreflightOnly` and before remote modes. A
synthetic regression confirms rejection before `psql` can run.

## Files changed in Phase 1.4

- `frontend/app/api/county-hunter/auctions/route.ts`
- `frontend/app/api/county-hunter/auctions/[auctionId]/route.ts`
- `frontend/app/api/county-hunter/counties/route.ts`
- `frontend/app/api/county-hunter/counties/[countyId]/route.ts`
- `frontend/app/api/county-hunter/properties/route.ts`
- `frontend/app/api/county-hunter/properties/[propertyId]/route.ts`
- `frontend/features/county-hunter/server/selects.ts`
- `frontend/scripts/validate-county-hunter-siwe-e2e.mjs`
- `frontend/tests/county-hunter/relationship-selects.test.ts`
- `frontend/tests/county-hunter/staging-siwe-e2e.test.ts`
- `frontend/tests/county-hunter/staging-runner.test.ts`
- `frontend/package.json`
- `scripts/validate-county-hunter-staging.ps1`
- `docs/county-hunter/PHASE1_4.md`

Local development certificates remain untracked and are not part of the
commit.

## Validation gates

| Gate | Result |
|---|---|
| Staging preflight with read-only connectivity | PASS; `READY FOR STAGING VALIDATION` |
| Real staging SIWE/role matrix | PASS; exit 0 |
| Real session cleanup | PASS; all four harness sessions logged out |
| Temporary source cleanup | PASS |
| `npm test` | PASS; 63 tests in 11 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; only pre-existing warnings outside County Hunter |
| `npm run build` | PASS; County Hunter pages and APIs remain dynamic |
| `git diff --check` | Required before the local commit |
| Remote operations | None; no push, PR or merge |

The local Phase 1.4 commit contains only reviewed source, test, runner and
documentation files. Its hash is reported in the final handoff after commit
creation.

## Separate production blocker

Critical advisories in the existing Next.js and wallet dependency graph remain
a separate production blocker. They were not changed in this phase and must be
handled in the dedicated future branch:

```text
security/upgrade-next-wallet-stack
```

Phase 2 must not begin automatically after this approval.
