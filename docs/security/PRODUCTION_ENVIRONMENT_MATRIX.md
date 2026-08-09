# County Hunter production environment matrix

Status: field inventory and validation contract only. Values below are
placeholders; no production credential or endpoint has been created.

Production and staging require separate projects, credentials, databases,
Storage, WalletConnect/Reown projects, RPCs, origins, logs, sessions, backups,
and access policies. Every staging/test variable is prohibited in the deployed
production runtime.

## Variables loaded by the application

| Variable | Classification | Required condition | Browser exposure | Production rule |
|---|---|---|---|---|
| `COUNTY_HUNTER_ENABLED` | `PRIVATE_SERVER_RUNTIME` | Always; defaults false | Prohibited | Exact `true` or `false`; enabling invokes full production validation. |
| `COUNTY_HUNTER_DISCOVERY_ENABLED` | `PRIVATE_SERVER_RUNTIME` | Always; defaults false | Prohibited | Cannot be true when the module is false; enable only during an approved manual collection window. |
| `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED` | `PUBLIC_BROWSER` | Always; defaults false | Expected | Navigation/appearance only; never grants access. |
| `COUNTY_HUNTER_PRODUCTION_CONFIRM` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Exact production-pilot confirmation; not a secret and not reusable for staging. |
| `COUNTY_HUNTER_PRODUCTION_PROJECT_REF` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Exactly 20 lowercase alphanumeric characters; must match the dedicated County Hunter Supabase URL. |
| `NEXT_PUBLIC_APP_ORIGIN` | `PUBLIC_BROWSER` | First deployment and later runtime | Expected | Exact `https://county-hunter.nexusclaw.tech`; no local/staging host, query, fragment, credential, or placeholder. |
| `COUNTY_HUNTER_AUTH_ORIGIN` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Must equal the public origin; fixed input to SIWE, never derived from `Host`. |
| `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL` | `PUBLIC_BROWSER` | When module is enabled | Expected | Exact isolated County Hunter production project URL; no generic, staging, local, or placeholder fallback. |
| `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY` | `PUBLIC_BROWSER` | When module is enabled | Expected | Isolated project publishable key only; service-role/secret keys are rejected. |
| `COUNTY_HUNTER_SUPABASE_SECRET_KEY` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Dedicated `sb_secret_` key used only by server-only SIWE challenge and distributed rate-limit RPC clients; never imported by Client Components. |
| `COUNTY_HUNTER_RATE_LIMIT_BACKEND` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Must be exactly `postgres` in production. `memory` is limited to local/unit-test use. |
| `COUNTY_HUNTER_RATE_LIMIT_SECRET` | `PRIVATE_SERVER_RUNTIME` | When module is enabled | Prohibited | Independent random HMAC secret encoded as at least 32 bytes in hex, standard base64, or base64url; must not reuse a Supabase, database, wallet, RPC, or WalletConnect credential. |
| `NEXT_PUBLIC_SUPABASE_URL` | `PUBLIC_BROWSER` legacy | Only if agents, signal-agent, or another legacy flow uses it | Expected when used | Generic NexusClaw project only. County Hunter cannot fall back to it in production. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLIC_BROWSER` legacy | Only if a legacy flow uses it | Expected when used | Generic NexusClaw publishable key only; independent from County Hunter. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `PUBLIC_BROWSER` legacy | Only if agents, signal-agent, or another legacy flow uses it | Expected when used | Generic NexusClaw anon key. Never use a service role. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | client-public | When module is enabled | Expected | Dedicated production client ID, provider-restricted to the exact origin; 32 hexadecimal characters and no placeholder. |
| `NEXT_PUBLIC_BASE_RPC_URL` | client-public | When module is enabled | Expected | Client-safe dedicated production HTTPS endpoint; no embedded credentials, query, fragment, local or staging host. |
| `COUNTY_HUNTER_BASE_RPC_URL` | server-only | When module is enabled | Prohibited | Dedicated production HTTPS RPC for SIWE verification; may use a deployment secret reference, never a client import. |
| `NODE_ENV` | runtime | Production build/start | Framework-visible | Must be `production` for the production gate. |

`frontend/.env.production.example` lists the same fields with markers and all
feature flags false. It must not be renamed into or used as a deployed secret
file.

## Deployment-only and offline administration

These values may be needed by a migration, backup, restore, or invite workflow,
but are prohibited in the deployed frontend process:

| Variable/value class | Classification | Allowed location |
|---|---|---|
| `COUNTY_HUNTER_PRODUCTION_DB_URL` | `MIGRATION_ONLY` | Approved migration/backup runner only; never the Next.js process |
| `SUPABASE_SECRET_KEY` | `FORBIDDEN_IN_PRODUCTION` | Deprecated staging compatibility only |
| `SUPABASE_SERVICE_ROLE_KEY` | `FORBIDDEN_IN_PRODUCTION` | Nowhere in the production application or browser |
| Production database password | `MIGRATION_ONLY` | Approved migration/backup runner secret store only |
| Database password | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Approved secret manager/tool input only |
| Backup encryption key | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Backup platform/HSM only |
| Deployment provider token | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Deployment platform secret store only |
| DNS/TLS provider credential | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Provider secret store only |

The runtime validator permits `COUNTY_HUNTER_SUPABASE_SECRET_KEY` only as the
server-only administrative credential required by the enabled module. It also
requires the PostgreSQL rate-limit backend and an independent, non-public
rate-limit HMAC secret of at least 32 decoded bytes. It
rejects non-empty `SUPABASE_SERVICE_ROLE_KEY`, generic `SUPABASE_SECRET_KEY`,
`DATABASE_URL`, `COUNTY_HUNTER_PRODUCTION_DB_URL`, `POSTGRES_PASSWORD`, all
`COUNTY_HUNTER_STAGING_*`, and all `COUNTY_HUNTER_TEST_*` values. It also scans
every `NEXT_PUBLIC_*` value and rejects new secret keys or legacy
`service_role` JWTs.

## Fail-fast rules

When `NODE_ENV=production`, root application and County Hunter request
evaluation always rejects forbidden administrative/staging/test variables,
requires the exact production app origin, exact boolean values for all three
feature flags, and the existing public agents/wallet/RPC configuration. When
`COUNTY_HUNTER_ENABLED=true`, the full County Hunter validation additionally
fails safely without echoing values if:

- the explicit production confirmation is absent;
- either canonical origin is absent, placeholder, HTTP, local, staging,
  credential-bearing, or contains a path/query/fragment;
- application and Auth origins differ;
- the production Supabase ref is malformed or differs from the isolated County
  Hunter Supabase URL;
- the Supabase URL is not the dedicated `*.supabase.co` project origin;
- the County Hunter publishable key is absent, malformed, placeholder, a new
  secret key, or a legacy JWT with role `service_role`;
- the namespaced County Hunter server secret is absent, malformed, or replaced
  by either generic/legacy administrative variable;
- the rate-limit backend is absent or not exactly `postgres`;
- the rate-limit HMAC secret is absent, malformed, placeholder-like, public,
  too short, or reused from another configured credential;
- the production module would need to fall back to the generic agents or
  signal-agent Supabase project;
- the WalletConnect Project ID is missing, malformed, repeated, or a
  placeholder;
- either Base RPC is missing, non-HTTPS, local, staging, invalid, or a
  placeholder; the browser RPC also rejects query/fragment credentials;
- any staging/test/admin/database credential appears in the application
  runtime;
- Discovery is enabled while the module is disabled;
- a boolean security flag has a value other than exact `true`/`false`.

When disabled, the server controls fail closed without requiring County Hunter
Supabase or administrative values. The explicit first-deploy public values and
three exact `false` flags are still required so wallet metadata, existing
agents, Home RPC, and disabled routing cannot silently fall back. No
client-public flag can override server authorization.

## Client-boundary verification

All modules that read server-only values import `server-only`. The County
Hunter admin client disables session persistence, automatic token refresh, and
URL session detection; it does not build authorization headers manually.
Automated tests
scan every Client Component for server variable names and server production
configuration imports. The production build must additionally be scanned to
confirm:

- no service role, secret key, rate-limit secret, database URL/password,
  private RPC credential,
  staging/test identifier, wallet/private key, token, or cookie is present;
- no application-owned local origin, staging endpoint, or localhost
  certificate reference is emitted in `.next/static`;
- no real value from an ignored local environment file appears in tracked
  changes or browser artifacts;
- no public source map contains a server-only value.

Public variables are identifiers/endpoints, not authorization. Supabase RLS,
server membership checks, server flags, SIWE validation, and tenant-scoped
database operations remain mandatory.

## Current local bundle evidence

The disabled production-placeholder build on 2026-07-28 contained zero exact
values from the ignored development/staging environment files and zero
service-role, secret-key, database-URL, staging-variable, or test-private-key
names in `.next/static`.

The same public bundle still contains `http://localhost:*` and
`https://localhost:*` as hard-coded default allowed-ancestor constants inside
`@reown/appkit` 1.8.19, reached through the approved WalletConnect provider.
They are vendor defaults, not a configured NexusClaw origin, but they fail the
pilot preparation's literal “no localhost in the production bundle” gate.

Do not hide the strings, patch `node_modules`, or remove wallet functionality.
Before deployment, resolve this through a supported upstream package/config
change with a separate wallet-stack review and repeat the QR, MetaMask,
Coinbase, Base 8453, SIWE, bundle, build, and clean-install gates. This raw
token-count decision is superseded by the runtime gate below.

## Wallet bundle runtime gate

Third-party local-development and validation tokens are classified by behavior
rather than treated as configured NexusClaw endpoints:

| Package | Version | Classification | Observed purpose |
| --- | --- | --- | --- |
| `@reown/appkit-common` / `@reown/appkit-controllers` | 1.8.19 | `VENDOR_DEVELOPMENT_FALLBACK` | Default development ancestors and local-origin validation. |
| `@walletconnect/jsonrpc-utils` | 1.0.8 | `VENDOR_VALIDATION_LITERAL` | WebSocket URL classification. |
| `@rainbow-me/rainbowkit` | 2.2.11 | `VENDOR_DEVELOPMENT_FALLBACK` | Development chain icon metadata. |
| `engine.io-client` via MetaMask SDK | 6.6.6 | `VENDOR_DEVELOPMENT_FALLBACK` | Browser hostname fallback and offline handling. |
| `next` | 15.5.21 | `VENDOR_VALIDATION_LITERAL` | Standards-compatible URL parsing. |

None of these values is selected by NexusClaw configuration. WalletConnect
metadata receives the validated `NEXT_PUBLIC_APP_ORIGIN` explicitly, and
production disables WalletConnect when that origin or its Project ID is
missing or invalid. A first-deploy browser smoke must still prove that provider
initialization, modal opening, and QR generation send no request to a local,
test, or staging destination.

The corrected gate requires:

- `APP_OWNED_LOCALHOST_RUNTIME=false`;
- `APP_OWNED_STAGING_URLS=false`;
- `METADATA_EXPLICIT=true`;
- `METADATA_MATCHES_APP_ORIGIN=true`;
- `SIWE_MATCHES_APP_ORIGIN=true`;
- `PRODUCTION_PLACEHOLDERS_REJECTED=true`;
- `OUTBOUND_LOCALHOST_REQUESTS=false` or `PENDING_REAL_DOMAIN_SMOKE` before
  the first deploy is approved;
- `VENDOR_TOKENS_DOCUMENTED=true`.

`RAW_LOCALHOST_TOKEN_COUNT=0` is not a release requirement. Reassess these
vendor tokens whenever the WalletConnect, RainbowKit, Wagmi, MetaMask, or Next
stack changes. Do not perform a major update solely to remove inert strings.
