param(
  [switch]$PreflightOnly,
  [switch]$TestConnectivity,
  [switch]$MigrationsOnly,
  [switch]$RlsOnly,
  [switch]$StrictAdminKey,
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
  param(
    [string]$Path,
    [string[]]$ExcludedNames = @()
  )
  if (-not (Test-Path -LiteralPath $Path)) { return }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') { continue }
    $name = $Matches[1]
    if ($name -in $ExcludedNames) { continue }
    if (Test-Path "Env:$name") { continue }
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    Set-Item -Path "Env:$name" -Value $value
  }
}

function Protect-CountyHunterRunnerOutput {
  param([string]$Text)
  if ($null -eq $Text) { return '' }

  return $Text `
    -replace 'postgres(?:ql)?://\S+', '[redacted-database-url]' `
    -replace '(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b', '[redacted-uuid]' `
    -replace '(?i)\b0x[0-9a-f]{40,}\b', '[redacted-wallet-or-key]' `
    -replace '(?i)\b(?:eyJ|sb_(?:publishable|secret)_)[A-Za-z0-9._-]{12,}\b', '[redacted-token]'
}

function Resolve-CountyHunterAdminKeySource {
  param(
    [System.Collections.Generic.List[string]]$Issues,
    [bool]$StrictLegacy
  )

  $secretKey = [string]$env:SUPABASE_SECRET_KEY
  $legacyKey = [string]$env:SUPABASE_SERVICE_ROLE_KEY

  if ($StrictLegacy -and -not [string]::IsNullOrWhiteSpace($legacyKey)) {
    $Issues.Add('SUPABASE_SERVICE_ROLE_KEY is rejected in strict admin-key mode.')
    return $null
  }

  if (-not [string]::IsNullOrWhiteSpace($secretKey)) {
    if ($secretKey -notmatch '^sb_secret_.+$') {
      $Issues.Add('SUPABASE_SECRET_KEY must use the Supabase secret-key format.')
      return $null
    }
    return 'SUPABASE_SECRET_KEY'
  }

  if (-not [string]::IsNullOrWhiteSpace($legacyKey)) {
    Write-Warning 'SUPABASE_SERVICE_ROLE_KEY is deprecated; configure SUPABASE_SECRET_KEY. No key value was logged.'
    return 'SUPABASE_SERVICE_ROLE_KEY'
  }

  $Issues.Add('SUPABASE_SECRET_KEY is missing; the deprecated legacy fallback is not configured.')
  return $null
}

function Invoke-CountyHunterPsql {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    # Windows PowerShell promotes native stderr to ErrorRecord. Capture it first so
    # every line passes through the same redaction boundary before it is displayed.
    $ErrorActionPreference = 'Continue'
    $commandOutput = & $Command @Arguments 2>&1
    $commandExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  foreach ($line in $commandOutput) {
    Write-Host (Protect-CountyHunterRunnerOutput ([string]$line))
  }
  return $commandExitCode
}

$stagingEnvironmentPath = Join-Path $repositoryRoot '.env.staging.local'
$strictAdminKeyRequested =
  $StrictAdminKey -or $env:COUNTY_HUNTER_STRICT_ADMIN_KEY -eq 'true'
$excludedEnvironmentNames =
  if ($strictAdminKeyRequested) { @('SUPABASE_SERVICE_ROLE_KEY') } else { @() }
Import-CountyHunterEnvFile `
  -Path $stagingEnvironmentPath `
  -ExcludedNames $excludedEnvironmentNames

if (-not $DatabaseUrl) { $DatabaseUrl = $env:COUNTY_HUNTER_STAGING_DB_URL }
if (-not $ProjectRef) { $ProjectRef = $env:COUNTY_HUNTER_STAGING_PROJECT_REF }
if (-not $OrganizationA) { $OrganizationA = $env:COUNTY_HUNTER_TEST_ORG_A }
if (-not $OrganizationB) { $OrganizationB = $env:COUNTY_HUNTER_TEST_ORG_B }
if (-not $ViewerA) { $ViewerA = $env:COUNTY_HUNTER_TEST_VIEWER_A }
if (-not $ManagerA) { $ManagerA = $env:COUNTY_HUNTER_TEST_MANAGER_A }
if (-not $AdminA) { $AdminA = $env:COUNTY_HUNTER_TEST_ADMIN_A }
if (-not $AdminB) { $AdminB = $env:COUNTY_HUNTER_TEST_ADMIN_B }

$selectedModes = @($PreflightOnly, $MigrationsOnly, $RlsOnly) | Where-Object { $_ }
if ($selectedModes.Count -gt 1) {
  throw 'Choose exactly one mode: -PreflightOnly, -MigrationsOnly, or -RlsOnly.'
}
if ($TestConnectivity -and -not $PreflightOnly) {
  throw '-TestConnectivity is allowed only with -PreflightOnly.'
}
if (-not $PreflightOnly -and -not $MigrationsOnly -and -not $RlsOnly) {
  throw 'No implicit full mode is allowed. Run -MigrationsOnly and -RlsOnly as separate explicit steps.'
}

if ($PreflightOnly) {
  $issues = [System.Collections.Generic.List[string]]::new()
  if (
    $env:COUNTY_HUNTER_STRICT_ADMIN_KEY -and
    $env:COUNTY_HUNTER_STRICT_ADMIN_KEY -notin @('true', 'false')
  ) {
    $issues.Add('COUNTY_HUNTER_STRICT_ADMIN_KEY must be true or false.')
  }
  $adminKeySource = Resolve-CountyHunterAdminKeySource `
    -Issues $issues `
    -StrictLegacy $strictAdminKeyRequested

  $requiredEnvironment = [ordered]@{
    NEXT_PUBLIC_SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    COUNTY_HUNTER_STAGING_DB_URL = $DatabaseUrl
    COUNTY_HUNTER_AUTH_ORIGIN = $env:COUNTY_HUNTER_AUTH_ORIGIN
    COUNTY_HUNTER_STAGING_PROJECT_REF = $ProjectRef
    COUNTY_HUNTER_STAGING_CONFIRM = $env:COUNTY_HUNTER_STAGING_CONFIRM
    COUNTY_HUNTER_TEST_ORG_A = $OrganizationA
    COUNTY_HUNTER_TEST_ORG_B = $OrganizationB
    COUNTY_HUNTER_TEST_VIEWER_A = $ViewerA
    COUNTY_HUNTER_TEST_MANAGER_A = $ManagerA
    COUNTY_HUNTER_TEST_ADMIN_A = $AdminA
    COUNTY_HUNTER_TEST_ADMIN_B = $AdminB
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

  $organizationAId = [guid]::Empty
  $organizationBId = [guid]::Empty
  $organizationAIsValid = $false
  $organizationBIsValid = $false
  if ($OrganizationA) {
    $organizationAIsValid = [guid]::TryParse($OrganizationA, [ref]$organizationAId)
    if (-not $organizationAIsValid) {
      $issues.Add('COUNTY_HUNTER_TEST_ORG_A must be a valid UUID.')
    }
  }
  if ($OrganizationB) {
    $organizationBIsValid = [guid]::TryParse($OrganizationB, [ref]$organizationBId)
    if (-not $organizationBIsValid) {
      $issues.Add('COUNTY_HUNTER_TEST_ORG_B must be a valid UUID.')
    }
  }
  if ($organizationAIsValid -and $organizationBIsValid -and $organizationAId -eq $organizationBId) {
    $issues.Add('COUNTY_HUNTER_TEST_ORG_A and COUNTY_HUNTER_TEST_ORG_B must be distinct.')
  }

  $fixtureUserIds = @($ViewerA, $ManagerA, $AdminA, $AdminB)
  foreach ($fixtureUserId in $fixtureUserIds) {
    $parsedFixtureUserId = [guid]::Empty
    if ($fixtureUserId -and -not [guid]::TryParse($fixtureUserId, [ref]$parsedFixtureUserId)) {
      $issues.Add('All County Hunter fixture user identifiers must be valid UUIDs.')
      break
    }
  }
  if (($fixtureUserIds | Where-Object { $_ } | Select-Object -Unique).Count -ne 4) {
    $issues.Add('The four County Hunter fixture user identifiers must be distinct.')
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
      if (
        $databaseUri.Host -match '\.pooler\.supabase\.com$' -or
        $databaseUri.Host -ne "db.$ProjectRef.supabase.co" -or
        $databaseUser -ne 'postgres' -or
        $databaseUri.Port -ne 5432
      ) {
        $issues.Add('COUNTY_HUNTER_STAGING_DB_URL must use the Direct Connection on port 5432.')
      }
    } catch {
      $issues.Add('COUNTY_HUNTER_STAGING_DB_URL is not a valid URL.')
    }
  }

  $apiUri = $null
  if ($env:NEXT_PUBLIC_SUPABASE_URL) {
    try {
      $apiUri = [uri]$env:NEXT_PUBLIC_SUPABASE_URL
      if (
        $apiUri.Scheme -ne 'https' -or
        $apiUri.AbsolutePath -ne '/' -or
        $apiUri.Query -or
        $apiUri.Fragment -or
        $apiUri.UserInfo
      ) {
        $issues.Add('NEXT_PUBLIC_SUPABASE_URL must be an HTTPS origin without a path, query, fragment, or credentials.')
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
if (
  $databaseUri.Host -match '\.pooler\.supabase\.com$' -or
  $databaseUri.Host -ne "db.$ProjectRef.supabase.co" -or
  $databaseUser -ne 'postgres' -or
  $databaseUri.Port -ne 5432
) {
  throw 'The staging runner requires the Direct Connection on port 5432 and refuses pooler endpoints.'
}

if ($env:NEXT_PUBLIC_SUPABASE_URL) {
  try { $apiUri = [uri]$env:NEXT_PUBLIC_SUPABASE_URL } catch { throw 'NEXT_PUBLIC_SUPABASE_URL is invalid.' }
  if (
    $apiUri.Scheme -ne 'https' -or
    $apiUri.AbsolutePath -ne '/' -or
    $apiUri.Query -or
    $apiUri.Fragment -or
    $apiUri.UserInfo
  ) {
    throw 'NEXT_PUBLIC_SUPABASE_URL must be an HTTPS origin without a path, query, fragment, or credentials.'
  }
  if ($apiUri.Host -ne "$ProjectRef.supabase.co") {
    throw 'NEXT_PUBLIC_SUPABASE_URL and the confirmed staging project ref do not match.'
  }
}

if ($RlsOnly) {
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

$previousPgEnvironment = @{}
foreach ($name in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGGSSENCMODE')) {
  $previousPgEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  $env:PGHOST = $databaseUri.Host
  $env:PGPORT = if ($databaseUri.Port -gt 0) { $databaseUri.Port.ToString() } else { '5432' }
  $env:PGUSER = $databaseUser
  $env:PGPASSWORD = $databasePassword
  $env:PGDATABASE = $databaseName
  $env:PGSSLMODE = 'require'
  $env:PGGSSENCMODE = 'disable'

  if ($MigrationsOnly) {
    $migrationDirectory = Join-Path $repositoryRoot 'supabase\migrations'
    Get-ChildItem -LiteralPath $migrationDirectory -Filter '*.sql' |
      Sort-Object Name |
      ForEach-Object {
        Write-Host "Applying migration $($_.Name) to the confirmed staging project..."
        $migrationExitCode = Invoke-CountyHunterPsql -Command $psqlCommand -Arguments @(
          '-X',
          '-q',
          '--single-transaction',
          '-v', 'ON_ERROR_STOP=1',
          '-v', 'VERBOSITY=terse',
          '-f', $_.FullName
        )
        if ($migrationExitCode -ne 0) { throw "Migration failed: $($_.Name)" }
      }
    Write-Host 'County Hunter staging migrations completed successfully; RLS fixtures were not requested.'
    return
  }

  $testScript = Join-Path $repositoryRoot 'supabase\tests\county_hunter_rls_test.sql'
  $testScriptContents = Get-Content -Raw -LiteralPath $testScript
  if (
    $testScriptContents -notmatch '(?im)^\s*begin\s*;' -or
    $testScriptContents -notmatch '(?im)^\s*rollback\s*;' -or
    $testScriptContents -match '(?im)^\s*commit\s*;'
  ) {
    throw 'The County Hunter RLS test must contain BEGIN and ROLLBACK and must not contain COMMIT.'
  }

  Write-Host 'Running two-organization/four-user RLS validation in a rollback-only transaction...'
  $rlsExitCode = Invoke-CountyHunterPsql -Command $psqlCommand -Arguments @(
    '-X',
    '-q',
    '-v', 'ON_ERROR_STOP=1',
    '-v', 'VERBOSITY=terse',
    '-v', "org_a=$OrganizationA",
    '-v', "org_b=$OrganizationB",
    '-v', "viewer_a=$ViewerA",
    '-v', "manager_a=$ManagerA",
    '-v', "admin_a=$AdminA",
    '-v', "admin_b=$AdminB",
    '-f', $testScript
  )
  if ($rlsExitCode -ne 0) { throw 'County Hunter staging RLS validation failed.' }
} finally {
  foreach ($name in $previousPgEnvironment.Keys) {
    $value = $previousPgEnvironment[$name]
    if ($null -eq $value) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
    else { Set-Item -Path "Env:$name" -Value $value }
  }
}

Write-Host 'County Hunter staging RLS-only validation completed successfully.'
