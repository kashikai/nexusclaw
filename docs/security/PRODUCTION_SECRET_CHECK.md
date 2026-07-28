# County Hunter production secret history check

Date: 2026-07-28. Scope: all 222 commits and all reachable local Git objects.

This report is deliberately sanitized. It records paths, commits, credential
classes, and required action, never historical or current values.

## Method

- Inspected every historical path and reachable object locally.
- Searched Git history for environment files, credential variable names, JWTs,
  database/RPC URLs, passwords, private/seed key patterns, certificates,
  deployment tokens, cookies, and session tokens.
- Compared ignored local/staging values with reachable Git history by exact
  value without printing them.
- Inspected npm configuration and apparent matches to distinguish examples and
  vendored documentation from credentials.
- Used no external scanning service. Neither Gitleaks nor TruffleHog was
  installed, so the result combines exhaustive Git object/path inspection with
  targeted pattern and exact-value checks.

## Findings

| File | First relevant commit | Last/removal commit | Probable type | Removed from current state | Rotation status | History rewrite |
|---|---|---|---|---|---|---|
| `frontend/.env.local` | `3814a7934b2ac926ae80a99ae27a5b5781aa1405` | deleted by `043565c475ae6525d184962088cb2dcf3c9176f3` | Supabase project URL, legacy public anon key, WalletConnect/Reown Project ID | Yes | Provider-owner confirmation is required; rotate/deactivate any still-valid identifier/key before push or deployment | Required only through a separately authorized, coordinated rewrite |
| `frontend/.env.example` | inherited historical client ID; ancestry also includes `c98b228167efdc8836eda6aced76a8ffacb9b8d9` under the former frontend path | replaced by a marker on this preparation branch | Same historical WalletConnect/Reown Project ID | Yes on this branch | Rotate/deactivate the historical project before push or deployment | Include in the same separately authorized rewrite if one is approved |

The historical `.env.local` did not contain a Supabase service role, database
password/URL, private wallet key, seed phrase, session cookie, deployment
token, or private certificate. Its public anon key and client Project ID are
browser-public identifiers, but versioning them was still an environment
isolation and lifecycle failure and does not waive rotation review.

Current ignored local values for Supabase URL, publishable key, service role,
database URL, staging project ref, two tenant IDs, four disposable private
keys, and the current development WalletConnect/Reown Project ID had no exact
match in reachable Git history. No value is reproduced in this report.

The only other apparent database credential was a synthetic
`example.invalid` test fixture. npm configuration contained registry settings
only and no authentication token. Private-key/seed/certificate pattern matches
outside the environment history were vendored code or documentation, not
NexusClaw credentials. No current tracked service role, private key, database
password, session token, deployment token, or certificate was identified.

## Required action and decision boundary

The validity of the historical Supabase project/anon key and historical
WalletConnect/Reown project cannot be proven from the repository. They were not
tested against an external service because this task forbids accessing a real
production project or creating production secrets.

Before any push or deployment, the provider owners must:

1. identify the old Supabase project without posting its ref or key;
2. confirm the project is deleted/decommissioned, or rotate/revoke the old
   public key and review Auth redirect/domain configuration;
3. identify and delete, rotate, or deactivate the old WalletConnect/Reown
   project;
4. record provider-side evidence containing only project aliases, action,
   operator, and timestamp;
5. rerun the local history/current-tree scan and the production bundle scan.

Until that evidence exists, the production-pilot preparation is **NO-GO**.
This is a blocker before push, not authorization to contact either provider.

No `git filter-repo`, BFG, force push, or automatic history rewrite was
performed. If rewriting is approved later, coordinate repository freeze,
backup, replacement clones, branch/tag treatment, contributor notification,
credential rotation first, and a post-rewrite scan. Rewriting Git history does
not revoke a credential and must never substitute for rotation.
