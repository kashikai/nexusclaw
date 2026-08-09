# County Hunter Vercel first deploy — flags OFF

Status: repository preparation only. Production remains disabled. This guide
does not authorize a deployment, Dashboard change, DNS change, Reown change,
WAF rule, database connection, user, membership, or Discovery run.

## Single project root and build settings

`VERCEL_PROJECT_ROOT=frontend`

The repository root has no `package.json`, lockfile, Next configuration, or
application imports. The Next application, `package-lock.json`, build scripts,
routes, and sole `vercel.json` all live under `frontend`. The removed root
configuration used the legacy `builds` and catch-all `routes` mechanism and
must not be restored.

Configure the Vercel project with exactly:

| Setting | Value |
| --- | --- |
| Framework Preset | `Next.js` |
| Root Directory | `frontend` |
| Install Command | `npm ci` (repository-controlled) |
| Build Command | `npm run build` (Next.js autodetection) |
| Output Directory | leave blank; Next.js framework default (`.next`) |
| Node.js | `24.x`, pinned by `frontend/package.json` |

Do not add Dashboard overrides for the build command or output directory. The
repository `vercel.json` selects Next.js and the reproducible install command;
the framework supplies the correct build and output defaults.

## FIRST_DEPLOY_REQUIRED

Set only these application variables for the first deployment, with County
Hunter disabled:

| Variable | First-deploy rule |
| --- | --- |
| `NEXT_PUBLIC_APP_ORIGIN` | exact `https://county-hunter.nexusclaw.tech` |
| `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED` | exact `false` |
| `COUNTY_HUNTER_ENABLED` | exact `false` |
| `COUNTY_HUNTER_DISCOVERY_ENABLED` | exact `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | existing NexusClaw agents/signal-agent public project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | existing NexusClaw agents/signal-agent public key; never an administrative key |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | existing production Reown Project ID restricted to the exact origin |
| `NEXT_PUBLIC_BASE_RPC_URL` | client-safe production Base RPC used by Home and the existing wallet stack |

`NODE_ENV=production` is supplied by Vercel and is not a user-managed entry in
this matrix. No County Hunter Supabase URL, publishable key, secret key,
membership, user, SIWE session, or database URL is needed while the module is
off.

## ENABLE_COUNTY_HUNTER_LATER

Add and validate these only in a separately authorized enablement deployment:

| Variable | Enablement rule |
| --- | --- |
| `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_URL` | dedicated County Hunter production project origin |
| `NEXT_PUBLIC_COUNTY_HUNTER_SUPABASE_PUBLISHABLE_KEY` | dedicated browser-safe publishable key |
| `COUNTY_HUNTER_SUPABASE_SECRET_KEY` | server-only `sb_secret_` credential |
| `COUNTY_HUNTER_RATE_LIMIT_BACKEND` | exact `postgres` |
| `COUNTY_HUNTER_RATE_LIMIT_SECRET` | independent server-only HMAC secret |
| `COUNTY_HUNTER_AUTH_ORIGIN` | exact `https://county-hunter.nexusclaw.tech` |
| `COUNTY_HUNTER_PRODUCTION_CONFIRM` | exact runtime gate `PRODUCTION_PILOT` |
| `COUNTY_HUNTER_PRODUCTION_PROJECT_REF` | dedicated production project ref; server-only |
| `COUNTY_HUNTER_BASE_RPC_URL` | server-only production Base RPC for SIWE |
| `NEXT_PUBLIC_COUNTY_HUNTER_ENABLED` | change to `true` only with the server flag |
| `COUNTY_HUNTER_ENABLED` | change to `true` only after the enablement gate |
| `COUNTY_HUNTER_DISCOVERY_ENABLED` | keep `false` until a separately approved collection window |

The already configured `NEXT_PUBLIC_APP_ORIGIN`, legacy NexusClaw public
variables, WalletConnect Project ID, and public Base RPC remain unchanged.

## Runtime prohibitions

The application runtime rejects non-empty values for:

- `SUPABASE_SERVICE_ROLE_KEY`;
- generic `SUPABASE_SECRET_KEY`;
- `COUNTY_HUNTER_PRODUCTION_DB_URL` (`MIGRATION_ONLY`);
- `DATABASE_URL` for County Hunter;
- `POSTGRES_PASSWORD`;
- every `COUNTY_HUNTER_STAGING_*` variable;
- every `COUNTY_HUNTER_TEST_*` variable;
- every fixture private key.

The Vercel upload ignore file excludes `.env`, `.env.*`, `*.local`, and common
backup suffixes. Never upload an `.env` file through the Dashboard or CLI.
`COUNTY_HUNTER_PRODUCTION_DB_URL` remains only in the ignored repository-root
administrative file used by the explicit migration runner; it is prohibited in
the Vercel build and runtime.

## Disabled behavior

With the three County Hunter flags set to `false`:

- `/county-hunter` and all nested pages return the expected disabled/404 state;
- `/api/county-hunter/*`, including Discovery and replay, returns 404 in
  middleware before any County Hunter Supabase client is created;
- Discovery and replay retain their independent server-side kill switch;
- TopNav does not emit a County Hunter link;
- the browser does not initialize the County Hunter Supabase project;
- no County Hunter administrative secret is required;
- wallet metadata is bound to `NEXT_PUBLIC_APP_ORIGIN`;
- future SIWE uses the same origin when enabled;
- local, loopback, staging, test, and placeholder origins are rejected;
- production County Hunter cookies remain `Secure`, `HttpOnly`, and
  `SameSite=Lax` when SIWE is later enabled.

`GET /api/health` is public and returns only `{"status":"ok"}` with HTTP 200
and `Cache-Control: no-store`. It does not read environment values, access a
database, initialize Supabase, consume rate limits, execute Discovery, or
create a session.

## First-deploy smoke checklist

Do not require County Hunter login while the flags are off. After a separately
authorized deployment, verify:

- `GET /` returns the Home page;
- `GET /api/health` returns 200, the minimal body, and `Cache-Control: no-store`;
- `GET /county-hunter` returns the expected disabled/404 state;
- representative `/api/county-hunter/*` requests return 404;
- Discovery and replay APIs cannot execute;
- Home, assets, TopNav, agents, signal-agent, staking, and navigation load;
- the existing wallet modal opens once without a transaction;
- the production bundle contains no application-owned local/staging endpoint;
- the browser network monitor reports no local, loopback, test, or staging
  request;
- logs are sanitized and contain no key, cookie, token, wallet, signature,
  database URL, or environment value.

Use the existing sanitized browser network harness for the bundle/network
checks. Do not connect a funded wallet and do not sign County Hunter SIWE while
the module is disabled.

## Vercel Hobby WAF — NOT CONFIGURED

Documented future defense-in-depth rule:

- route: `POST /api/county-hunter/auth/*`;
- threshold: `60 requests / 300 seconds / IP`;
- response: `HTTP 429`.

Do not publish this rule in the current phase. It must be configured and
verified manually before County Hunter is enabled, and it does not replace the
distributed PostgreSQL per-IP and per-wallet limits.
