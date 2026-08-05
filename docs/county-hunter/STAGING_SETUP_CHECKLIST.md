# County Hunter staging setup checklist

This checklist prepares a dedicated validation environment. It contains no
credentials and must never be filled with production values in Git.

## Project

- [ ] Use a Supabase project dedicated exclusively to staging.
- [ ] Confirm there is no connection to a production database or project.
- [ ] Use no wallet with real funds.
- [ ] Use no real user.
- [ ] Use no real organization.
- [ ] Keep both production County Hunter feature flags disabled.

## Required local variables

Create `C:\dev\nexusclaw\.env.staging.local`; the file is ignored by Git.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
# Legacy/deprecated fallback only; not recommended.
SUPABASE_SERVICE_ROLE_KEY=
COUNTY_HUNTER_STRICT_ADMIN_KEY=false
COUNTY_HUNTER_STAGING_DB_URL=
COUNTY_HUNTER_AUTH_ORIGIN=
COUNTY_HUNTER_ENABLED=true
NEXT_PUBLIC_COUNTY_HUNTER_ENABLED=true
```

Administrative safety and disposable-fixture identifiers used by the local
validation scripts:

```dotenv
COUNTY_HUNTER_STAGING_CONFIRM=STAGING_ONLY
COUNTY_HUNTER_STAGING_PROJECT_REF=
COUNTY_HUNTER_TEST_ORG_A=
COUNTY_HUNTER_TEST_ORG_B=
COUNTY_HUNTER_TEST_VIEWER_A=
COUNTY_HUNTER_TEST_MANAGER_A=
COUNTY_HUNTER_TEST_ADMIN_A=
COUNTY_HUNTER_TEST_ADMIN_B=
```

`SUPABASE_SECRET_KEY` is required by the authorized local staging provisioner
and by the `server-only` SIWE challenge Route Handlers. The runtime SIWE client
does not accept `SUPABASE_SERVICE_ROLE_KEY`; the legacy variable remains only as
a temporary, deprecated fallback for explicitly authorized local scripts.
Neither administrative key may use a `NEXT_PUBLIC_*` name, enter a Client
Component or browser bundle, enter Git, or be printed in logs.

Set `COUNTY_HUNTER_STRICT_ADMIN_KEY=true`, or pass `-StrictAdminKey` to the
PowerShell preflight and `--strict-admin-key` to the Node provisioner, to reject
the legacy variable. Do not disable the Legacy API Keys in Supabase until the
preferred key has passed provisioning and strict validation.

## Supabase and test configuration

- [ ] Enable Ethereum/Web3 Auth in the staging project.
- [ ] Register the exact origin and redirect URLs used by staging.
- [ ] Configure and verify Base chain ID `8453`.
- [ ] Use disposable users and wallets only.
- [ ] Create two disposable organizations, A and B.
- [ ] Provision viewer A.
- [ ] Provision manager A.
- [ ] Provision admin A.
- [ ] Provision admin B.

## Validation sequence

1. Fill the ignored `.env.staging.local`.
2. Run the non-destructive preflight:
   `.\scripts\validate-county-hunter-staging.ps1 -PreflightOnly`.
3. After adding the new key, run the strict non-destructive preflight:
   `.\scripts\validate-county-hunter-staging.ps1 -PreflightOnly -StrictAdminKey`.
4. Apply the migrations only after the preflight is ready.
5. Run `node scripts/provision-county-hunter-staging.mjs --strict-admin-key`
   from `frontend`.
6. Persist the four disposable memberships.
7. Run the rollback-only SQL test matrix.
8. Start the frontend against staging.
9. Run the browser SIWE E2E matrix.
10. Test active-session membership revocation.
11. Keep production disabled.

The default preflight does not connect to the database and does not mutate any
resource. A read-only `select 1` connectivity check is performed only when
explicitly requested with both `-PreflightOnly -TestConnectivity`.
