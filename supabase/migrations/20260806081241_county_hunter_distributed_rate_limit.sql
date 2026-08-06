-- NexusClaw County Hunter - distributed SIWE rate limiting.
-- The bucket table is private; only narrow SECURITY DEFINER RPCs are exposed.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.county_hunter_rate_limit_buckets (
  bucket_hash text not null,
  scope text not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function pg_temp.county_hunter_rate_limit_ensure_constraint(
  p_constraint_name text,
  p_expected_definition text,
  p_ddl text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  constraint_oid oid;
  actual_definition text;
begin
  select constraint_row.oid
    into constraint_oid
  from pg_catalog.pg_constraint constraint_row
  where constraint_row.conrelid =
        'private.county_hunter_rate_limit_buckets'::pg_catalog.regclass
    and constraint_row.conname = p_constraint_name;

  if constraint_oid is null then
    execute p_ddl;
    select constraint_row.oid
      into constraint_oid
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.conrelid =
          'private.county_hunter_rate_limit_buckets'::pg_catalog.regclass
      and constraint_row.conname = p_constraint_name;
  end if;

  actual_definition := lower(pg_catalog.regexp_replace(
    replace(pg_catalog.pg_get_constraintdef(constraint_oid, true), 'private.', ''),
    '\s+', '', 'g'
  ));
  if actual_definition <>
     lower(pg_catalog.regexp_replace(p_expected_definition, '\s+', '', 'g')) then
    raise exception 'County Hunter rate-limit migration conflict for constraint %',
      p_constraint_name;
  end if;
end;
$$;

do $$
begin
  perform pg_temp.county_hunter_rate_limit_ensure_constraint(
    'county_hunter_rate_limit_buckets_pkey',
    'PRIMARY KEY (scope, bucket_hash, window_started_at)',
    'alter table private.county_hunter_rate_limit_buckets add constraint county_hunter_rate_limit_buckets_pkey primary key (scope, bucket_hash, window_started_at)'
  );
  perform pg_temp.county_hunter_rate_limit_ensure_constraint(
    'county_hunter_rate_limit_buckets_scope_check',
    $definition$CHECK (scope = ANY (ARRAY['siwe-challenge'::text, 'siwe-challenge-invalid-payload'::text, 'siwe-verify-global'::text, 'siwe-verify-wallet'::text, 'siwe-verify-invalid-payload'::text]))$definition$,
    $ddl$alter table private.county_hunter_rate_limit_buckets add constraint county_hunter_rate_limit_buckets_scope_check check (scope in ('siwe-challenge', 'siwe-challenge-invalid-payload', 'siwe-verify-global', 'siwe-verify-wallet', 'siwe-verify-invalid-payload'))$ddl$
  );
  perform pg_temp.county_hunter_rate_limit_ensure_constraint(
    'county_hunter_rate_limit_buckets_hash_check',
    $definition$CHECK (bucket_hash ~ '^[a-f0-9]{64}$'::text)$definition$,
    $ddl$alter table private.county_hunter_rate_limit_buckets add constraint county_hunter_rate_limit_buckets_hash_check check (bucket_hash ~ '^[a-f0-9]{64}$')$ddl$
  );
  perform pg_temp.county_hunter_rate_limit_ensure_constraint(
    'county_hunter_rate_limit_buckets_count_check',
    'CHECK (request_count >= 0)',
    'alter table private.county_hunter_rate_limit_buckets add constraint county_hunter_rate_limit_buckets_count_check check (request_count >= 0)'
  );
  perform pg_temp.county_hunter_rate_limit_ensure_constraint(
    'county_hunter_rate_limit_buckets_window_check',
    'CHECK (expires_at > window_started_at)',
    'alter table private.county_hunter_rate_limit_buckets add constraint county_hunter_rate_limit_buckets_window_check check (expires_at > window_started_at)'
  );
end;
$$;

create index if not exists county_hunter_rate_limit_buckets_expires_idx
  on private.county_hunter_rate_limit_buckets (expires_at);

do $$
declare
  existing_definition text;
begin
  select pg_catalog.pg_get_indexdef(index_relation.oid)
    into existing_definition
  from pg_catalog.pg_class index_relation
  join pg_catalog.pg_namespace namespace
    on namespace.oid = index_relation.relnamespace
  where namespace.nspname = 'private'
    and index_relation.relname = 'county_hunter_rate_limit_buckets_expires_idx';

  if existing_definition is null
     or lower(pg_catalog.regexp_replace(existing_definition, '\s+', '', 'g')) <>
        lower(pg_catalog.regexp_replace(
          'CREATE INDEX county_hunter_rate_limit_buckets_expires_idx ON private.county_hunter_rate_limit_buckets USING btree (expires_at)',
          '\s+', '', 'g'
        )) then
    raise exception 'County Hunter rate-limit migration conflict for expiry index';
  end if;
end;
$$;

alter table private.county_hunter_rate_limit_buckets enable row level security;
alter table private.county_hunter_rate_limit_buckets force row level security;
revoke all on table private.county_hunter_rate_limit_buckets
  from public, anon, authenticated, service_role;

create or replace function public.county_hunter_consume_rate_limit_buckets(
  p_scopes text[],
  p_bucket_hashes text[],
  p_limits integer[],
  p_window_seconds integer[]
)
returns table (
  bucket_index integer,
  allowed boolean,
  "limit" integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_time timestamptz := pg_catalog.clock_timestamp();
  bucket record;
  current_count integer;
  current_window_started_at timestamptz;
  current_expires_at timestamptz;
begin
  if p_scopes is null
     or p_bucket_hashes is null
     or p_limits is null
     or p_window_seconds is null
     or pg_catalog.cardinality(p_scopes) < 1
     or pg_catalog.cardinality(p_scopes) > 2
     or pg_catalog.cardinality(p_bucket_hashes) <> pg_catalog.cardinality(p_scopes)
     or pg_catalog.cardinality(p_limits) <> pg_catalog.cardinality(p_scopes)
     or pg_catalog.cardinality(p_window_seconds) <> pg_catalog.cardinality(p_scopes) then
    raise exception 'County Hunter rate-limit bucket input is invalid'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.generate_subscripts(p_scopes, 1) as duplicate_index
    group by p_scopes[duplicate_index], p_bucket_hashes[duplicate_index]
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'County Hunter rate-limit bucket input is duplicated'
      using errcode = '22023';
  end if;

  delete from private.county_hunter_rate_limit_buckets expired_bucket
  where expired_bucket.ctid in (
    select cleanup_candidate.ctid
    from private.county_hunter_rate_limit_buckets cleanup_candidate
    where cleanup_candidate.expires_at <= operation_time
    order by cleanup_candidate.expires_at
    limit 64
  );

  for bucket in
    select
      p_scopes[input_index] as scope_name,
      p_bucket_hashes[input_index] as bucket_hash_value,
      p_limits[input_index] as bucket_limit,
      p_window_seconds[input_index] as window_seconds,
      input_index::integer as ordinal
    from pg_catalog.generate_subscripts(p_scopes, 1) as input_index
    order by p_scopes[input_index], p_bucket_hashes[input_index]
  loop
    if bucket.bucket_hash_value !~ '^[a-f0-9]{64}$' then
      raise exception 'County Hunter rate-limit bucket hash is invalid'
        using errcode = '22023';
    end if;
    if bucket.window_seconds <> 300 then
      raise exception 'County Hunter rate-limit window is invalid'
        using errcode = '22023';
    end if;
    if not (
      (bucket.scope_name in (
        'siwe-challenge',
        'siwe-challenge-invalid-payload',
        'siwe-verify-wallet',
        'siwe-verify-invalid-payload'
      ) and bucket.bucket_limit = 10)
      or
      (bucket.scope_name = 'siwe-verify-global' and bucket.bucket_limit = 30)
    ) then
      raise exception 'County Hunter rate-limit scope or limit is invalid'
        using errcode = '22023';
    end if;

    current_window_started_at := pg_catalog.to_timestamp(
      pg_catalog.floor(
        pg_catalog.date_part('epoch', operation_time) / bucket.window_seconds
      ) * bucket.window_seconds
    );
    current_expires_at := current_window_started_at
      + pg_catalog.make_interval(secs => bucket.window_seconds);

    insert into private.county_hunter_rate_limit_buckets (
      scope,
      bucket_hash,
      window_started_at,
      expires_at,
      request_count,
      created_at,
      updated_at
    ) values (
      bucket.scope_name,
      bucket.bucket_hash_value,
      current_window_started_at,
      current_expires_at,
      1,
      operation_time,
      operation_time
    )
    on conflict on constraint county_hunter_rate_limit_buckets_pkey
    do update set
      request_count = least(
        private.county_hunter_rate_limit_buckets.request_count + 1,
        bucket.bucket_limit + 1
      ),
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
    returning request_count into current_count;

    bucket_index := bucket.ordinal;
    allowed := current_count <= bucket.bucket_limit;
    "limit" := bucket.bucket_limit;
    remaining := greatest(bucket.bucket_limit - current_count, 0);
    reset_at := current_expires_at;
    return next;
  end loop;
end;
$$;

create or replace function public.county_hunter_cleanup_rate_limit_buckets(
  p_batch_size integer default 1000
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_batch_size < 1 or p_batch_size > 10000 then
    raise exception 'County Hunter rate-limit cleanup batch is invalid'
      using errcode = '22023';
  end if;

  with cleanup_candidates as (
    select expired_bucket.ctid
    from private.county_hunter_rate_limit_buckets expired_bucket
    where expired_bucket.expires_at <= pg_catalog.clock_timestamp()
    order by expired_bucket.expires_at
    for update skip locked
    limit p_batch_size
  )
  delete from private.county_hunter_rate_limit_buckets expired_bucket
  using cleanup_candidates
  where expired_bucket.ctid = cleanup_candidates.ctid;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.county_hunter_consume_rate_limit_buckets(
  text[], text[], integer[], integer[]
) from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_consume_rate_limit_buckets(
  text[], text[], integer[], integer[]
) to service_role;

revoke all on function public.county_hunter_cleanup_rate_limit_buckets(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_cleanup_rate_limit_buckets(integer)
  to service_role;

comment on table private.county_hunter_rate_limit_buckets is
  'Private HMAC-only fixed-window counters for County Hunter SIWE rate limiting.';
comment on function public.county_hunter_consume_rate_limit_buckets(
  text[], text[], integer[], integer[]
) is
  'Atomically consumes one request from all supplied County Hunter SIWE buckets. Server administrative role only.';
comment on function public.county_hunter_cleanup_rate_limit_buckets(integer) is
  'Deletes a bounded batch of expired County Hunter SIWE rate-limit buckets. Server administrative role only.';

-- Rollback order (manual and separately authorized): revoke both RPC grants,
-- disable County Hunter, preserve counters for evidence, then remove the
-- private objects only after confirming no active server version calls them.
