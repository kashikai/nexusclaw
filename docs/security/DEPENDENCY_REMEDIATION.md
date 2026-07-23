# Dependency remediation report

Snapshot: 2026-07-23, clean local clone at `C:\dev\nexusclaw`, Node 24.11.1,
npm 11.6.2, after a successful normal `npm ci` and its unchanged
`postinstall: npm dedupe`.

## Decision

`npm audit --omit=dev --json` exited 1 and reported 27 package-level findings:
4 critical, 4 high, 15 moderate and 4 low across 692 production dependencies.
The direct production findings in Next.js and the wallet stack are reachable and
have no approved mitigation in this branch. They block production and Phase 2.

No `npm audit fix`, forced resolution, transitive override or broad framework,
wallet, Viem, RainbowKit or PostCSS upgrade was applied. Those changes require
separate remediation branches and regression coverage for existing NexusClaw
flows.

The enabled production build was also scanned: emitted server/browser JavaScript
contains neither `shell-quote` nor `react-devtools-core`. The direct versions of
Next, RainbowKit, Wagmi, connectors, Coinbase, MetaMask, WalletConnect and Viem
are identical to `HEAD`. Adding the reviewed Supabase and local test tooling
caused npm to re-resolve 26 existing compatible transitive package paths,
including nested `ws` and `lru-cache` copies in the wallet graph. Three redundant
paths were deduplicated. This is not a direct wallet/provider upgrade, but it
still requires the wallet regression matrix before release.

## Critical and high triage

| Affected package | Direct or transitive | Vulnerable code reachable? | Used by County Hunter? | Used in production? | Fixed version / resolution | Breaking change | Tests required | Decision |
|---|---|---|---|---|---|---|---|---|
| `next@14.2.3` | Direct | Yes. App Router, middleware, RSC responses and server routes are internet-facing. The current advisory set includes authorization, cache, SSRF and DoS classes. | Yes: separate pages, API routes and auth middleware. | Yes | Move to a supported patched line: `15.5.21` (Maintenance LTS) or `16.2.11` (Active LTS). The audit suggestion `14.2.35` does not cover the July 2026 advisory set. | Yes, major framework/React/runtime migration from 14.x. | Full app routes, middleware bypass cases, SSR cache headers, images, server actions, existing agents, wallet flows, County Hunter auth and build. | **Block; correct in a separate Next.js branch.** |
| `shell-quote@1.8.3` | Transitive: Wagmi → connectors → MetaMask SDK → optional React Native → React DevTools | Not demonstrated in the web runtime; it belongs to the optional React Native development path. It remains installed in the production dependency tree. | No direct import. | Installed as production transitive dependency | `shell-quote@1.10.0` is current; remediate through the parent connector graph, not an unverified override. | Parent upgrade can change wallet connectors. | Prove absence from browser/server bundles, then test MetaMask injected/mobile connection and rejected signatures after parent upgrade. | Accept temporarily as unreachable optional code, but it does not override the wallet-stack blocker. |
| `react-devtools-core@6.1.5` | Transitive through the same optional React Native path | Not demonstrated in the web bundle; vulnerability is inherited from `shell-quote`. | No direct import. | Installed as production transitive dependency | Select a MetaMask/Wagmi parent version whose production tree no longer contains the vulnerable chain. | Likely connector behavior changes. | Bundle inspection plus MetaMask and React hydration/build regression. | Accept temporarily as unreachable optional code; parent remediation remains required. |
| `react-native@0.84.1` | Transitive/peer-optional under `@metamask/sdk@0.27.0` | React Native runtime is not used by this Next.js web application, but npm 11 installs it in the production tree. | No. | Installed but not intended to execute in the web deployment | Resolve through the connector upgrade and verify this peer-optional tree is absent or clean. | Likely parent connector changes. | Clean install, production bundle inspection, MetaMask desktop/mobile, lint/type/build. | Accept temporarily as non-web code; wallet parent remains blocked. |
| `@coinbase/wallet-sdk@4.0.4` | Transitive through direct `wagmi@2.12.3` / `@wagmi/connectors@5.1.3` | Yes. Coinbase is explicitly registered in `frontend/config/wagmi.ts`. | Indirectly: County Hunter uses the shared wallet connection and signing UI. | Yes | `>=4.3.0`; registry current is `4.3.7`. Audit proposes parent `wagmi@2.19.5`. | Connector/provider behavior can change even without a semver-major Wagmi bump. | Coinbase extension/mobile, Base chain switching, reconnect, SIWE signature, existing staking/on-chain flows. | **Block; correct in a separate wallet branch.** |
| `@wagmi/connectors@5.1.3` | Transitive child of direct Wagmi | Yes. MetaMask, Coinbase, Trust and WalletConnect are explicitly configured. | Yes, through shared wallet connect/sign. | Yes | Upgrade through a compatible Wagmi line; audit proposes `wagmi@2.19.5`. Current connector release must be selected and locked in the remediation branch. | High integration risk across connector SDKs. | Every configured wallet, Base switching, reconnect, message signing, smart wallet, staking and County Hunter SIWE. | **Block; separate wallet branch.** |
| `wagmi@2.12.3` | Direct | Yes. It drives account state and `useSignMessage`; the affected connector graph is active. | Yes. | Yes | Audit proposes `2.19.5`; current latest is a major `3.7.4`, which is not suitable for an unreviewed upgrade. | Even the non-major target can change transitive connector behavior. | Existing wallet/on-chain regression plus County Hunter connect, sign, refresh and logout. | **Block; separate wallet branch.** |
| `ws@8.17.1` | Transitive through direct `viem@2.15.1`; other `7.5.13` and `8.21.1` copies are not the reported vulnerable node | Potentially reachable when a WebSocket transport is selected. County Hunter currently constructs an HTTP Viem transport, but the shared production wallet graph includes Viem transports. | Installed for direct Viem; County Hunter uses Viem for SIWE verification but its route selects HTTP. | Yes | `ws>=8.21.0`; audit proposes `viem@2.55.8`, whose current resolved graph must be verified. | Viem upgrade can affect signatures, clients, chain types and contracts. | SIWE EOA/smart wallet verification, Base RPC, all contract calls, WebSocket reconnect and build. | **Block until a separate Viem/wallet branch clears the production audit.** |

## Moderate and low findings

The remaining 19 package-level findings are retained in the audit output and are
not silently treated as fixed. They include PostCSS/Next and wallet-provider
transitives. Their parent upgrades overlap the two blocking branches above.
PostCSS must be upgraded only in its own reviewed build/styling change, with
visual and production-build validation.

## Required future remediation branch

The recommended integration branch is:

```text
security/upgrade-next-wallet-stack
```

Create it only after review of the County Hunter checkpoint and from the
appropriate reviewed base. Do not create it as part of Phase 1.3A.

Its planned scope includes Next.js, Wagmi, Viem, RainbowKit, Coinbase wallet
dependencies and PostCSS. Keep framework, wallet and styling changes in
reviewable commits within that branch. The required regression matrix includes
all wallet connectors, SIWE, SSR/cache behavior, production build, existing
contract reads and writes, staking, wallet reconnection and the complete
NexusClaw application.

Every remediation branch must finish with a new clean `npm ci`,
`npm audit --omit=dev --json`, tests, typecheck, lint and production build. No
production activation is permitted while a direct reachable critical/high
finding remains.
