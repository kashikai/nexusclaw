param(
  [switch]$PreflightOnly,
  [switch]$MigrationsOnly,
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$productionEnvironmentPath = Join-Path $repositoryRoot '.env.production.local'
$requiredConfirmation = 'I_UNDERSTAND_THIS_IS_PRODUCTION'
$knownStagingProjectRefSha256 = '4ab533d622bae306981ec74e33a5764950389cd63d4d7e3e86d0963616344ea1'
$migrationNames = @(
  '202607230001_county_hunter_foundation.sql',
  '202607230002_county_hunter_rls.sql',
  '202607230003_county_hunter_seed_counties.sql',
  '202607230004_county_hunter_auth_hardening.sql',
  '202607230005_county_hunter_wallet_auth.sql',
  '20260726153642_county_hunter_gwinnett_discovery.sql',
  '20260726160827_county_hunter_gwinnett_discovery_rpc_fix.sql',
  '20260726174825_county_hunter_snapshot_replay.sql',
  '20260804181518_county_hunter_siwe_server_only_hardening.sql',
  '20260806081241_county_hunter_distributed_rate_limit.sql'
)

function Protect-CountyHunterProductionOutput {
  param(
    [string]$Text,
    [string]$ProjectRef = ''
  )

  if ($null -eq $Text) { return '' }
  $protected = $Text `
    -replace 'postgres(?:ql)?://\S+', '[redacted-database-url]' `
    -replace '(?i)\bdb\.[a-z0-9]{20}\.supabase\.(?:co|com)\b', '[redacted-supabase-host]' `
    -replace '(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b', '[redacted-uuid]' `
    -replace '(?i)\b0x[0-9a-f]{40,}\b', '[redacted-wallet-or-key]' `
    -replace '(?i)\b(?:eyJ|sb_(?:publishable|secret)_)[A-Za-z0-9._-]{8,}\b', '[redacted-token]'

  if (-not [string]::IsNullOrWhiteSpace($ProjectRef)) {
    $protected = $protected -replace [regex]::Escape($ProjectRef), '[redacted-project-ref]'
  }
  return $protected
}

function Get-StringSha256 {
  param([string]$Value)

  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    $hash = $algorithm.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

function Test-CountyHunterPlaceholder {
  param([string]$Value)

  return (
    [string]::IsNullOrWhiteSpace($Value) -or
    $Value -match '(?i)replace(?:_with)?|placeholder|change[-_ ]?me|your[-_ ]|dominio-de-producao|<[^>]+>|\$\{[^}]+\}|^demo$'
  )
}

function Read-CountyHunterProductionEnvironment {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw 'The administrative production environment file is missing.'
  }

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*(?:#.*)?$') { continue }
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      throw 'The administrative production environment file contains an invalid line.'
    }
    $name = $Matches[1]
    if ($values.ContainsKey($name)) {
      throw 'The administrative production environment file contains a duplicate variable.'
    }
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$name] = $value
  }
  return $values
}

function Test-ProductionEnvironmentIsIgnored {
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
  if (-not $gitCommand) { return $false }

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $gitCommand -C $repositoryRoot check-ignore --quiet --no-index -- '.env.production.local' 2>$null
    return $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Get-CountyHunterPsqlCommand {
  $command = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
  if ($command) { return $command }

  $localClient = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'PostgreSQL\17-client\bin\psql.exe'
  if (Test-Path -LiteralPath $localClient) { return $localClient }
  return $null
}

function Invoke-CountyHunterProductionPsql {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$ProjectRef
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $commandOutput = @(& $Command @Arguments 2>&1)
    $commandExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $safeOutput = @($commandOutput | ForEach-Object {
    Protect-CountyHunterProductionOutput -Text ([string]$_) -ProjectRef $ProjectRef
  })
  return [pscustomobject]@{
    ExitCode = $commandExitCode
    Output = $safeOutput
  }
}

function Write-SanitizedPsqlFailure {
  param([pscustomobject]$Result)

  foreach ($line in $Result.Output) {
    if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host $line }
  }
}

function Get-CountyHunterProductionMigrations {
  $migrationDirectory = Join-Path $repositoryRoot 'supabase\migrations'
  $discovered = @(Get-ChildItem -LiteralPath $migrationDirectory -File -Filter '*county_hunter*.sql' |
    Sort-Object Name |
    Select-Object -ExpandProperty Name)

  if ($discovered.Count -ne $migrationNames.Count -or
      (Compare-Object -ReferenceObject $migrationNames -DifferenceObject $discovered).Count -ne 0) {
    throw 'The County Hunter production migration manifest does not match the repository. Review newly added or missing migrations before continuing.'
  }

  $files = @()
  foreach ($name in $migrationNames) {
    $path = Join-Path $migrationDirectory $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      throw 'A required County Hunter production migration is missing.'
    }
    $contents = Get-Content -Raw -LiteralPath $path
    if ($contents -match '(?im)^\s*(?:vacuum|create\s+(?:unique\s+)?index\s+concurrently|reindex\s+[^;]*concurrently|alter\s+system|create\s+database)\b') {
      throw "Migration is not safe for the controlled transaction: $name"
    }
    $files += Get-Item -LiteralPath $path
  }
  return $files
}

function Set-CountyHunterPostgresEnvironment {
  param([pscustomobject]$Configuration)

  $previous = @{}
  foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGGSSENCMODE', 'PGCONNECT_TIMEOUT')) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
  }
  $env:PGHOST = $Configuration.Host
  $env:PGPORT = '5432'
  $env:PGUSER = 'postgres'
  $env:PGPASSWORD = $Configuration.Password
  $env:PGDATABASE = 'postgres'
  $env:PGSSLMODE = 'require'
  $env:PGGSSENCMODE = 'disable'
  $env:PGCONNECT_TIMEOUT = '15'
  return $previous
}

function Restore-CountyHunterPostgresEnvironment {
  param([hashtable]$Previous)

  foreach ($name in $Previous.Keys) {
    $value = $Previous[$name]
    if ($null -eq $value) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
    else { Set-Item -Path "Env:$name" -Value $value }
  }
}

function Invoke-CountyHunterProductionStateCheck {
  param(
    [string]$PsqlCommand,
    [string]$ProjectRef
  )

  $stateSql = @'
with expected(schema_name, table_name) as (
  values
    ('public', 'county_hunter_states'),
    ('public', 'county_hunter_counties'),
    ('public', 'county_hunter_sources'),
    ('public', 'county_hunter_auctions'),
    ('public', 'county_hunter_auction_sources'),
    ('public', 'county_hunter_properties'),
    ('public', 'county_hunter_parcel_matches'),
    ('public', 'county_hunter_property_snapshots'),
    ('public', 'county_hunter_risk_assessments'),
    ('public', 'county_hunter_valuation_scenarios'),
    ('public', 'county_hunter_shortlists'),
    ('public', 'county_hunter_monitoring_events'),
    ('public', 'county_hunter_review_tasks'),
    ('public', 'county_hunter_discovery_runs'),
    ('public', 'county_hunter_bid_assignments'),
    ('public', 'county_hunter_settings'),
    ('public', 'county_hunter_audit_logs'),
    ('public', 'county_hunter_memberships'),
    ('public', 'county_hunter_auth_challenges'),
    ('public', 'county_hunter_discovery_snapshots'),
    ('public', 'county_hunter_discovery_records'),
    ('public', 'county_hunter_discovery_changes'),
    ('public', 'county_hunter_discovery_locks'),
    ('private', 'county_hunter_rate_limit_buckets')
), actual as (
  select namespace.nspname as schema_name, relation.relname as table_name
  from pg_catalog.pg_class relation
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'private')
    and relation.relkind in ('r', 'p')
    and relation.relname like 'county_hunter_%'
), counts as (
  select
    (select count(*) from expected) as expected_count,
    (select count(*) from actual) as actual_count,
    (select count(*) from expected join actual using (schema_name, table_name)) as matching_count
)
select case
  when actual_count = 0 then 'PREFLIGHT_EMPTY'
  when actual_count = expected_count and matching_count = expected_count then 'PREFLIGHT_COMPATIBLE'
  else 'PREFLIGHT_INCOMPATIBLE'
end
from counts;
'@

  $result = Invoke-CountyHunterProductionPsql -Command $PsqlCommand -Arguments @(
    '-X', '-q', '-A', '-t',
    '-v', 'ON_ERROR_STOP=1',
    '-v', 'VERBOSITY=terse',
    '-c', $stateSql
  ) -ProjectRef $ProjectRef
  if ($result.ExitCode -ne 0) {
    Write-SanitizedPsqlFailure -Result $result
    throw 'The read-only County Hunter production state check failed.'
  }

  $state = @($result.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^PREFLIGHT_(?:EMPTY|COMPATIBLE|INCOMPATIBLE)$' } | Select-Object -Last 1)
  if ($state.Count -ne 1) { throw 'The read-only production state check returned an unexpected result.' }
  if ($state[0] -eq 'PREFLIGHT_INCOMPATIBLE') {
    throw 'The production project contains a partial or conflicting County Hunter schema.'
  }
  return $state[0]
}

function Invoke-CountyHunterProductionVerification {
  param(
    [string]$PsqlCommand,
    [string]$ProjectRef
  )

  $verifySql = @'
do $county_hunter_verify$
declare
  expected_public_tables text[] := array[
    'county_hunter_states', 'county_hunter_counties', 'county_hunter_sources',
    'county_hunter_auctions', 'county_hunter_auction_sources', 'county_hunter_properties',
    'county_hunter_parcel_matches', 'county_hunter_property_snapshots',
    'county_hunter_risk_assessments', 'county_hunter_valuation_scenarios',
    'county_hunter_shortlists', 'county_hunter_monitoring_events',
    'county_hunter_review_tasks', 'county_hunter_discovery_runs',
    'county_hunter_bid_assignments', 'county_hunter_settings',
    'county_hunter_audit_logs', 'county_hunter_memberships',
    'county_hunter_auth_challenges', 'county_hunter_discovery_snapshots',
    'county_hunter_discovery_records', 'county_hunter_discovery_changes',
    'county_hunter_discovery_locks'
  ];
  policy_tables text[] := array_remove(expected_public_tables, 'county_hunter_auth_challenges');
  violation_count integer;
  security_definer_count integer;
begin
  select count(*) into violation_count
  from unnest(expected_public_tables) expected(table_name)
  where to_regclass(format('public.%I', expected.table_name)) is null;
  if violation_count <> 0 then raise exception 'VERIFY_TABLES_MISSING'; end if;

  if to_regclass('private.county_hunter_rate_limit_buckets') is null then
    raise exception 'VERIFY_PRIVATE_RATE_LIMIT_TABLE_MISSING';
  end if;

  select count(*) into violation_count
  from pg_catalog.pg_class relation
  join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
  where ((namespace.nspname = 'public' and relation.relname = any(expected_public_tables))
      or (namespace.nspname = 'private' and relation.relname = 'county_hunter_rate_limit_buckets'))
    and not relation.relrowsecurity;
  if violation_count <> 0 then raise exception 'VERIFY_RLS_DISABLED'; end if;

  select count(*) into violation_count
  from unnest(policy_tables) expected(table_name)
  where not exists (
    select 1
    from pg_catalog.pg_policy policy
    where policy.polrelid = format('public.%I', expected.table_name)::regclass
  );
  if violation_count <> 0 then raise exception 'VERIFY_POLICIES_MISSING'; end if;

  select count(*) into security_definer_count
  from pg_catalog.pg_proc function_row
  join pg_catalog.pg_namespace namespace on namespace.oid = function_row.pronamespace
  where namespace.nspname = 'public'
    and function_row.proname like 'county_hunter_%'
    and function_row.prosecdef;
  if security_definer_count <> 7 then raise exception 'VERIFY_SECURITY_DEFINER_SET'; end if;

  select count(*) into violation_count
  from pg_catalog.pg_proc function_row
  join pg_catalog.pg_namespace namespace on namespace.oid = function_row.pronamespace
  where namespace.nspname = 'public'
    and function_row.proname like 'county_hunter_%'
    and function_row.prosecdef
    and not (
      coalesce(function_row.proconfig @> array['search_path=pg_catalog, public'], false)
      or coalesce(function_row.proconfig @> array['search_path=""'], false)
    );
  if violation_count <> 0 then raise exception 'VERIFY_SECURITY_DEFINER_SEARCH_PATH'; end if;

  if not has_function_privilege('service_role', 'public.county_hunter_issue_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_issue_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.county_hunter_issue_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone,timestamp with time zone)', 'EXECUTE') then
    raise exception 'VERIFY_SIWE_ISSUE_ACL';
  end if;

  if not has_function_privilege('service_role', 'public.county_hunter_consume_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_consume_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.county_hunter_consume_auth_challenge(uuid,text,text,text,text,bigint,timestamp with time zone)', 'EXECUTE') then
    raise exception 'VERIFY_SIWE_CONSUME_ACL';
  end if;

  if has_function_privilege('anon', 'public.county_hunter_write_audit_log()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.county_hunter_write_audit_log()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.county_hunter_write_audit_log()', 'EXECUTE') then
    raise exception 'VERIFY_AUDIT_FUNCTION_ACL';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger trigger_row
    where not trigger_row.tgisinternal
      and trigger_row.tgfoid = 'public.county_hunter_write_audit_log()'::regprocedure
  ) then raise exception 'VERIFY_AUDIT_TRIGGER_MISSING'; end if;

  if not has_function_privilege('authenticated', 'public.county_hunter_seed_georgia()', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_seed_georgia()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.county_hunter_seed_georgia()', 'EXECUTE') then
    raise exception 'VERIFY_BOOTSTRAP_ACL';
  end if;

  if not has_function_privilege('authenticated', 'public.county_hunter_begin_snapshot_replay(uuid,text,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_begin_snapshot_replay(uuid,text,integer)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.county_hunter_begin_snapshot_replay(uuid,text,integer)', 'EXECUTE') then
    raise exception 'VERIFY_REPLAY_ACL';
  end if;

  if not has_function_privilege('service_role', 'public.county_hunter_consume_rate_limit_buckets(text[],text[],integer[],integer[])', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_consume_rate_limit_buckets(text[],text[],integer[],integer[])', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.county_hunter_consume_rate_limit_buckets(text[],text[],integer[],integer[])', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.county_hunter_cleanup_rate_limit_buckets(integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.county_hunter_cleanup_rate_limit_buckets(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.county_hunter_cleanup_rate_limit_buckets(integer)', 'EXECUTE') then
    raise exception 'VERIFY_RATE_LIMIT_ACL';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE')
     or has_table_privilege('anon', 'private.county_hunter_rate_limit_buckets', 'SELECT')
     or has_table_privilege('anon', 'private.county_hunter_rate_limit_buckets', 'INSERT')
     or has_table_privilege('anon', 'private.county_hunter_rate_limit_buckets', 'UPDATE')
     or has_table_privilege('anon', 'private.county_hunter_rate_limit_buckets', 'DELETE')
     or has_table_privilege('authenticated', 'private.county_hunter_rate_limit_buckets', 'SELECT')
     or has_table_privilege('authenticated', 'private.county_hunter_rate_limit_buckets', 'INSERT')
     or has_table_privilege('authenticated', 'private.county_hunter_rate_limit_buckets', 'UPDATE')
     or has_table_privilege('authenticated', 'private.county_hunter_rate_limit_buckets', 'DELETE')
     or has_table_privilege('service_role', 'private.county_hunter_rate_limit_buckets', 'SELECT')
     or has_table_privilege('service_role', 'private.county_hunter_rate_limit_buckets', 'INSERT')
     or has_table_privilege('service_role', 'private.county_hunter_rate_limit_buckets', 'UPDATE')
     or has_table_privilege('service_role', 'private.county_hunter_rate_limit_buckets', 'DELETE') then
    raise exception 'VERIFY_PRIVATE_SCHEMA_EXPOSURE';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema in ('public', 'private')
      and table_name like 'county_hunter_%'
      and column_name ~* '(private|secret).*(key)|key.*(private|secret)'
  ) then raise exception 'VERIFY_PRIVATE_KEY_STORAGE'; end if;

  if exists (select 1 from public.county_hunter_memberships)
     or exists (select 1 from public.county_hunter_auth_challenges)
     or exists (select 1 from public.county_hunter_states)
     or exists (select 1 from public.county_hunter_counties)
     or exists (select 1 from public.county_hunter_sources)
     or exists (select 1 from public.county_hunter_discovery_runs)
     or exists (select 1 from public.county_hunter_discovery_snapshots)
     or exists (select 1 from public.county_hunter_discovery_records)
     or exists (select 1 from public.county_hunter_discovery_changes) then
    raise exception 'VERIFY_UNEXPECTED_PRODUCTION_FIXTURE_OR_DISCOVERY_DATA';
  end if;
end
$county_hunter_verify$;
select 'VERIFY_OK';
'@

  $verificationFile = Join-Path ([System.IO.Path]::GetTempPath()) (
    'county-hunter-production-verify-' + [guid]::NewGuid().ToString('N') + '.sql'
  )
  try {
    Set-Content -LiteralPath $verificationFile -Value $verifySql -Encoding UTF8
    $result = Invoke-CountyHunterProductionPsql -Command $PsqlCommand -Arguments @(
      '-X', '-q', '-A', '-t',
      '-v', 'ON_ERROR_STOP=1',
      '-v', 'VERBOSITY=terse',
      '-f', $verificationFile
    ) -ProjectRef $ProjectRef
  } finally {
    Remove-Item -LiteralPath $verificationFile -Force -ErrorAction SilentlyContinue
  }
  if ($result.ExitCode -ne 0) {
    Write-SanitizedPsqlFailure -Result $result
    throw 'County Hunter production metadata verification failed.'
  }
  if (-not ($result.Output | ForEach-Object { $_.Trim() } | Where-Object { $_ -eq 'VERIFY_OK' })) {
    throw 'County Hunter production metadata verification returned an unexpected result.'
  }
}

$selectedModes = @($PreflightOnly, $MigrationsOnly, $VerifyOnly) | Where-Object { $_ }
if ($selectedModes.Count -ne 1) {
  throw 'Choose exactly one explicit mode: -PreflightOnly, -MigrationsOnly, or -VerifyOnly.'
}

$environmentValues = Read-CountyHunterProductionEnvironment -Path $productionEnvironmentPath
$issues = [System.Collections.Generic.List[string]]::new()

if (-not (Test-ProductionEnvironmentIsIgnored)) {
  $issues.Add('.env.production.local must be ignored by Git.')
}

$forbiddenNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($name in $environmentValues.Keys) {
  if ($name -match '^COUNTY_HUNTER_STAGING_' -or
      $name -match '^COUNTY_HUNTER_TEST_' -or
      $name -match '^COUNTY_HUNTER_.*PRIVATE_KEY$' -or
      $name -eq 'SUPABASE_SERVICE_ROLE_KEY') {
    [void]$forbiddenNames.Add($name)
  }
}
foreach ($entry in Get-ChildItem Env:) {
  if ($entry.Name -match '^COUNTY_HUNTER_STAGING_' -or
      $entry.Name -match '^COUNTY_HUNTER_TEST_' -or
      $entry.Name -match '^COUNTY_HUNTER_.*PRIVATE_KEY$' -or
      $entry.Name -eq 'SUPABASE_SERVICE_ROLE_KEY') {
    [void]$forbiddenNames.Add($entry.Name)
  }
}
if ($forbiddenNames.Count -gt 0) {
  $issues.Add('Staging, test, fixture private-key, or legacy service-role variables are forbidden in the production runner process.')
}

$confirmation = [string]$environmentValues['COUNTY_HUNTER_PRODUCTION_CONFIRM']
$projectRef = [string]$environmentValues['COUNTY_HUNTER_PRODUCTION_PROJECT_REF']
$databaseUrl = [string]$environmentValues['COUNTY_HUNTER_PRODUCTION_DB_URL']
$secretKey = [string]$environmentValues['COUNTY_HUNTER_SUPABASE_SECRET_KEY']

if ($confirmation -ne $requiredConfirmation) {
  $issues.Add('COUNTY_HUNTER_PRODUCTION_CONFIRM is missing or incorrect.')
}
if (Test-CountyHunterPlaceholder -Value $projectRef) {
  $issues.Add('COUNTY_HUNTER_PRODUCTION_PROJECT_REF is missing or is a placeholder.')
} elseif ($projectRef -notmatch '^[a-z0-9]{20}$') {
  $issues.Add('COUNTY_HUNTER_PRODUCTION_PROJECT_REF must be an exact 20-character project ref.')
} elseif ((Get-StringSha256 -Value $projectRef) -eq $knownStagingProjectRefSha256) {
  $issues.Add('The known staging project ref is forbidden.')
}
if (Test-CountyHunterPlaceholder -Value $databaseUrl) {
  $issues.Add('COUNTY_HUNTER_PRODUCTION_DB_URL is missing or is a placeholder.')
}
if (-not [string]::IsNullOrWhiteSpace($secretKey) -and
    ($secretKey -notmatch '^sb_secret_.+$' -or (Test-CountyHunterPlaceholder -Value $secretKey))) {
  $issues.Add('COUNTY_HUNTER_SUPABASE_SECRET_KEY is invalid.')
}

$databaseUri = $null
$databasePassword = $null
if (-not [string]::IsNullOrWhiteSpace($databaseUrl)) {
  try {
    $databaseUri = [uri]$databaseUrl
    $databaseUserInfo = $databaseUri.UserInfo
    $separator = $databaseUserInfo.IndexOf(':')
    if ($databaseUri.Scheme -notin @('postgres', 'postgresql')) {
      $issues.Add('COUNTY_HUNTER_PRODUCTION_DB_URL must use PostgreSQL.')
    }
    if (-not $databaseUri.Host -or $separator -lt 1 -or $databaseUri.AbsolutePath.Length -lt 2) {
      $issues.Add('COUNTY_HUNTER_PRODUCTION_DB_URL must contain host, database, user, and password.')
    } else {
      $databaseUser = [uri]::UnescapeDataString($databaseUserInfo.Substring(0, $separator))
      $databasePassword = [uri]::UnescapeDataString($databaseUserInfo.Substring($separator + 1))
      $databaseName = [uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart('/'))
      if ($databaseUser -ne 'postgres') { $issues.Add('The Direct Connection user must be postgres.') }
      if ($databaseName -ne 'postgres') { $issues.Add('The production database name must be postgres.') }
      if ([string]::IsNullOrWhiteSpace($databasePassword)) { $issues.Add('The production database password is missing.') }
    }
    if ($databaseUri.Host -match '\.pooler\.supabase\.com$' -or $databaseUri.Host -match '^aws-') {
      $issues.Add('Pooler endpoints are forbidden for production migrations.')
    }
    if ($databaseUri.Port -eq 6543) { $issues.Add('Port 6543 is forbidden.') }
    if ($databaseUri.Port -ne 5432) { $issues.Add('The Direct Connection must use port 5432.') }
    if ($projectRef -match '^[a-z0-9]{20}$' -and $databaseUri.Host -ne "db.$projectRef.supabase.co") {
      $issues.Add('The production database host does not match the confirmed project ref.')
    }
    if ($databaseUri.Fragment) { $issues.Add('The production database URL must not contain a fragment.') }
    if ($databaseUri.Query -and $databaseUri.Query -ne '?sslmode=require') {
      $issues.Add('The production database URL query may only require SSL.')
    }
  } catch {
    $issues.Add('COUNTY_HUNTER_PRODUCTION_DB_URL is not a valid URL.')
  }
}

$psqlCommand = Get-CountyHunterPsqlCommand
if (-not $psqlCommand) { $issues.Add('psql is required and was not found.') }

try {
  $null = Get-CountyHunterProductionMigrations
} catch {
  $issues.Add($_.Exception.Message)
}

if ($issues.Count -gt 0) {
  Write-Host 'PRODUCTION CONFIGURATION INCOMPLETE'
  $issues | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
  exit 1
}

$configuration = [pscustomobject]@{
  Host = $databaseUri.Host
  Password = $databasePassword
}
$previousPgEnvironment = Set-CountyHunterPostgresEnvironment -Configuration $configuration

try {
  $state = Invoke-CountyHunterProductionStateCheck -PsqlCommand $psqlCommand -ProjectRef $projectRef

  if ($PreflightOnly) {
    Write-Host 'READY FOR COUNTY HUNTER PRODUCTION MIGRATION VALIDATION'
    Write-Host 'ENV_FILE_LOADED=true'
    Write-Host 'CONFIRMATION_GATE=true'
    Write-Host 'DIRECT_CONNECTION=true'
    Write-Host 'PORT_5432=true'
    Write-Host 'SSL_REQUIRED=true'
    Write-Host 'STAGING_TEST_VARIABLES_ABSENT=true'
    Write-Host 'LEGACY_SERVICE_ROLE_ABSENT=true'
    Write-Host "PROJECT_STATE=$($state.Replace('PREFLIGHT_', ''))"
    return
  }

  if ($MigrationsOnly) {
    $migrationFiles = @(Get-CountyHunterProductionMigrations)
    $arguments = [System.Collections.Generic.List[string]]::new()
    foreach ($argument in @('-X', '-q', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=terse')) {
      $arguments.Add($argument)
    }
    foreach ($migration in $migrationFiles) {
      Write-Host "Queued migration $($migration.Name)"
      $arguments.Add('-f')
      $arguments.Add($migration.FullName)
    }

    $result = Invoke-CountyHunterProductionPsql -Command $psqlCommand -Arguments $arguments.ToArray() -ProjectRef $projectRef
    if ($result.ExitCode -ne 0) {
      Write-SanitizedPsqlFailure -Result $result
      throw 'County Hunter production migration transaction failed.'
    }
    Write-Host 'County Hunter production migrations completed in one controlled transaction.'
    Write-Host 'Fixtures, staging tests, users, memberships, and Discovery were not executed by the runner.'
    return
  }

  if ($state -ne 'PREFLIGHT_COMPATIBLE') {
    throw 'County Hunter production migrations are not present; -VerifyOnly cannot continue.'
  }
  Invoke-CountyHunterProductionVerification -PsqlCommand $psqlCommand -ProjectRef $projectRef
  Write-Host 'COUNTY HUNTER PRODUCTION METADATA VERIFIED'
  Write-Host 'RLS_ENABLED=true'
  Write-Host 'SECURITY_DEFINER_GRANTS_APPROVED=true'
  Write-Host 'SIWE_SERVICE_ROLE_ONLY=true'
  Write-Host 'BOOTSTRAP_REPLAY_AUTHENTICATED_ONLY=true'
  Write-Host 'PRIVATE_RATE_LIMIT_SERVICE_ROLE_ONLY=true'
  Write-Host 'STAGING_FIXTURES_ABSENT=true'
  Write-Host 'DISCOVERY_NOT_EXECUTED=true'
} finally {
  Restore-CountyHunterPostgresEnvironment -Previous $previousPgEnvironment
}
