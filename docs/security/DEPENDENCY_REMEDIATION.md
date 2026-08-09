# Next.js and wallet stack dependency remediation

Snapshot: 2026-07-25, Node 24.11.1, npm 11.6.2.

Base checkpoint: `15d33bfc9453dbd54b6ca6e1150ac7764c9975c4`.

Isolated branch: `security/upgrade-next-wallet-stack`.

## Current decision

**PLAN READY — UPGRADE NOT YET AUTHORIZED.**

No dependency, lockfile, application code, test, contract, chain, provider or
Supabase version has been changed in this branch. The current dependency graph
is a security **NO-GO**: `npm audit --omit=dev --json` exits 1 with 38
package-level findings (4 critical, 16 high, 14 moderate and 4 low).

The audit's automatic suggestion of `next@14.2.35` is incomplete for the July
2026 advisory set. Next.js officially identifies `15.5.21` as the Maintenance
LTS security release. This application uses the App Router, so the upgrade must
also account for React 19 and the async request APIs; React 18 compatibility in
Next.js 15 is documented for the Pages Router, not this application.

## Commands and exact inventory

The following commands were run from `frontend` without modifying dependencies:

```text
npm audit --omit=dev --json
npm outdated
npm ls next wagmi viem @rainbow-me/rainbowkit @coinbase/wallet-sdk postcss @supabase/ssr @supabase/supabase-js
```

| Package | Current | Latest reported | Role in this application |
|---|---:|---:|---|
| `next` | 14.2.3 | 16.2.11 | Direct; App Router, middleware, route handlers, images and SSR |
| `@rainbow-me/rainbowkit` | 2.1.3 | 2.2.11 | Direct; wallet modal and connector UI |
| `wagmi` | 2.12.3 | 3.7.4 | Direct; account, signing, chain switching and contract hooks |
| `viem` | 2.15.1 | 2.55.8 | Direct; RPC, contracts, Base and SIWE |
| `postcss` | 8.4.31 | 8.5.23 | Direct dev dependency and deduplicated production child of Next |
| `@supabase/ssr` | 0.7.0 | 0.12.3 | Direct; browser/server cookies and middleware session refresh |
| `@supabase/supabase-js` | 2.58.0 | 2.110.8 | Direct; Auth, staging provisioning and RLS-backed data |
| `@coinbase/wallet-sdk` | 4.0.4 | 4.3.7 | Transitive through `wagmi` / `@wagmi/connectors` |

`latest` is inventory, not the proposed upgrade target. The proposal deliberately
avoids Next 16 and Wagmi 3.

### Installed vulnerable paths

```text
next@14.2.3 -> postcss@8.4.31
wagmi@2.12.3 -> @wagmi/connectors@5.1.3
  -> @coinbase/wallet-sdk@4.0.4
  -> @metamask/sdk@0.27.0
    -> @metamask/sdk-install-modal-web@0.26.5
      -> react-native@0.84.1
        -> react-devtools-core@6.1.5 -> shell-quote@1.8.3
        -> React Native/Jest CLI tooling -> brace-expansion@1.1.16/2.1.2
viem@2.15.1 -> ws@8.17.1
@supabase/supabase-js@2.58.0
  -> @supabase/realtime-js@2.15.5 -> ws@8.21.1 (not vulnerable)
```

The high/critical entries for Wagmi, connectors, React Native, React DevTools,
Jest/Babel, glob, minimatch and rimraf are propagation from the five independent
wallet-tree advisories documented below. They are not additional independent
GHSAs in this audit.

## Reachability in NexusClaw

- Next.js is directly internet-facing. County Hunter depends on its scoped
  middleware, App Router pages, dynamic route handlers and private/no-store
  responses.
- The Next 15 migration affects one synchronous `cookies()` call, seven dynamic
  route-handler/page parameter contracts and two client dynamic pages. These
  sites must be migrated manually and narrowly.
- The repository has no Server Actions, custom Next server, `rewrites()`
  configuration or Next i18n configuration. Advisories limited to those features
  are presently not reachable, but the selected Next target fixes them anyway.
- The shared wallet configuration explicitly registers MetaMask, Coinbase,
  Trust and WalletConnect on Base (8453). Wagmi/Viem/RainbowKit are used by
  staking, agents, leaderboard, wallet state, contract reads/writes and County
  Hunter SIWE.
- County Hunter and other current Viem clients use HTTP transports. The
  vulnerable `ws` path is nevertheless installed in the production graph and is
  available to shared Viem transports.
- PostCSS runs during build and does not process user-supplied CSS at runtime.
  Its current file-read/path-traversal paths therefore have low runtime
  reachability here but remain a build/supply-chain and secret-disclosure risk.
- The `shell-quote`/React Native/Jest chain is not imported by emitted NexusClaw
  web code. It is installed under the production MetaMask connector graph, so it
  must be removed through a parent upgrade rather than accepted or hidden.

## Critical and high advisory register

Risk notation: **W** wallet, **S** SSR/site, **C** County Hunter.

| Advisory | Package / current / type | Reachable vulnerable surface | Fixed target and breaking changes | Risk and required tests |
|---|---|---|---|---|
| [GHSA-gp8f-8m3g-qvj9](https://github.com/advisories/GHSA-gp8f-8m3g-qvj9) HIGH | `next@14.2.3`, direct | Cache poisoning can affect internet-facing Next responses. | `next@15.5.21`; major upgrade, React 19, async request APIs and changed cache defaults. | W medium, S high, C high. Route/cache tests; all County Hunter no-store headers; navigation and build. |
| [GHSA-7gfc-8cq8-jh5f](https://github.com/advisories/GHSA-7gfc-8cq8-jh5f) HIGH | `next@14.2.3`, direct | Authorization bypass class reaches protected framework routes. | `next@15.5.21`; same framework migration. | W medium, S high, C high. Anonymous/authenticated access, viewer/manager/admin, revocation and cross-tenant tests. |
| [GHSA-mwv6-3258-q52c](https://github.com/advisories/GHSA-mwv6-3258-q52c) HIGH | `next@14.2.3`, direct | App Router/RSC is used on public pages. | `next@15.5.21`; same framework migration. | W low, S high, C medium. Audit/version assertion, App Router smoke tests and bounded malformed-request regression. |
| [GHSA-5j59-xgg2-r9c4](https://github.com/advisories/GHSA-5j59-xgg2-r9c4) HIGH | `next@14.2.3`, direct | Incomplete RSC DoS fix; App Router is active. | `next@15.5.21`; 14.2.35 alone is insufficient for later advisories. | W low, S high, C medium. Same RSC and route-handler gates. |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) HIGH | `next@14.2.3`, direct | RSC request deserialization is internet-facing. | `next@15.5.21`; same framework migration. | W low, S high, C medium. Malformed request rejection, availability smoke and full build. |
| [GHSA-f82v-jwr5-mffw](https://github.com/advisories/GHSA-f82v-jwr5-mffw) CRITICAL | `next@14.2.3`, direct | Directly relevant: County Hunter uses middleware for scoped auth refresh and no-store policy. RLS remains defense in depth, not a waiver. | `next@15.5.21`; middleware behavior must be revalidated. | W medium, S critical, C critical. Bypass probes, missing/inactive membership, roles, RLS isolation, cache headers and real SIWE E2E. |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) HIGH | `next@14.2.3`, direct | App Router/RSC is active. | `next@15.5.21`. | W low, S high, C medium. RSC/route smoke and audit. |
| [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj) HIGH | `next@14.2.3`, direct | App Router/RSC is active. | `next@15.5.21`. | W low, S high, C medium. RSC/route smoke and audit. |
| [GHSA-c4j6-fc7j-m34r](https://github.com/advisories/GHSA-c4j6-fc7j-m34r) HIGH | `next@14.2.3`, direct | No custom WebSocket upgrade handler was found; currently not demonstrated reachable. | `next@15.5.21`. | W low, S medium, C low. Config inspection, normal WebSocket/wallet reconnect and audit. |
| [GHSA-36qx-fr4f-26g5](https://github.com/advisories/GHSA-36qx-fr4f-26g5) HIGH | `next@14.2.3`, direct | Pages Router i18n condition is absent; currently not reachable. | `next@15.5.21`. | W low, S low, C low. Config assertion, routing smoke and audit. |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) HIGH | `next@14.2.3`, direct | No Server Actions were found; currently not reachable. | `next@15.5.21`. | W low, S medium, C low. Source assertion, route tests and audit. |
| [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) HIGH | `next@14.2.3`, direct | Requires Server Actions on a custom server; neither was found. | `next@15.5.21`. | W low, S low, C low. Source/config assertion and audit. |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) HIGH | `next@14.2.3`, direct | No `rewrites()` configuration was found; currently not reachable. | `next@15.5.21`. | W low, S low, C low. Config assertion, redirect/navigation smoke and audit. |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) HIGH | `postcss@8.4.31`, direct dev plus production transitive | Build pipeline is reachable; untrusted runtime CSS processing was not found. | Minimum 8.5.12; proposed `8.5.23`. Same major, but Next 15.5.21 still pins 8.4.31, requiring an explicit verified npm override. | W low, S medium, C low. Clean CSS build, assets, responsive visual smoke, audit and lock-tree assertion that no vulnerable PostCSS remains. |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) HIGH | `postcss@8.4.31`, direct dev plus production transitive | Same build path; arbitrary `.map` disclosure is not accepted in the build graph. | Minimum 8.5.18; proposed `8.5.23` with the same reviewed override. | W low, S medium, C low. Source-map/build inspection, secret-scan, assets and audit. |
| [GHSA-8rgj-285w-qcq4](https://github.com/advisories/GHSA-8rgj-285w-qcq4) HIGH | `@coinbase/wallet-sdk@4.0.4`, transitive | Reachable: Coinbase is explicitly registered in `config/wagmi.ts`. | Minimum 4.3.0; proposed parent `wagmi@2.19.5` -> connectors 6.2.0 -> Coinbase 4.3.6. Connector SDK behavior can change. | W high, S medium, C high. Coinbase extension/mobile, Base switch, reconnect, signing, SIWE and shared on-chain reads/writes. |
| [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p) CRITICAL | `shell-quote@1.8.3`, transitive through MetaMask optional React Native tooling | No web runtime import found; installed production tree is still unacceptable. | Minimum 1.8.4 for this advisory, but 1.8.4 has the next HIGH advisory. Do not override directly; remove the parent chain with connectors 6.2.0 / MetaMask 0.33.1. | W medium supply-chain, S low runtime, C low runtime. Clean tree, bundle absence, MetaMask desktop/mobile, install scripts and audit. |
| [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv) HIGH | `shell-quote@1.8.3`, same transitive path | Same optional production path; not demonstrated in emitted bundles. | Minimum `shell-quote@1.9.0`; proposed resolution is removal of the old parent path, not a leaf override. | W medium supply-chain, S low runtime, C low runtime. Same clean-tree/bundle/connectors gates. |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) HIGH | `brace-expansion@1.1.16/2.1.2`, transitive through installed React Native/Jest/glob paths | No attacker-controlled glob path found in runtime; vulnerable copies are installed in the production wallet graph. | Patched release is 5.0.8. Do not force a cross-major leaf override; remove the React Native/Jest parent chain, then inspect any remaining dev-only copies separately. | W medium supply-chain, S low runtime, C low runtime. `npm ls`, audit, clean install, bundle inspection and wallet connectors. |
| [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) HIGH | `ws@8.17.1`, transitive through direct `viem@2.15.1` | HTTP is configured today, but Viem's production transport graph can reach WebSocket code. | Minimum 8.21.0; proposed `viem@2.55.8` installs 8.21.0. Viem remains on major 2 but types, clients and signing behavior may have changed. | W high, S low, C high. HTTP/WebSocket clients, Base, contracts, SIWE EOA/smart wallet and reconnect. |

## Proposed smallest supported targets

| Group | Proposed pins | Reason |
|---|---|---|
| Build CSS | `postcss@8.5.23` plus reviewed `overrides.postcss=8.5.23` | 8.5.18 is the minimum for both HIGH advisories; 8.5.23 is the current patched 8.x. The override is necessary because Next 15.5.21 declares exact `postcss@8.4.31`. |
| Framework | `next@15.5.21`, `eslint-config-next@15.5.21` | Current Maintenance LTS security line; avoids the larger Next 16 migration. |
| React required by App Router | `react@19.2.8`, `react-dom@19.2.8`, matching `@types` | Next 15 App Router is aligned to React 19. React 19.2.8 is the current patched 19.2 line. |
| Wallet | `wagmi@2.19.5`, `viem@2.55.8` | Same major versions; audit-supported parent upgrades. They resolve connectors 6.2.0, Coinbase 4.3.6, MetaMask 0.33.1 and `ws` 8.21.0. |
| RainbowKit | Keep `2.1.3` initially | Its peer ranges already support Wagmi 2.x, Viem 2.x and React >=18. No current critical/high advisory requires broadening this change. Consider 2.2.11 only if compatibility testing proves it necessary. |
| Supabase | Keep `@supabase/ssr@0.7.0` and `@supabase/supabase-js@2.58.0` initially | Neither is in the high/critical audit path. The current Supabase Realtime `ws@8.21.1` is fixed. Only the local Next cookie call needs async adaptation unless a test proves a package upgrade is required. |

Node 24.11.1 satisfies Next 15.5.21 (`^18.18 || ^19.8 || >=20`).
Wagmi 2.19.5 and RainbowKit 2.1.3 accept React >=18, Viem 2.x and
TanStack Query >=5. Current TypeScript 5.3.3 satisfies Wagmi/Viem >=5.0.4.

## Authorized execution plan

No stage below starts until the plan is explicitly authorized. Each stage is a
separate review point; a failed gate stops the upgrade.

### Stage 0 — baseline and lockfile guard

1. Record package-lock hash and current `npm ls`.
2. Run existing tests, typecheck, lint and production build.
3. Confirm no secret or ignored staging credential is tracked.

### Stage 1 — PostCSS only

1. Pin PostCSS 8.5.23 and add the narrow documented npm override required to
   replace Next's exact vulnerable transitive copy.
2. Inspect the entire lockfile diff; reject unrelated dependency movement.
3. Prove with `npm ls postcss` that no `<=8.5.17` copy remains.
4. Run clean install, tests, typecheck, lint, build, audit, asset/responsiveness
   smoke and wallet modal smoke.

### Stage 2 — Next.js 15.5.21 and React 19

1. Pin Next, eslint-config-next, React, React DOM and matching React types.
2. Manually change only affected APIs: await `cookies()`, convert dynamic
   route/page params to the Next 15 Promise contract, and unwrap client params
   using the supported React 19 pattern.
3. Preserve `force-dynamic`, the scoped middleware matcher and all County Hunter
   `Cache-Control: private, no-store`, `Pragma: no-cache` and `Expires: 0`
   behavior.
4. Do not run a broad codemod. Keep the existing Webpack build and current
   provider architecture.
5. Run the complete stage gates, middleware bypass tests, route/cache tests,
   site navigation/images/assets and a wallet lifecycle smoke.

### Stage 3 — wallet stack

1. Pin Wagmi 2.19.5 and Viem 2.55.8; keep RainbowKit 2.1.3 unless a demonstrated
   compatibility failure requires 2.2.11.
2. Confirm the lock resolves connectors 6.2.0, Coinbase >=4.3.0, MetaMask
   0.33.1, WalletConnect 2.21.1 and `ws` >=8.21.0.
3. Prove the old React Native/React DevTools/`shell-quote` production path is
   absent. Do not hide it with audit exceptions.
4. Preserve one WagmiProvider, one QueryClientProvider, one RainbowKitProvider,
   Base 8453, the existing RPC, contract addresses, ABIs and UX.
5. Run all wallet, contract-read, mocked/testnet-write, staking, leaderboard,
   agents, SIWE and clean-tree gates.

### Stage 4 — Supabase only if proven necessary

Keep current Supabase packages if Next 15, async cookies, refresh, logout and
SIWE pass. If a package-level incompatibility is demonstrated, stop, review the
current Supabase changelog and SSR migration guidance, document a compatible
pair and obtain a separate review before changing either package. Never use a
service role in browser/runtime code.

### Stage 5 — residual transitives

Run a fresh production audit. Resolve remaining reachable high/critical findings
through the nearest compatible parent. Use no blanket `npm audit fix --force`,
no silent audit exclusion and no unreviewed cross-major override.

## Gate after every dependency group

```text
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

Additionally:

- open modal, connect, account switch, Base switch, disconnect, reconnect and
  refresh;
- inspect home, navigation, existing pages, responsive layout, images/assets;
- exercise contract reads and mocked/testnet writes without real funds;
- inspect `npm ls` for the exact target graph;
- run secret scanning and review every lockfile change.

## Final reproducibility and staging gates

After all groups pass:

1. Remove only `frontend/node_modules` and `frontend/.next`, verify the resolved
   paths are inside the frontend workspace, run `npm cache verify`, then
   `npm ci`.
2. Hash `package-lock.json`, run `npm ci` a second time and require the same
   hash and no Git diff.
3. Run all 63+ tests, typecheck, lint, build, production audit, `git diff
   --check`, status and stat.
4. Repeat real staging E2E for Admin A, Viewer A, Manager A and Admin B:
   login, SIWE signature, cookies SSR, refresh, logout, nonce/replay, revocation,
   downgrade, cross-tenant isolation, both bootstrap 6 -> 0 paths and all
   private/no-store headers.
5. Do not access production, use real funds, change contracts/on-chain flows,
   push, open a PR, merge or start Discovery/Phase 2.
6. Only after every gate passes, create the requested local commit:
   `security: upgrade Next.js and wallet dependencies`.

## Approval criteria

`SECURITY UPGRADE APPROVED` is permitted only after:

- no reachable critical advisory remains;
- every remaining high has a documented and verified mitigation;
- the lockfile and two clean `npm ci` runs are reproducible;
- site, wallet, contracts/staking, Supabase SSR and real staging SIWE pass;
- County Hunter roles, revocation, cache policy and tenant isolation pass;
- no secret is exposed; and
- the final local commit is created without push/PR/merge.

Until then the decision remains:

**CONTROLLED WALLET STACK UPGRADE APPROVED — validated locally; no push, PR or
merge performed.**

## Controlled WalletConnect QR pin validation (2026-07-26)

The scoped `cuer -> qr` override resolves `cuer 0.0.3` to `qr 0.5.5`.
The package tarball matched the registry integrity, its isolated production
audit reported zero findings, and the application production audit contains no
finding attributed to `qr` or `cuer`. The application audit remains at the
pre-pin baseline: 13 findings (10 moderate, 3 high, 0 critical).

The three high findings remain unresolved:

- `axios 1.16.0` is a runtime transitive reached through
  `@wagmi/connectors -> @base-org/account -> @coinbase/cdp-sdk`. Application
  source does not import the Axios library directly, but the optional Base
  account connector keeps this path present in the wallet runtime. The
  advisories target form serialization, proxy/config inheritance, streaming
  upload and prototype-pollution behavior. The repository does not directly
  invoke those APIs, but that observation is not treated as a remediation.
- `sharp 0.34.5` is an optional runtime dependency of Next.js and is reachable
  through the server-side image optimizer because the application uses
  `next/image`. The advisory concerns inherited libvips vulnerabilities. The
  current optimized image is a trusted local asset, which reduces exposure to
  attacker-controlled image input but does not resolve the package finding.
- `next 15.5.21` is marked high by npm because its dependency graph includes
  the affected `sharp` range; this is not a separate application-level finding
  in the current audit payload. Its reachability and residual risk follow the
  `sharp` path above. The audit-proposed Next downgrade is not an acceptable
  automatic fix.

No audit exception, forced fix or claim of resolution has been added for these
findings.

## Phase 2 release-gate reassessment (2026-07-27)

`npm audit --omit=dev --json` still reports 13 production findings: 0 critical,
3 high and 10 moderate. No dependency was changed during this reassessment.

### Axios / Coinbase wallet path

- Advisory: `GHSA-gcfj-64vw-6mp9`, Axios Node HTTP adapter inherited proxy.
- Installed: `axios@1.16.0`.
- Complete installed path:
  `wagmi@2.19.5 -> @wagmi/connectors@6.2.0 ->
  @base-org/account@2.4.0 -> @coinbase/cdp-sdk@1.54.0 ->
  axios@1.16.0`.
- Direct NexusClaw dependency responsible: `wagmi@2.19.5`.
- Patched Axios: `1.18.0`; current stable checked: `1.18.1`.
- Upstream constraint: the latest published `@coinbase/cdp-sdk@1.54.0` still
  pins Axios exactly to `1.16.0`. Updating `@base-org/account` does not remove
  that current CDP pin.
- NexusClaw reachability: `config/wagmi.ts` explicitly registers the Coinbase
  connector. The path is loaded in the client wallet runtime; NexusClaw does
  not import Axios, create Axios interceptors or execute its Node HTTP adapter.
- Plausible exploitation: the high advisory requires Node HTTP-adapter use,
  prototype pollution and a request interceptor that returns a regular cloned
  config. That combination is not present in the web connector path. Browser
  impact is not established by the advisory.
- Existing mitigation: browser-only connector use, HTTPS wallet services, no
  NexusClaw-controlled Axios requests/configuration and no wallet secrets in
  server Axios calls.
- Smallest safe update: an upstream CDP release that declares Axios `>=1.18.0`,
  followed by a compatible parent wallet patch. A global or scoped leaf
  override is not accepted while CDP intentionally pins an exact older version.

### Sharp / Next image path

- Advisory: `GHSA-f88m-g3jw-g9cj`, vulnerable libvips inherited by Sharp.
- Installed: `sharp@0.34.5`.
- Complete installed path: `next@15.5.21 -> sharp@0.34.5` (optional runtime
  dependency).
- Direct NexusClaw dependency responsible: `next@15.5.21`.
- Patched Sharp: `0.35.0`; current stable checked: `0.35.3`.
- Patch compatibility: `next@15.5.22` is published and remains React 19
  compatible, but still declares `sharp@^0.34.3`; it does not remediate the
  advisory. Forcing Sharp 0.35 across this incompatible declared range was not
  accepted.
- NexusClaw reachability: `app/HomeContent.tsx` and
  `features/county-hunter/components/CountyHunterShell.tsx` use `next/image`.
  Sharp can therefore be loaded by the server-side image optimizer and during
  production image handling.
- Plausible exploitation: the advisory affects decoding untrusted image input.
  NexusClaw has no remote image patterns and the current `next/image` inputs are
  trusted files under `public/`, which materially reduces exposure. The package
  remains reachable and the finding is not considered resolved.
- Existing mitigation: no remote image allowlist, no user upload/image
  transformation endpoint and fixed local image sources.
- Smallest safe update: a stable Next release within an approved framework
  migration that officially supports Sharp `>=0.35.0`. No compatible Next 15
  patch was published at the time of this review.

### Next propagation

- Installed: `next@15.5.21`, direct.
- `npm audit` marks Next high because it effects/contains the vulnerable Sharp
  path. The current payload does not identify a separate new Next vulnerability.
- Runtime and reachability follow the server/build-time image optimizer
  analysis above.
- `npm audit` suggests `next@14.2.35`, a semver-major downgrade from the
  installed line that would undo the approved Next 15/React 19 migration and
  does not provide an acceptable remediation for the current Sharp requirement.

### Release decision for these residual highs

The Axios high is installed but its vulnerable Node-only path is not reached by
NexusClaw. The Sharp/Next high is reachable with trusted local inputs and has no
compatible stable patch in the approved Next 15 line. These classifications
permit continued development and staging validation but do **not** authorize
production. Production remains blocked until the reachable Sharp path is
removed or upgraded through a supported Next release and a fresh wallet audit
confirms the Axios path is patched or still demonstrably unreachable.

## Primary references

- Next.js July 2026 security release and support policy:
  <https://nextjs.org/blog> and <https://nextjs.org/support-policy>
- Next.js 15 upgrade guide:
  <https://nextjs.org/docs/app/guides/upgrading/version-15>
- Next.js 15 App Router / React 19 and cache changes:
  <https://nextjs.org/blog/next-15>
- React 19 upgrade guide:
  <https://react.dev/blog/2024/04/25/react-19-upgrade-guide>
- RainbowKit migration and chain guidance:
  <https://rainbowkit.com/docs/migration-guide> and
  <https://rainbowkit.com/docs/chains>
- Viem migration and supply-chain guidance:
  <https://viem.sh/docs/migration-guide> and
  <https://viem.sh/docs/installation>
- Supabase current Next.js SSR guidance:
  <https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs>

## Production security-gate remediation (2026-07-27)

This section supersedes the unresolved Phase 2 reassessment above for the
current `security/county-hunter-production-gate` branch.

- `next@15.5.21 -> sharp@0.34.5` is now resolved through the strict
  `overrides.next.sharp=0.35.3` edge. The installed runtime is Sharp 0.35.3
  with libvips 8.18.3. Build, `next start`, Home and a real local
  `/_next/image` optimization request passed.
- `@coinbase/cdp-sdk@1.54.0 -> axios@1.16.0` is now resolved through the
  strict `overrides["@coinbase/cdp-sdk"].axios=1.18.1` edge. No Axios
  1.16.0 copy remains, and Axios Retry deduplicates to 1.18.1.
- Next, React, RainbowKit, Wagmi, Viem, WalletConnect and the `cuer -> qr`
  pin were not changed.
- The production audit moved from 0 critical / 3 high / 10 moderate to
  0 critical / 0 high / 9 moderate.
- No audit exception, global override, forced install, legacy peer mode,
  canary, beta or RC package was used.
- Two clean npm 10.9.4 installs reproduced the same lockfile, and the final
  dependency tree contained no invalid or extraneous package.
- The final staging wallet, SIWE, tenant-isolation, valid-RPC and controlled
  unavailable-RPC smokes passed on 2026-07-28 without a funded wallet or
  transaction.

The complete advisory register, reachability proof, rollback rehearsal and
dependency-recovery procedure are in
`docs/security/PHASE2_PRODUCTION_GATE.md`.

## Vercel first-deploy audit refresh (2026-08-09)

- A newly published high-severity `nanoid <3.3.17` availability advisory was
  detected through the existing `postcss@8.5.23 -> nanoid@^3.3.16` edge.
- The lockfile now resolves that already-compatible range to `nanoid@3.3.18`.
  `nanoid` was not added as a direct dependency and no Next, React, wallet,
  Supabase, PostCSS, or major package version changed.
- No `--force`, legacy peer mode, or audit auto-fix was used. The expected gate
  returns to 0 critical / 0 high; the existing nine moderate wallet advisories
  remain governed by the approved risk register.

## Wallet bundle runtime risk register (2026-08-07)

The production bundle contains local-development and URL-validation tokens
owned by pinned third-party packages. They are not NexusClaw configuration,
metadata, or endpoints:

- Reown AppKit 1.8.19: development ancestor defaults and origin checks;
- WalletConnect JSON-RPC Utils 1.0.8: WebSocket URL validation;
- RainbowKit 2.2.11: local development-chain metadata;
- Engine.IO Client 6.6.6 through MetaMask SDK 0.33.1: browser fallback and
  offline handling;
- Next 15.5.21: URL parser compatibility behavior.

NexusClaw passes validated `NEXT_PUBLIC_APP_ORIGIN` explicitly as WalletConnect
metadata and disables WalletConnect in production when origin or Project ID
validation fails. The bundle gate rejects unclassified local tokens and every
application-owned local, test, or staging URL. The first real-domain deployment
must run the browser network harness while opening RainbowKit and the QR flow;
it records only transport/count/decision metadata and fails on local, loopback,
test, or staging destinations.

No local request was inferred from the literals during static inspection, but
the real-domain network result remains required before production activation.
Review this acceptance on every wallet-stack update. A major dependency update
will not be undertaken only to remove strings that are neither selected nor
used as network destinations.
