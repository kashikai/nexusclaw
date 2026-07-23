# Environment history remediation

## Finding

`frontend/.env.local` was tracked in Git and is present in the County Hunter
base commit. The current preservation change removes it from the working tree
and the repository ignore rules now cover local and staging-local environment
files.

No historical value was read, restored, copied, or included in this document.

## Required response

Any secret that may have been stored in the tracked file must be considered
compromised. Rotate, at minimum, these credential categories wherever they
exist:

- Supabase keys, including privileged server-side keys;
- RPC credentials;
- API keys;
- any other password, token, private key, or service credential that may have
  been present.

Removing the file in the current commit does not remove it from existing Git
history, clones, forks, caches, or backups. Complete history cleanup is a
separate, coordinated security operation that requires an inventory of affected
remotes and consumers, credential rotation, communication, and verification.

Do not rewrite history or force-push any branch without explicit authorization
and a coordinated migration plan.
