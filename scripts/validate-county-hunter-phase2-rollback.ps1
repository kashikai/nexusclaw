[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresBin,

  [string]$DatabaseHost = '127.0.0.1',
  [int]$Port = 55439,
  [string]$DatabaseName = 'county_hunter_disposable_phase2_gate',
  [string]$DatabaseUser = 'postgres',
  [string]$BackupPath = 'C:\dev\backups\county-hunter-phase2-disposable-before-rollback.dump'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$migrationRoot = Join-Path $repoRoot 'supabase\migrations'
$testRoot = Join-Path $repoRoot 'supabase\tests'
$rollbackPath = Join-Path $repoRoot 'supabase\rollback\county_hunter_phase2.sql'

if ($DatabaseHost -notin @('127.0.0.1', 'localhost')) {
  throw 'Destructive Phase 2 validation requires a loopback database host.'
}
if ($DatabaseName -notmatch '^county_hunter_disposable_[a-z0-9_]+$') {
  throw 'Destructive Phase 2 validation requires a disposable database name.'
}
if ($Port -lt 1024 -or $Port -gt 65535) {
  throw 'Disposable database port is invalid.'
}

$tools = @{}
foreach ($name in @('psql', 'createdb', 'dropdb', 'pg_dump', 'pg_restore')) {
  $path = Join-Path $PostgresBin "$name.exe"
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required PostgreSQL tool is missing: $name"
  }
  $tools[$name] = $path
}

$phase1Migrations = @(
  '202607230001_county_hunter_foundation.sql',
  '202607230002_county_hunter_rls.sql',
  '202607230003_county_hunter_seed_counties.sql',
  '202607230004_county_hunter_auth_hardening.sql',
  '202607230005_county_hunter_wallet_auth.sql'
)
$phase2Migrations = @(
  '20260726153642_county_hunter_gwinnett_discovery.sql',
  '20260726160827_county_hunter_gwinnett_discovery_rpc_fix.sql',
  '20260726174825_county_hunter_snapshot_replay.sql'
)

foreach ($migration in $phase1Migrations + $phase2Migrations) {
  if (-not (Test-Path -LiteralPath (Join-Path $migrationRoot $migration))) {
    throw "Required migration is missing: $migration"
  }
}

$fixtureValues = [ordered]@{
  org_a = '10000000-0000-4000-8000-000000000001'
  org_b = '20000000-0000-4000-8000-000000000002'
  viewer_a = '30000000-0000-4000-8000-000000000003'
  manager_a = '40000000-0000-4000-8000-000000000004'
  admin_a = '50000000-0000-4000-8000-000000000005'
  admin_b = '60000000-0000-4000-8000-000000000006'
}

function Invoke-PostgresCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Database,

    [Parameter(Mandatory = $true)]
    [string[]]$CommandArguments
  )

  & $tools.psql `
    -X `
    --no-psqlrc `
    -q `
    -o NUL `
    -h $DatabaseHost `
    -p $Port `
    -U $DatabaseUser `
    -d $Database `
    -v ON_ERROR_STOP=1 `
    @CommandArguments
  if ($LASTEXITCODE -ne 0) {
    throw 'A disposable PostgreSQL command failed.'
  }
}

function Invoke-PostgresFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Stage,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [switch]$WithFixtures
  )

  Write-Host "$Stage..."
  $arguments = @('-f', $Path)
  if ($WithFixtures) {
    foreach ($entry in $fixtureValues.GetEnumerator()) {
      $arguments += @('-v', "$($entry.Key)=$($entry.Value)")
    }
  }
  Invoke-PostgresCommand -Database $DatabaseName -CommandArguments $arguments
}

$databaseCreated = $false
try {
  $existing = & $tools.psql `
    -X `
    --no-psqlrc `
    -qAt `
    -h $DatabaseHost `
    -p $Port `
    -U $DatabaseUser `
    -d postgres `
    -v ON_ERROR_STOP=1 `
    -c "select 1 from pg_database where datname = '$DatabaseName'"
  if ($LASTEXITCODE -ne 0) {
    throw 'Disposable PostgreSQL preflight failed.'
  }
  if ($existing -eq '1') {
    throw 'Refusing to reuse an existing disposable database.'
  }

  & $tools.createdb `
    -h $DatabaseHost `
    -p $Port `
    -U $DatabaseUser `
    -T template0 `
    --encoding UTF8 `
    $DatabaseName
  if ($LASTEXITCODE -ne 0) {
    throw 'Disposable database creation failed.'
  }
  $databaseCreated = $true

  Invoke-PostgresCommand -Database $DatabaseName -CommandArguments @(
    '-c',
    @"
do `$`$
begin
  if current_database() !~ '^county_hunter_disposable_'
     or inet_server_addr() not in ('127.0.0.1'::inet, '::1'::inet) then
    raise exception 'Disposable database identity check failed';
  end if;
end;
`$`$;
"@
  )
  Write-Host 'Disposable database guard passed.'

  Invoke-PostgresFile `
    -Stage 'Installing the minimal disposable Supabase Auth prelude' `
    -Path (Join-Path $testRoot 'county_hunter_disposable_supabase_prelude.sql')

  foreach ($migration in $phase1Migrations) {
    Invoke-PostgresFile `
      -Stage "Applying Phase 1 migration $migration" `
      -Path (Join-Path $migrationRoot $migration)
  }

  Invoke-PostgresFile `
    -Stage 'Creating disposable tenants, users, memberships and Phase 1 bootstrap' `
    -Path (Join-Path $testRoot 'county_hunter_disposable_identities.sql') `
    -WithFixtures

  foreach ($migration in $phase2Migrations) {
    Invoke-PostgresFile `
      -Stage "Applying Phase 2 migration $migration" `
      -Path (Join-Path $migrationRoot $migration)
  }

  Invoke-PostgresFile `
    -Stage 'Running the complete RLS matrix before rollback' `
    -Path (Join-Path $testRoot 'county_hunter_rls_test.sql') `
    -WithFixtures

  Invoke-PostgresFile `
    -Stage 'Persisting the disposable 25-record Discovery and replay fixture' `
    -Path (Join-Path $testRoot 'county_hunter_disposable_phase2_fixture.sql') `
    -WithFixtures

  $backupDirectory = Split-Path -Parent $BackupPath
  if (-not (Test-Path -LiteralPath $backupDirectory)) {
    New-Item -ItemType Directory -Path $backupDirectory | Out-Null
  }
  if (Test-Path -LiteralPath $BackupPath) {
    throw 'Refusing to overwrite an existing disposable database backup.'
  }

  Write-Host 'Creating and verifying the pre-rollback logical backup...'
  & $tools.pg_dump `
    -h $DatabaseHost `
    -p $Port `
    -U $DatabaseUser `
    -d $DatabaseName `
    --format custom `
    --file $BackupPath
  if ($LASTEXITCODE -ne 0) {
    throw 'Disposable logical backup failed.'
  }
  & $tools.pg_restore --list $BackupPath | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Disposable logical backup verification failed.'
  }

  Write-Host 'Executing the destructive Phase 2 rollback...'
  Invoke-PostgresCommand -Database $DatabaseName -CommandArguments @(
    '-c',
    "set county_hunter.allow_destructive_phase2_rollback = 'YES'",
    '-f',
    $rollbackPath
  )

  Invoke-PostgresFile `
    -Stage 'Validating Phase 2 removal and Phase 1 preservation' `
    -Path (Join-Path $testRoot 'county_hunter_disposable_post_rollback.sql') `
    -WithFixtures

  foreach ($migration in $phase2Migrations) {
    Invoke-PostgresFile `
      -Stage "Reapplying Phase 2 migration $migration" `
      -Path (Join-Path $migrationRoot $migration)
  }

  Invoke-PostgresFile `
    -Stage 'Repeating the complete RLS matrix after reapply' `
    -Path (Join-Path $testRoot 'county_hunter_rls_test.sql') `
    -WithFixtures

  Invoke-PostgresFile `
    -Stage 'Repeating the 25-record Discovery and replay fixture after reapply' `
    -Path (Join-Path $testRoot 'county_hunter_disposable_phase2_fixture.sql') `
    -WithFixtures

  Write-Host 'County Hunter destructive Phase 2 rollback and reapply passed.'
}
finally {
  if ($databaseCreated) {
    & $tools.dropdb `
      -h $DatabaseHost `
      -p $Port `
      -U $DatabaseUser `
      --if-exists `
      $DatabaseName
    if ($LASTEXITCODE -ne 0) {
      Write-Warning 'The disposable database could not be removed automatically.'
    }
    else {
      Write-Host 'Disposable database removed.'
    }
  }
}
