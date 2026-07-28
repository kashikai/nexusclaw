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
| `COUNTY_HUNTER_ENABLED` | server-only | Always; defaults false | Prohibited | Exact `true` or `false`; enabling invokes full production validation. |
| `COUNTY_HUNTER_DISCOVERY_ENABLED` | server-only | Always; defaults false | Prohibited | Cannot be true when the module is false; enable only during an approved manual collection window. |
| `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED` | client-public | Always; defaults false | Expected | Navigation/appearance only; never grants access. |
| `COUNTY_HUNTER_PRODUCTION_CONFIRM` | server-only | When module is enabled | Prohibited | Exact production-pilot confirmation; not a secret and not reusable for staging. |
| `COUNTY_HUNTER_PRODUCTION_PROJECT_REF` | server-only | When module is enabled | Prohibited | Exactly 20 lowercase alphanumeric characters; must match the dedicated Supabase URL. |
| `NEXT_PUBLIC_APP_ORIGIN` | client-public | When module is enabled | Expected | Exact pathless HTTPS production origin; no local/staging host, query, fragment, credential, or placeholder. |
| `COUNTY_HUNTER_AUTH_ORIGIN` | server-only | When module is enabled | Prohibited | Must equal the public origin; fixed input to SIWE, never derived from `Host`. |
| `NEXT_PUBLIC_SUPABASE_URL` | client-public | When module is enabled | Expected | Exact dedicated production project URL; no staging/local/placeholder URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client-public | When module is enabled | Expected | Dedicated production publishable key only; service-role/secret keys are rejected. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client-public, optional legacy | Only if a non-County-Hunter legacy flow still imports it | Expected when used | Dedicated production public anon key; migrate consumers to the publishable key separately. Never use a service role. |
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
| Supabase service role or new secret key | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Short-lived isolated admin job/secret manager only |
| Production database URL | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Approved migration/backup runner only |
| Database password | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Approved secret manager/tool input only |
| Backup encryption key | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Backup platform/HSM only |
| Deployment provider token | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Deployment platform secret store only |
| DNS/TLS provider credential | deployment-secret, prohibited-in-browser and prohibited-in-app-runtime | Provider secret store only |

The runtime validator rejects non-empty `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_SECRET_KEY`, `DATABASE_URL`, `COUNTY_HUNTER_PRODUCTION_DB_URL`,
`POSTGRES_PASSWORD`, all `COUNTY_HUNTER_STAGING_*`, and all
`COUNTY_HUNTER_TEST_*` values when the production module is enabled.

## Fail-fast rules

When `NODE_ENV=production` and `COUNTY_HUNTER_ENABLED=true`, startup/request
evaluation fails safely without echoing values if:

- the explicit production confirmation is absent;
- either canonical origin is absent, placeholder, HTTP, local, staging,
  credential-bearing, or contains a path/query/fragment;
- application and Auth origins differ;
- the production Supabase ref is malformed or differs from the Supabase URL;
- the Supabase URL is not the dedicated `*.supabase.co` project origin;
- the public Supabase key is absent, placeholder, a new secret key, or a legacy
  JWT with role `service_role`;
- the WalletConnect Project ID is missing, malformed, repeated, or a
  placeholder;
- either Base RPC is missing, non-HTTPS, local, staging, invalid, or a
  placeholder; the browser RPC also rejects query/fragment credentials;
- any staging/test/admin/database credential appears in the application
  runtime;
- Discovery is enabled while the module is disabled;
- a boolean security flag has a value other than exact `true`/`false`.

When disabled, the server controls fail closed without requiring real
production values, which permits a safe placeholder build and initial
deployment. No client-public flag can override server authorization.

## Client-boundary verification

All modules that read server-only values import `server-only`. Automated tests
scan every Client Component for server variable names and server production
configuration imports. The production build must additionally be scanned to
confirm:

- no service role, secret key, database URL/password, private RPC credential,
  staging/test identifier, wallet/private key, token, or cookie is present;
- no local origin or localhost certificate reference is emitted in
  `.next/static`;
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
Coinbase, Base 8453, SIWE, bundle, build, and clean-install gates. Until then
this remains a deployment blocker.
