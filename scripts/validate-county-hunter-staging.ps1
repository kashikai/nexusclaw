param(
  [switch]$PreflightOnly,
  [switch]$TestConnectivity,
  [switch]$MigrationsOnly,
  [string]$DatabaseUrl,
  [string]$ProjectRef,
  [string]$OrganizationA,
  [string]$OrganizationB,
  [string]$ViewerA,
  [string]$ManagerA,
  [string]$AdminA,
  [string]$AdminB
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot

function Import-CountyHunterEnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') { continue }
    $name = $Matches[1]
    if (Test-Path "Env:$name") { continue }
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "Env:$name" -Value $value
  }
}

Import-CountyHunterEnvFile (Join-Path $repositoryRoot '.env.staging.local')

if (-not $DatabaseUrl) { $DatabaseUrl = $env:COUNTY_HUNTER_STAGING_DB_URL }
if (-not $ProjectRef) { $ProjectRef = $env:COUNTY_HUNTER_STAGING_PROJECT_REF }
if (-not $OrganizationA) { $OrganizationA = $env:COUNTY_HUNTER_TEST_ORG_A }
if (-not $OrganizationB) { $OrganizationB = $env:COUNTY_HUNTER_TEST_ORG_B }
if (-not $ViewerA) { $ViewerA = $env:COUNTY_HUNTER_TEST_VIEWER_A }
if (-not $ManagerA) { $ManagerA = $env:COUNTY_HUNTER_TEST_MANAGER_A }
if (-not $AdminA) { $AdminA = $env:COUNTY_HUNTER_TEST_ADMIN_A }
if (-not $AdminB) { $AdminB = $env:COUNTY_HUNTER_TEST_ADMIN_B }

if ($TestConnectivity -and -not $PreflightOnly) {
  throw '-TestConnectivity is allowed only with -PreflightOnly.'
}

if ($PreflightOnly) {
  $issues = [System.Collections.Generic.List[string]]::new()
  $requiredEnvironment = [ordered]@{
    NEXT_PUBLIC_SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
    COUNTY_HUNTER_STAGING_DB_URL = $DatabaseUrl
    COUNTY_HUNTER_AUTH_ORIGIN = $env:COUNTY_HUNTER_AUTH_ORIGIN
    COUNTY_HUNTER_STAGING_PROJECT_REF = $ProjectRef
    COUNTY_HUNTER_STAGING_CONFIRM = $env:COUNTY_HUNTER_STAGING_CONFIRM
    COUNTY_HUNTER_ENABLED = $env:COUNTY_HUNTER_ENABLED
    NEXT_PUBLIC_COUNTY_HUNTER_ENABLED = $env:NEXT_PUBLIC_COUNTY_HUNTER_ENABLED
  }

  foreach ($entry in $requiredEnvironment.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([string]$entry.Value)) {
      $issues.Add("$($entry.Key) is missing.")
    }
  }

  if ($env:COUNTY_HUNTER_STAGING_CONFIRM -and $env:COUNTY_HUNTER_STAGING_CONFIRM -ne 'STAGING_ONLY') {
    $issues.Add('COUNTY_HUNTER_STAGING_CONFIRM must be STAGING_ONLY.')
  }
  if ($env:COUNTY_HUNTER_ENABLED -and $env:COUNTY_HUNTER_ENABLED -ne 'true') {
    $issues.Add('COUNTY_HUNTER_ENABLED must be true for staging validation.')
  }
  if ($env:NEXT_PUBLIC_COUNTY_HUNTER_ENABLED -and $env:NEXT_PUBLIC_COUNTY_HUNTER_ENABLED -ne 'true') {
    $issues.Add('NEXT_PUBLIC_COUNTY_HUNTER_ENABLED must be true for staging validation.')
  }
  if ($ProjectRef -and $ProjectRef -notmatch '^[a-z0-9]{20}$') {
    $issues.Add('COUNTY_HUNTER_STAGING_PROJECT_REF must be a 20-character project ref.')
  }

  $databaseUri = $null
  $databaseUser = $null
  if ($DatabaseUrl) {
    try {
      $databaseUri = [uri]$DatabaseUrl
      if ($databaseUri.Scheme -notin @('postgres', 'postgresql')) {
        $issues.Add('COUNTY_HUNTER_STAGING_DB_URL must use the postgres or postgresql scheme.')
      }
      $databaseUserInfo = $databaseUri.UserInfo
      $separator = $databaseUserInfo.IndexOf(':')
      if (-not $databaseUri.Host -or $separator -lt 1 -or $databaseUri.AbsolutePath.Length -lt 2) {
        $issues.Add('COUNTY_HUNTER_STAGING_DB_URL must include host, database, user, and password.')
      } else {
        $databaseUser = [uri]::UnescapeDataString($databaseUserInfo.Substring(0, $separator))
      }
      if ($databaseUri.Host -notmatch '(\.supabase\.co|\.supabase\.com)$') {
        $issues.Add('COUNTY_HUNTER_STAGING_DB_URL must use a dedicated Supabase host.')
      }
    } catch {
      $issues.Add('COUNTY_HUNTER_STAGING_DB_URL is not a valid URL.')
    }
  }

  $apiUri = $null
  if ($env:NEXT_PUBLIC_SUPABASE_URL) {
    try {
      $apiUri = [uri]$env:NEXT_PUBLIC_SUPABASE_URL
      if ($apiUri.Scheme -ne 'https') {
        $issues.Add('NEXT_PUBLIC_SUPABASE_URL must use HTTPS.')
      }
    } catch {
      $issues.Add('NEXT_PUBLIC_SUPABASE_URL is not a valid URL.')
    }
  }

  $authUri = $null
  if ($env:COUNTY_HUNTER_AUTH_ORIGIN) {
    try {
      $authUri = [uri]$env:COUNTY_HUNTER_AUTH_ORIGIN
      if ($authUri.Scheme -ne 'https' -or $authUri.AbsolutePath -ne '/') {
        $issues.Add('COUNTY_HUNTER_AUTH_ORIGIN must be an HTTPS origin without a path.')
      }
    } catch {
      $issues.Add('COUNTY_HUNTER_AUTH_ORIGIN is not a valid origin.')
    }
  }

  if ($ProjectRef -match '^[a-z0-9]{20}$') {
    if ($databaseUri -and $databaseUser) {
      $databaseIdentity = "$($databaseUri.Host):$databaseUser".ToLowerInvariant()
      if (-not $databaseIdentity.Contains($ProjectRef.ToLowerInvariant())) {
        $issues.Add('The database endpoint does not match COUNTY_HUNTER_STAGING_PROJECT_REF.')
      }
    }
    if ($apiUri -and $apiUri.Host -ne "$ProjectRef.supabase.co") {
      $issues.Add('NEXT_PUBLIC_SUPABASE_URL does not match COUNTY_HUNTER_STAGING_PROJECT_REF.')
    }
  }

  $productionMarker = '(^|[._-])prod(uction)?([._-]|$)'
  foreach ($identifier in @(
      $ProjectRef,
      $(if ($databaseUri) { $databaseUri.Host }),
      $databaseUser,
      $(if ($apiUri) { $apiUri.Host }),
      $(if ($authUri) { $authUri.Host })
    )) {
    if ($identifier -and $identifier.ToLowerInvariant() -match $productionMarker) {
      $issues.Add('A staging host or identifier is explicitly marked as production.')
      break
    }
  }

  if ($TestConnectivity -and $issues.Count -eq 0) {
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (-not $psqlCommand) {
      $localClient = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'PostgreSQL\17-client\bin\psql.exe'
      if (Test-Path -LiteralPath $localClient) { $psqlCommand = $localClient }
    }
    if (-not $psqlCommand) {
      $issues.Add('psql is required for the explicitly requested connectivity test.')
    } else {
      $databaseUserInfo = $databaseUri.UserInfo
      $separator = $databaseUserInfo.IndexOf(':')
      $databasePassword = [uri]::UnescapeDataString($databaseUserInfo.Substring($separator + 1))
      $databaseName = [uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart('/'))
      $previousPgEnvironment = @{}
      foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE')) {
        $previousPgEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
      }
      try {
        $env:PGHOST = $databaseUri.Host
        $env:PGPORT = if ($databaseUri.Port -gt 0) { $databaseUri.Port.ToString() } else { '5432' }
        $env:PGUSER = $databaseUser
        $env:PGPASSWORD = $databasePassword
        $env:PGDATABASE = $databaseName
        $env:PGSSLMODE = 'require'
        & $psqlCommand -X -v ON_ERROR_STOP=1 -c 'select 1;' *> $null
        if ($LASTEXITCODE -ne 0) {
          $issues.Add('The explicitly requested read-only staging connectivity test failed.')
        }
      } finally {
        foreach ($name in $previousPgEnvironment.Keys) {
          $value = $previousPgEnvironment[$name]
          if ($null -eq $value) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
          else { Set-Item -Path "Env:$name" -Value $value }
        }
      }
    }
  }

  if ($issues.Count -gt 0) {
    Write-Host 'STAGING CONFIGURATION INCOMPLETE'
    $issues | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
    exit 1
  }

  Write-Host 'READY FOR STAGING VALIDATION'
  exit 0
}

if ($env:COUNTY_HUNTER_STAGING_CONFIRM -ne 'STAGING_ONLY') {
  throw 'Set COUNTY_HUNTER_STAGING_CONFIRM=STAGING_ONLY. Never run this script against production.'
}
if (-not $DatabaseUrl) { throw 'COUNTY_HUNTER_STAGING_DB_URL is required.' }
if ($ProjectRef -notmatch '^[a-z0-9]{20}$') {
  throw 'COUNTY_HUNTER_STAGING_PROJECT_REF must be the exact 20-character staging project ref.'
}
$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $psqlCommand) {
  $localClient = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'PostgreSQL\17-client\bin\psql.exe'
  if (Test-Path -LiteralPath $localClient) { $psqlCommand = $localClient }
}
if (-not $psqlCommand) {
  throw 'psql is required and was not found on PATH.'
}

try {
  $databaseUri = [uri]$DatabaseUrl
} catch {
  throw 'COUNTY_HUNTER_STAGING_DB_URL is not a valid PostgreSQL URL.'
}
if ($databaseUri.Scheme -notin @('postgres', 'postgresql')) {
  throw 'COUNTY_HUNTER_STAGING_DB_URL must use the postgres or postgresql scheme.'
}
$databaseUserInfo = $databaseUri.UserInfo
$separator = $databaseUserInfo.IndexOf(':')
if (-not $databaseUri.Host -or $separator -lt 1 -or $databaseUri.AbsolutePath.Length -lt 2) {
  throw 'The staging database URL must include host, database, user, and password.'
}
$databaseUser = [uri]::UnescapeDataString($databaseUserInfo.Substring(0, $separator))
$databasePassword = [uri]::UnescapeDataString($databaseUserInfo.Substring($separator + 1))
$databaseName = [uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart('/'))
$stagingIdentity = "$($databaseUri.Host):$databaseUser".ToLowerInvariant()
if (-not $stagingIdentity.Contains($ProjectRef.ToLowerInvariant())) {
  throw 'The database host/user does not match COUNTY_HUNTER_STAGING_PROJECT_REF. Refusing to continue.'
}
if ($databaseUri.Host -notmatch '(\.supabase\.co|\.supabase\.com)$') {
  throw 'The remote validation runner accepts only a dedicated Supabase staging host.'
}

if ($env:NEXT_PUBLIC_SUPABASE_URL) {
  try { $apiUri = [uri]$env:NEXT_PUBLIC_SUPABASE_URL } catch { throw 'NEXT_PUBLIC_SUPABASE_URL is invalid.' }
  if ($apiUri.Host -ne "$ProjectRef.supabase.co") {
    throw 'NEXT_PUBLIC_SUPABASE_URL and the confirmed staging project ref do not match.'
  }
}

if (-not $MigrationsOnly) {
  $identifiers = @($OrganizationA, $OrganizationB, $ViewerA, $ManagerA, $AdminA, $AdminB)
  foreach ($identifier in $identifiers) {
    $parsed = [guid]::Empty
    if (-not [guid]::TryParse($identifier, [ref]$parsed)) {
      throw 'All organization and user test identifiers must be valid UUIDs.'
    }
  }
  if ($OrganizationA -eq $OrganizationB) { throw 'The two test organizations must be distinct.' }
  $uniqueUsers = @($ViewerA, $ManagerA, $AdminA, $AdminB) | Select-Object -Unique
  if ($uniqueUsers.Count -ne 4) { throw 'The four staging users must be distinct.' }
}

$migrationDirectory = Join-Path $repositoryRoot 'supabase\migrations'
$testScript = Join-Path $repositoryRoot 'supabase\tests\county_hunter_rls_test.sql'
$previousPgEnvironment = @{}
foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE')) {
  $previousPgEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  $env:PGHOST = $databaseUri.Host
  $env:PGPORT = if ($databaseUri.Port -gt 0) { $databaseUri.Port.ToString() } else { '5432' }
  $env:PGUSER = $databaseUser
  $env:PGPASSWORD = $databasePassword
  $env:PGDATABASE = $databaseName
  $env:PGSSLMODE = 'require'

  Get-ChildItem -LiteralPath $migrationDirectory -Filter '*.sql' |
    Sort-Object Name |
    ForEach-Object {
      Write-Host "Applying migration $($_.Name) to the confirmed staging project $ProjectRef..."
      & $psqlCommand -X -v ON_ERROR_STOP=1 -f $_.FullName
      if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
    }

  if ($MigrationsOnly) {
    Write-Host 'County Hunter staging migrations completed successfully; RLS fixtures were not requested.'
    return
  }

  Write-Host 'Running two-organization/four-user RLS validation in a rollback-only transaction...'
  & $psqlCommand -X -v ON_ERROR_STOP=1 `
    -v "org_a=$OrganizationA" `
    -v "org_b=$OrganizationB" `
    -v "viewer_a=$ViewerA" `
    -v "manager_a=$ManagerA" `
    -v "admin_a=$AdminA" `
    -v "admin_b=$AdminB" `
    -f $testScript
  if ($LASTEXITCODE -ne 0) { throw 'County Hunter staging RLS validation failed.' }
} finally {
  foreach ($name in $previousPgEnvironment.Keys) {
    $value = $previousPgEnvironment[$name]
    if ($null -eq $value) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
    else { Set-Item -Path "Env:$name" -Value $value }
  }
}

Write-Host 'County Hunter staging validation completed successfully.'
