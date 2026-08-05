-- NexusClaw County Hunter - server-only SIWE RPC hardening.
-- Replay-safe: ALTER/REVOKE/GRANT converge on the same function ACLs and paths.

do $$
declare
  required_signature text;
begin
  foreach required_signature in array array[
    'public.county_hunter_write_audit_log()',
    'public.county_hunter_issue_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone,timestamp with time zone)',
    'public.county_hunter_consume_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone)',
    'public.county_hunter_seed_georgia()',
    'public.county_hunter_begin_snapshot_replay(uuid,text,integer)'
  ] loop
    if to_regprocedure(required_signature) is null then
      raise exception 'County Hunter hardening conflict: required function is missing';
    end if;
  end loop;
end;
$$;

alter function public.county_hunter_write_audit_log()
  set search_path = pg_catalog, public;
alter function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) set search_path = pg_catalog, public;
alter function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) set search_path = pg_catalog, public;
alter function public.county_hunter_seed_georgia()
  set search_path = pg_catalog, public;
alter function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  set search_path = pg_catalog, public;

revoke all on function public.county_hunter_write_audit_log()
  from public, anon, authenticated, service_role;

revoke all on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) to service_role;

revoke all on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) to service_role;

revoke all on function public.county_hunter_seed_georgia()
  from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_seed_georgia()
  to authenticated;

revoke all on function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.county_hunter_begin_snapshot_replay(uuid, text, integer)
  to authenticated;

comment on function public.county_hunter_issue_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz, timestamptz
) is 'Server-only SIWE challenge issuance. Direct execution is restricted to the Supabase server administrative role.';
comment on function public.county_hunter_consume_auth_challenge(
  uuid, text, text, text, text, bigint, timestamptz
) is 'Server-only atomic SIWE challenge consumption. Direct execution is restricted to the Supabase server administrative role.';

-- Manual rollback, only during an explicitly authorized incident response:
-- revoke execute on both SIWE functions from service_role; grant execute on both
-- SIWE functions to anon; keep their table inaccessible and keep all secure
-- search_path settings. The audit, bootstrap and replay ACLs need no rollback.
