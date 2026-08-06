# Supabase secret-key migration preparation

Status: code preparation only. No key was created, copied, printed, tested
against Supabase, or disabled by this change.

Supabase's current migration guidance maps the legacy browser `anon` key to a
publishable key and the legacy administrative `service_role` key to a secret
key. Both generations may coexist while consumers are migrated. The legacy
keys must remain enabled until every consumer has been verified.

Secret keys have elevated access and bypass RLS. The generic key remains
limited to the authorized local staging provisioner. Production County Hunter
uses a separately named server-only secret solely for its privileged SIWE
challenge repository and distributed rate-limit RPC; neither key may enter the
browser bundle, middleware,
user-session E2E harnesses, logs, Git, or a `NEXT_PUBLIC_*` variable.

## Current usage classification

| Variable | Files/area | Classification | Decision |
|---|---|---|---|
| `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL` and `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY` | County Hunter middleware and user-session clients | `PUBLIC_BROWSER` | Exclusive production project configuration. Required with the module enabled; no generic production fallback. |
| `COUNTY_HUNTER_SUPABASE_SECRET_KEY` | County Hunter server-only SIWE challenge repository and rate-limit RPC | `PRIVATE_SERVER_RUNTIME` | Dedicated production `sb_secret_` key. Required only when the server module is enabled; never returned by the validator or imported by Client Components. |
| `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Agents, signal-agent, legacy modules; temporary County Hunter staging fallback | browser, legacy/staging transition | Retained for existing applications. County Hunter fallback is deprecated and available only outside `NODE_ENV=production`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy Agents and Signal Agent pages | browser, legacy/optional | Retained for compatibility; County Hunter does not read it. Migrate separately. |
| `SUPABASE_SECRET_KEY` | `scripts/lib/supabase-admin-key.mjs`; staging provisioner; staging preflight | local administrative staging script only | Preferred administrative input. Never public or deployed. |
| `SUPABASE_SERVICE_ROLE_KEY` | same local helper/preflight only | local administrative staging script, legacy/deprecated | Temporary fallback with a fixed sanitized warning. Rejected in strict mode. |
| `COUNTY_HUNTER_PRODUCTION_DB_URL` | separately authorized migration/backup runner | `MIGRATION_ONLY` | Prohibited in the normal Next.js process and browser. |
| Either administrative key | migrations | migration | Not referenced. Migrations use the separately controlled database connection. |
| Either administrative key | County Hunter SIWE/discovery E2E | staging E2E | Explicitly rejected if inherited in the process environment and excluded from the environment-file allowlist. |
| Either administrative key | production Next runtime | production, prohibited | Production environment validation rejects it; the public bundle/source tests require absence. |
| All four names | tests and documentation | test/documentation | Names and synthetic fixtures only; no real values. |

The generic administrative key is needed only for staging Auth Admin
reconciliation and membership provisioning. Normal browser sessions, refresh,
logout, Discovery, replay, and RLS-backed user requests use the namespaced
publishable key plus the user's JWT. SIWE challenge issue/consume and the
distributed SIWE rate-limit RPC are the only normal server paths that use the
dedicated County Hunter secret, through a
`server-only` client with persistence, automatic refresh, and URL session
detection disabled.

## Resolution behavior

The local Node provisioner and PowerShell preflight follow this order:

1. Prefer `SUPABASE_SECRET_KEY`.
2. Require the value to use the `sb_secret_` format.
3. If it is absent, temporarily accept `SUPABASE_SERVICE_ROLE_KEY` and emit a
   fixed deprecation warning without a prefix, suffix, hash, or value.
4. If neither exists, fail before an administrative request.
5. In strict mode, reject the legacy variable even when the preferred key is
   also present.

Strict mode is enabled by one of:

```text
COUNTY_HUNTER_STRICT_ADMIN_KEY=true
.\scripts\validate-county-hunter-staging.ps1 -PreflightOnly -StrictAdminKey
node scripts/provision-county-hunter-staging.mjs --strict-admin-key
```

## Manual migration sequence

Do not paste a key into chat, a command line, logs, or a tracked file.

1. Keep Legacy API Keys enabled.
2. Add exactly `SUPABASE_SECRET_KEY` to the ignored
   `C:\dev\nexusclaw\.env.staging.local`.
3. Leave the existing legacy variable present during the first non-strict
   comparison if rollback safety is required.
4. Run the local preflight without connectivity.
5. Remove the legacy line locally, or ensure it is absent from the process, and
   run `-PreflightOnly -StrictAdminKey`.
6. Run the staging provisioner with `--strict-admin-key`.
7. Repeat SIWE, refresh, logout, role, tenant-isolation, Discovery, replay, and
   browser bundle checks. These flows must continue to use the publishable key
   and user session only.
8. Inventory CI, third-party integrations, Edge Functions, webhooks, cron,
   workers, and other repositories separately.
9. Only after every consumer passes strict validation, request a separate
   authorization to disable the Supabase Legacy API Keys.

No real `.env` file is modified by this preparation.
