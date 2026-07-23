-- NexusClaw County Hunter - Phase 1.2 disposable SIWE challenges.
-- The tenantless table has no direct API grants. Two narrow pre-auth RPCs perform
-- validated insertion and atomic deletion without exposing the service role.

create table if not exists public.county_hunter_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  nonce_hash text not null unique check (nonce_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  domain text not null check (char_length(domain) between 1 and 255),
  uri text not null check (char_length(uri) between 1 and 2048),
  chain_id bigint not null check (chain_id = 8453),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '5 minutes')
);

create index if not exists county_hunter_auth_challenges_wallet_created_idx
  on public.county_hunter_auth_challenges (wallet_address, created_at desc);
create index if not exists county_hunter_auth_challenges_expiry_idx
  on public.county_hunter_auth_challenges (expires_at);

alter table public.county_hunter_auth_challenges enable row level security;
alter table public.county_hunter_auth_challenges force row level security;
revoke all on public.county_hunter_auth_challenges from public, anon, authenticated;

create or replace function public.county_hunter_issue_auth_challenge(
  p_id uuid,
  p_nonce_hash text,
  p_wallet_address text,
  p_domain text,
  p_uri text,
  p_chain_id bigint,
  p_expires_at timestamptz,
  p_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  database_now timestamptz := clock_timestamp();
begin
  if p_created_at < database_now - interval '30 seconds'
     or p_created_at > database_now + interval '30 seconds'
     or p_expires_at <= database_now
     or p_expires_at > p_created_at + interval '5 minutes'
     or p_expires_at > database_now + interval '5 minutes 30 seconds' then
    raise exception 'invalid challenge time window' using errcode = '22007';
  end if;

  -- Serialize the wallet-scoped count and insert so concurrent requests cannot
  -- bypass the five-challenge window.
  perform pg_advisory_xact_lock(hashtextextended(p_wallet_address, 0));

  delete from public.county_hunter_auth_challenges
  where expires_at < database_now - interval '1 hour';

  if (
    select count(*)
    from public.county_hunter_auth_challenges challenge
    where challenge.wallet_address = p_wallet_address
      and challenge.created_at >= database_now - interval '5 minutes'
  ) >= 5 then
    raise exception 'wallet challenge rate limit exceeded' using errcode = 'P0001';
  end if;

  insert into public.county_hunter_auth_challenges (
    id,
    nonce_hash,
    wallet_address,
    domain,
    uri,
    chain_id,
    expires_at,
    created_at
  ) values (
    p_id,
    p_nonce_hash,
    p_wallet_address,
    p_domain,
    p_uri,
    p_chain_id,
    p_expires_at,
    p_created_at
  );
end;
$$;

create or replace function public.county_hunter_consume_auth_challenge(
  p_id uuid,
  p_nonce_hash text,
  p_wallet_address text,
  p_domain text,
  p_uri text,
  p_chain_id bigint,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  consumed boolean;
  database_now timestamptz := clock_timestamp();
begin
  if p_now < database_now - interval '30 seconds'
     or p_now > database_now + interval '30 seconds' then
    return false;
  end if;

  with deleted as (
    delete from public.county_hunter_auth_challenges challenge
    where challenge.id = p_id
      and challenge.nonce_hash = p_nonce_hash
      and challenge.wallet_address = p_wallet_address
      and challenge.domain = p_domain
      and challenge.uri = p_uri
      and challenge.chain_id = p_chain_id
      and challenge.expires_at > database_now
    returning 1
  )
  select exists(select 1 from deleted) into consumed;

  return consumed;
end;
$$;

revoke all on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) from public, authenticated;
revoke all on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) from public, authenticated;
grant execute on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) to anon;
grant execute on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) to anon;

comment on table public.county_hunter_auth_challenges is
  'Short-lived SHA-256 hashes of server-issued SIWE nonces. Rows are deleted atomically on use.';
comment on column public.county_hunter_auth_challenges.nonce_hash is
  'One-way hash only; the nonce plaintext exists solely inside the short-lived SIWE message.';
comment on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) is 'Anonymous pre-auth insert with database-time validation and a serialized wallet rate limit.';
comment on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) is 'Anonymous pre-auth one-time consume requiring an exact hash, wallet, origin, chain and live expiry.';

-- Harden every existing County Hunter function to a deterministic lookup path.
alter function public.county_hunter_current_organization_id() set search_path = pg_catalog, public;
alter function public.county_hunter_has_permission(text) set search_path = pg_catalog, public;
alter function public.county_hunter_set_updated_at() set search_path = pg_catalog, public;
alter function public.county_hunter_write_audit_log() set search_path = pg_catalog, public;
alter function public.county_hunter_seed_georgia() set search_path = pg_catalog, public;
