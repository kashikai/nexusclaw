# County Hunter Phase 2 production security gate

Date: 2026-07-27.

Production remains disabled. This gate validates a release candidate and does
not authorize a deployment, push, pull request or merge.

## Checkpoint and recovery

The branch `security/county-hunter-production-gate` was created at the approved
documentation commit:

`ea5f3f24dd9937e4f1b351d7541ba3af49f39fef`

Its approved Phase 2 ancestors are:

- `c599eeecb4e9ceaaca3b3aa6ae11f0ea41907274` — snapshot replay;
- `8898d25699e2fbabb686d3b8bb9a0ef7dd4098db` — tests, RLS and rollback;
- `ea5f3f24dd9937e4f1b351d7541ba3af49f39fef` — release documentation.

The local annotated tag `county-hunter-phase2-release-gate-approved` points to
that exact commit. The complete verified recovery bundle is outside the
repository at:

`C:\dev\backups\nexusclaw-phase2-release-gate.bundle`

## Dependency tree before and after

Before remediation:

```text
next@15.5.21
└─ sharp@0.34.5

wagmi@2.19.5
└─ @wagmi/connectors@6.2.0
   └─ @base-org/account@2.4.0
      └─ @coinbase/cdp-sdk@1.54.0
         ├─ axios@1.16.0
         └─ axios-retry@4.5.0
            └─ axios@1.16.0
```

After remediation:

```text
next@15.5.21
└─ sharp@0.35.3 (scoped override under Next)

wagmi@2.19.5
└─ @wagmi/connectors@6.2.0
   └─ @base-org/account@2.4.0
      └─ @coinbase/cdp-sdk@1.54.0
         ├─ axios@1.18.1 (scoped override under CDP)
         └─ axios-retry@4.5.0
            └─ axios@1.18.1 deduped
```

No global Sharp or Axios override is used. The approved stack remains:

- Next 15.5.21;
- React and ReactDOM 19.2.8;
- RainbowKit 2.2.11;
- Wagmi 2.19.5;
- Viem 2.55.8;
- `@walletconnect/ethereum-provider` 2.23.10 only under
  `@wagmi/connectors`;
- `cuer` 0.0.3 with `qr` 0.5.5 only under `cuer`.

The installation used neither `--force` nor `--legacy-peer-deps`. npm 10.9.4
reports the complete reviewed tree with exit code zero and no `invalid` or
`extraneous` node. npm 11.6.2 emits incorrect peer-classification warnings for
the compatible pairs ReactDOM 19.2.8/Next 15.5.21 and Viem 2.55.8/x402; direct
SemVer checks and npm 10 both confirm that the declared ranges are satisfied.

## Advisory register

The baseline production audit contained 13 package-level findings: 0 critical,
3 high and 10 moderate. The three high package entries were Axios, Sharp and
Next through Sharp.

### Sharp and Next

| Advisory | Affected | Selected fix | Reachability |
|---|---|---|---|
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | Sharp `<0.35.0`; installed 0.34.5 | Sharp 0.35.3 / libvips 8.18.3 | Reachable in the Next image optimizer. Inputs are repository-controlled local PNG files; no upload, remote image pattern, GIF, TIFF or VIPS input exists. |

Next was a high package entry only because it contained the vulnerable optional
Sharp dependency. The audit payload did not identify a separate Next advisory.
The scoped Next override is necessary because Next 15.5.21 declares
`sharp@^0.34.3`. Compatibility was proven with a clean install, typecheck,
lint, production build, `next start`, Home HTTP 200 and a real
`/_next/image` HTTP 200 response.

### Axios

Axios 1.16.0 was affected by the following aggregated high advisories. Axios
1.18.0 is the first version outside the affected aggregate range; 1.18.1 is the
stable version selected for this gate.

| Advisory | Vulnerable condition |
|---|---|
| [GHSA-42h9-826w-cgv3](https://github.com/advisories/GHSA-42h9-826w-cgv3) | Excessive recursion while converting attacker-controlled FormData keys to JSON. |
| [GHSA-xj6q-8x83-jv6g](https://github.com/advisories/GHSA-xj6q-8x83-jv6g) | Prototype pollution through nested authentication fields. |
| [GHSA-pmv8-rq9r-6j72](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) | Deep form-to-JSON recursion. |
| [GHSA-jqh4-m9w3-8hp9](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) | Fetch `ReadableStream` upload bypass of `maxBodyLength`. |
| [GHSA-mmx7-hfxf-jppx](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) | Prototype-pollution gadgets in request construction. |
| [GHSA-f4gw-2p7v-4548](https://github.com/advisories/GHSA-f4gw-2p7v-4548) | `NO_PROXY` loopback bypass. |
| [GHSA-gcfj-64vw-6mp9](https://github.com/advisories/GHSA-gcfj-64vw-6mp9) | Inherited proxy configuration after interceptor cloning. |
| [GHSA-hcpx-6fm6-wx23](https://github.com/advisories/GHSA-hcpx-6fm6-wx23) | Form serializer depth-limit bypass. |
| [GHSA-7q8q-rj6j-mhjq](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) | Nested option-object prototype pollution. |
| [GHSA-mwf2-3pr3-8698](https://github.com/advisories/GHSA-mwf2-3pr3-8698) | HTTP/2 streamed upload bypass of `maxBodyLength`. |

The only installed Axios consumer is the Coinbase CDP SDK within the browser
wallet connector. NexusClaw source does not import Axios, create an Axios
instance, accept an Axios URL, copy user JSON into Axios headers/configuration,
configure a proxy or use the Node upload adapters. Those facts reduced the
baseline exploitability but did not waive the finding. The strict override
under `@coinbase/cdp-sdk` removes the vulnerable version from every installed
path while preserving the reviewed wallet parents.

## Final audit

The remediated production audit reports:

```text
0 critical
0 high
9 moderate
0 low
```

The nine package-level moderate findings are within the existing
Wagmi/connector/MetaMask `uuid` chain. npm proposes Wagmi 3.7.4, a major
wallet-stack migration outside this gate. No critical or high advisory remains
installed or reachable, and no advisory is suppressed.

### Moderate advisory register for pilot preparation

The 2026-07-28 pilot-preparation audit still reports one underlying moderate
advisory, propagated as nine package-level entries:

| Package-level entry | Relationship to the finding |
|---|---|
| `uuid` | Direct affected transitive package |
| `@metamask/utils` | Depends on the affected UUID path |
| `@metamask/rpc-errors` | Propagates through MetaMask utilities |
| `@metamask/sdk-communication-layer` | Propagates through MetaMask utilities |
| `@metamask/sdk` | Installed connector parent |
| `@gemini-wallet/core` | Installed wallet connector path |
| `@wagmi/connectors` | Connector parent containing the wallet paths |
| `wagmi` | Direct NexusClaw wallet dependency |
| `@rainbow-me/rainbowkit` | Direct modal dependency over Wagmi |

The underlying entry is
[`GHSA-w5hq-g745-h8pq`](https://github.com/advisories/GHSA-w5hq-g745-h8pq):
UUID v3/v5/v6 lacks a buffer-bound check when a caller supplies `buf`. NexusClaw
does not directly call those UUID APIs with a caller-provided buffer. This
reachability observation is not a suppression or a claim that the installed
package is fixed.

The npm-proposed automatic resolution upgrades Wagmi to 3.7.4, a major wallet
architecture change. It must not be applied with `npm audit fix --force`, a
leaf override, or an audit exclusion. Remediation requires a separately
approved parent wallet-stack upgrade, followed by MetaMask, Gemini,
WalletConnect, Coinbase, SIWE, Base 8453, React-provider, build, clean-install,
and manual connector smokes. Until then the nine moderate package entries are
accepted only as a documented residual for preparation; they do not authorize
production enablement.

## Destructive rollback rehearsal

The real rehearsal used official PostgreSQL 17.10 portable binaries with the
archive SHA-256:

`EF9B1E5E23D2E8A83914BA13D9DC536A72210FBA53FD1808FF1F7E06BB22B106`

The cluster listened only on loopback port 55439. The runner refuses a
non-loopback host and refuses a database name not beginning with
`county_hunter_disposable_`. No staging or production URL, project, service
role or password is read.

`scripts/validate-county-hunter-phase2-rollback.ps1` completed:

1. empty disposable database and minimal Supabase Auth-compatible prelude;
2. all five Phase 1 migrations;
3. tenants A/B, four Auth profiles and active memberships;
4. bootstrap A `6 -> 0` and B `6 -> 0`;
5. all three Phase 2 migrations;
6. the complete two-tenant/four-user RLS matrix;
7. a sanitized 25-record Discovery run;
8. a replay with 25 unchanged records;
9. a custom-format `pg_dump`, verified with `pg_restore --list`;
10. the guarded destructive Phase 2 rollback;
11. post-rollback object/grant/RLS/Phase 1 assertions;
12. all three Phase 2 migrations reapplied;
13. the complete RLS matrix repeated;
14. Discovery 25 and replay 25 unchanged repeated;
15. automatic removal of the disposable database.

The rollback failed closed when its explicit session confirmation was absent
and did not use `CASCADE`.

### Data intentionally destroyed

- Phase 2 discovery runs and replay lineage;
- raw snapshot bodies and response metadata;
- parsed discovery records;
- discovery changes/diffs;
- discovery locks;
- adapter-managed Gwinnett source rows;
- Phase 2 auction/property provenance columns and values.

Phase 1 states, counties, memberships, Auth challenges, bootstrap RPC, RLS,
policies and audit logs remain. The Gwinnett county registry row is also
preserved; only the adapter-managed source and Phase 2 provenance are removed.

## Evidence and residual gates

Automated evidence at this checkpoint:

- 106 tests passed; the opt-in live-source test remained skipped;
- typecheck passed;
- lint passed with only the documented pre-existing warnings;
- Next production build passed;
- `next start`, Home and local `next/image` passed;
- destructive rollback and reapply passed;
- production audit has no critical/high finding;
- two clean installs with npm 10.9.4 produced the same lockfile SHA-256,
  `E585BCDAF2C35F980E71DD5DBC9647497BAF0FF681B9EDBCFF3C5533A6E6C099`,
  and `npm ls` reported no invalid or extraneous package.

Human staging evidence completed on 2026-07-28:

- RainbowKit opened once, WalletConnect rendered a mobile-readable QR code,
  MetaMask connected, disconnected and reconnected, and Base chain 8453
  remained selected;
- Admin A completed SIWE, normal Discovery returned 25 records, the second run
  returned 25 unchanged and replay returned 25 unchanged;
- Viewer A remained read-only, Manager A could not run Discovery or replay,
  and Admin B remained isolated from tenant A;
- logout and a subsequent disposable-wallet SIWE login passed;
- with the valid public RPC, Home and on-chain metrics loaded;
- with a controlled unavailable loopback RPC, Home and navigation remained
  usable, affected metrics displayed `Temporarily unavailable`, no failed
  metric became a false zero and no RPC or refresh loop occurred;
- no funded wallet or transaction was used.

The production security gate is approved, but production remains disabled.
Deployment still requires a separate explicit authorization; this gate does
not authorize push, pull request, merge or deployment.

## Dependency rollback

If either scoped override regresses runtime behavior:

1. stop the frontend;
2. remove only the two scoped entries from `frontend/package.json`;
3. regenerate the lockfile with the configured registry and a clean `npm ci`;
4. restore the approved source checkpoint from the annotated tag or verified
   bundle if broader recovery is needed;
5. rerun audit, application gates and wallet smokes;
6. keep production disabled because the prior Sharp/Axios highs return.

Do not downgrade Next, change React, use a global override or patch
`node_modules`.
