[CmdletBinding()]
param(
    [ValidateSet("Quick", "PR", "Full")]
    [string]$Level = "Quick",

    [ValidateSet("Docs", "Frontend", "Backend", "Database", "Security", "CI", "Auto")]
    [string]$Area = "Auto"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$scriptDirectory = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
    $scriptDirectory = (Get-Location).Path
}
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDirectory ".."))
$script:Results = New-Object System.Collections.Generic.List[object]
$script:MustStop = $false

function Add-Result {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][ValidateSet("PASS", "FAIL", "UNAVAILABLE", "SKIPPED")][string]$Status,
        [string]$Detail = "",
        [bool]$Required = $false
    )

    $script:Results.Add([PSCustomObject]@{ Name = $Name; Status = $Status; Detail = $Detail })
    $suffix = if ([string]::IsNullOrWhiteSpace($Detail)) { "" } else { " - $Detail" }
    Write-Host "[$Status] $Name$suffix"
    if ($Status -eq "FAIL" -or ($Status -eq "UNAVAILABLE" -and $Required)) {
        $script:MustStop = $true
    }
}

function Get-Executable {
    param([Parameter(Mandatory = $true)][string[]]$Names)

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $command) { return $command.Source }
    }
    return $null
}

function Invoke-CommandStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string[]]$ExecutableNames,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [bool]$Required = $true
    )

    $executable = Get-Executable -Names $ExecutableNames
    if ($null -eq $executable) {
        Add-Result -Name $Name -Status "UNAVAILABLE" -Detail "$($ExecutableNames[0]) is not installed or not on PATH" -Required $Required
        return
    }

    Write-Host "`n> $Name"
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $executable @Arguments
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($exitCode -eq 0) {
        Add-Result -Name $Name -Status "PASS"
    } else {
        Add-Result -Name $Name -Status "FAIL" -Detail "command exited with code $exitCode"
        Write-Host "  Baseline comparison required: reproduce or compare this failure on a clean origin/main checkout before changing unrelated code."
    }
}

function Get-ChangedPaths {
    $paths = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
    $script:UntrackedPaths = @()
    $commands = @(
        @("rev-parse", "--verify", "origin/main"),
        @("diff", "--name-only", "origin/main...HEAD"),
        @("diff", "--name-only"),
        @("diff", "--cached", "--name-only")
    )

    if ($null -eq (Get-Executable -Names @("git.exe", "git"))) {
        Add-Result -Name "Git change evidence" -Status "UNAVAILABLE" -Detail "git is not installed or not on PATH" -Required $true
        return @()
    }

    for ($index = 0; $index -lt $commands.Count; $index++) {
        $arguments = $commands[$index]
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = & git @arguments 2>&1
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        if ($exitCode -ne 0) {
            foreach ($line in @($output)) { Write-Host "  $line" }
            Add-Result -Name "Git change evidence" -Status "FAIL" -Detail "git $($arguments -join ' ') exited with code $exitCode"
            return @()
        }

        if ($index -gt 0) {
            foreach ($path in @($output)) {
                if (-not [string]::IsNullOrWhiteSpace("$path")) { [void]$paths.Add(("$path").Replace("\", "/")) }
            }
        }
    }

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $status = & git status --porcelain=v1 --untracked-files=all 2>&1
        $statusExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($statusExitCode -ne 0) {
        foreach ($line in @($status)) { Write-Host "  $line" }
        Add-Result -Name "Git change evidence" -Status "FAIL" -Detail "git status exited with code $statusExitCode"
        return @()
    }

    $untrackedPaths = New-Object System.Collections.Generic.List[string]
    foreach ($entry in @($status)) {
        $line = "$entry"
        if ($line.Length -ge 4) {
            $path = $line.Substring(3)
            if ($path.Contains(" -> ")) { $path = $path.Split(@(" -> "), [System.StringSplitOptions]::None)[-1] }
            $normalizedPath = $path.Replace("\", "/")
            [void]$paths.Add($normalizedPath)
            if ($line.StartsWith("??")) { $untrackedPaths.Add($normalizedPath) }
        }
    }

    $script:UntrackedPaths = @($untrackedPaths)
    Add-Result -Name "Git change evidence" -Status "PASS" -Detail "origin/main branch, index, worktree and untracked paths inspected"
    return @($paths)
}

function Test-PowerShellSyntax {
    param([Parameter(Mandatory = $true)][string[]]$ChangedPaths)

    $powerShellFiles = @($ChangedPaths | Where-Object { $_.EndsWith(".ps1", [System.StringComparison]::OrdinalIgnoreCase) })
    if ($powerShellFiles.Count -eq 0) {
        Add-Result -Name "PowerShell syntax" -Status "SKIPPED" -Detail "no changed PowerShell files"
        return
    }

    $failures = New-Object System.Collections.Generic.List[string]
    foreach ($relativePath in $powerShellFiles) {
        $absolutePath = Join-Path $repositoryRoot $relativePath
        if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) { continue }
        $tokens = $null
        $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($absolutePath, [ref]$tokens, [ref]$errors)
        foreach ($parseError in @($errors)) {
            $failures.Add("${relativePath}:$($parseError.Extent.StartLineNumber): $($parseError.Message)")
        }
    }

    if ($failures.Count -eq 0) {
        Add-Result -Name "PowerShell syntax" -Status "PASS" -Detail "$($powerShellFiles.Count) changed file(s) parsed"
    } else {
        foreach ($failure in $failures) { Write-Host "  $failure" }
        Add-Result -Name "PowerShell syntax" -Status "FAIL" -Detail "$($failures.Count) parse error(s)"
    }
}

function Invoke-DocsVerification {
    Invoke-CommandStep -Name "Branch and current whitespace check" -ExecutableNames @("git.exe", "git") -Arguments @("diff", "--check", "origin/main", "--")
    if ($script:MustStop) { return }

    if ($script:UntrackedPaths.Count -eq 0) {
        Add-Result -Name "Untracked-file whitespace check" -Status "SKIPPED" -Detail "no untracked files"
        return
    }

    $unsafePaths = @($script:UntrackedPaths | Where-Object {
        $leaf = Split-Path -Leaf $_
        $leaf -eq ".env" -or $leaf.StartsWith(".env.", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.StartsWith(".codex/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.EndsWith("/config.toml", [System.StringComparison]::OrdinalIgnoreCase)
    })
    if ($unsafePaths.Count -gt 0) {
        Add-Result -Name "Untracked-file whitespace check" -Status "UNAVAILABLE" -Detail "sensitive untracked paths are present and were not read" -Required $true
        return
    }

    $violations = New-Object System.Collections.Generic.List[string]
    foreach ($relativePath in $script:UntrackedPaths) {
        $absolutePath = Join-Path $repositoryRoot $relativePath
        if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) { continue }
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = & git -c core.autocrlf=false diff --no-index --check -- NUL $absolutePath 2>&1
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        if (@($output).Count -gt 0) { $violations.Add($relativePath) }
    }

    if ($violations.Count -eq 0) {
        Add-Result -Name "Untracked-file whitespace check" -Status "PASS" -Detail "$($script:UntrackedPaths.Count) file(s) inspected"
    } else {
        foreach ($path in $violations) { Write-Host "  Whitespace error: $path" }
        Add-Result -Name "Untracked-file whitespace check" -Status "FAIL" -Detail "$($violations.Count) file(s) contain whitespace errors"
    }
}

function Invoke-FrontendVerification {
    if ($Level -eq "Quick") {
        Invoke-CommandStep -Name "Frontend focused test suite" -ExecutableNames @("npm.cmd", "npm") -Arguments @("test")
        return
    }

    Invoke-CommandStep -Name "Frontend lint, tests and build" -ExecutableNames @("npm.cmd", "npm") -Arguments @("run", "check:frontend")
    Invoke-CommandStep -Name "Architecture growth budget" -ExecutableNames @("node.exe", "node") -Arguments @("scripts/check-architecture-budgets.mjs")
    Invoke-CommandStep -Name "Frontend Playwright and axe" -ExecutableNames @("npm.cmd", "npm") -Arguments @("run", "test:e2e", "--", "--reporter=line")
}

function Invoke-BackendVerification {
    if ($Level -eq "Quick") {
        Invoke-CommandStep -Name "Backend unit and contract tests" -ExecutableNames @("npm.cmd", "npm") -Arguments @("--prefix", "backend", "run", "test:unit")
    } else {
        Invoke-CommandStep -Name "Backend OpenAPI, type, test and build checks" -ExecutableNames @("npm.cmd", "npm") -Arguments @("--prefix", "backend", "run", "check")
    }
}

function Invoke-DatabaseVerification {
    Invoke-BackendVerification
    if ($script:MustStop) { return }

    Invoke-DatabaseEvidence
}

function Invoke-DatabaseEvidence {
    $testDatabaseUrl = [Environment]::GetEnvironmentVariable("BSS_TEST_DATABASE_URL", "Process")
    if ([string]::IsNullOrWhiteSpace($testDatabaseUrl)) {
        Add-Result -Name "PostgreSQL migration evidence" -Status "UNAVAILABLE" -Detail "BSS_TEST_DATABASE_URL is not set; no database was touched" -Required $true
        Add-Result -Name "PostgreSQL integration and RLS evidence" -Status "SKIPPED" -Detail "explicit test database target is unavailable"
        return
    }

    $hadDatabaseUrl = Test-Path Env:DATABASE_URL
    $previousDatabaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
    $hadRequired = Test-Path Env:BSS_REQUIRE_POSTGRES_TESTS
    $previousRequired = [Environment]::GetEnvironmentVariable("BSS_REQUIRE_POSTGRES_TESTS", "Process")
    try {
        $env:DATABASE_URL = $testDatabaseUrl
        Invoke-CommandStep -Name "PostgreSQL migration evidence" -ExecutableNames @("npm.cmd", "npm") -Arguments @("--prefix", "backend", "run", "migrate")
        $migrationResult = $script:Results[$script:Results.Count - 1].Status
        if ($migrationResult -ne "PASS") {
            Add-Result -Name "PostgreSQL integration and RLS evidence" -Status "SKIPPED" -Detail "migration evidence did not pass"
            return
        }

        $env:BSS_REQUIRE_POSTGRES_TESTS = "true"
        Invoke-CommandStep -Name "PostgreSQL integration and RLS evidence" -ExecutableNames @("npm.cmd", "npm") -Arguments @("--prefix", "backend", "run", "test:integration")
    } finally {
        if ($hadDatabaseUrl) {
            $env:DATABASE_URL = $previousDatabaseUrl
        } else {
            [Environment]::SetEnvironmentVariable("DATABASE_URL", $null, "Process")
        }
        if ($hadRequired) {
            $env:BSS_REQUIRE_POSTGRES_TESTS = $previousRequired
        } else {
            [Environment]::SetEnvironmentVariable("BSS_REQUIRE_POSTGRES_TESTS", $null, "Process")
        }
    }
}

function Invoke-FullVerification {
    param([Parameter(Mandatory = $true)][string[]]$SelectedAreas)

    Invoke-DocsVerification
    Invoke-CommandStep -Name "Root frontend and backend checks" -ExecutableNames @("npm.cmd", "npm") -Arguments @("run", "check")
    Invoke-CommandStep -Name "Architecture growth budget" -ExecutableNames @("node.exe", "node") -Arguments @("scripts/check-architecture-budgets.mjs")
    Invoke-CommandStep -Name "Browser Playwright and axe evidence" -ExecutableNames @("npm.cmd", "npm") -Arguments @("run", "test:e2e", "--", "--reporter=line")

    if ($SelectedAreas -contains "Database") {
        Invoke-DatabaseEvidence
    } else {
        Add-Result -Name "PostgreSQL database evidence" -Status "SKIPPED" -Detail "Database was not selected or inferred"
    }

    if ($SelectedAreas -contains "Security") {
        Add-Result -Name "GitHub CodeQL, secret scanning, SBOM and security gates" -Status "SKIPPED" -Detail "repository-level evidence; this local wrapper does not duplicate it"
    }
    if ($SelectedAreas -contains "CI") {
        Invoke-CIVerification
    }
}

function Invoke-SecurityVerification {
    Invoke-BackendVerification
    Add-Result -Name "GitHub CodeQL, secret scanning, SBOM and security gates" -Status "SKIPPED" -Detail "repository-level evidence; this local wrapper does not duplicate it"
}

function Invoke-CIVerification {
    Invoke-DocsVerification
    $workflowChanges = @($script:ChangedPaths | Where-Object { $_.StartsWith(".github/workflows/", [System.StringComparison]::OrdinalIgnoreCase) })
    if ($workflowChanges.Count -eq 0) {
        Add-Result -Name "GitHub Actions workflow validation" -Status "SKIPPED" -Detail "no changed workflow files"
        return
    }

    Invoke-CommandStep -Name "GitHub Actions workflow validation" -ExecutableNames @("actionlint.exe", "actionlint") -Arguments @("-color") -Required $false
    Add-Result -Name "GitHub workflow required check" -Status "SKIPPED" -Detail "GitHub remains authoritative after push"
}

function Get-AutoAreas {
    param([Parameter(Mandatory = $true)][string[]]$ChangedPaths)

    $areas = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($path in $ChangedPaths) {
        $matched = $false
        $isDatabasePath = $path.StartsWith("backend/migrations/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path.Equals("backend/src/db/migrate.ts", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path.StartsWith("backend/test/integration/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path -match '(?i)(rls|postgres|migration)'
        $isSecurityPath = $path.StartsWith("backend/src/security/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path.Equals("backend/src/http/routes/auth.ts", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path.Equals("backend/src/db/tenant.ts", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path -match '(?i)(auth|rbac|security)'

        if ($isDatabasePath) {
            [void]$areas.Add("Database")
            $matched = $true
        }
        if ($isSecurityPath) {
            [void]$areas.Add("Security")
            $matched = $true
        }
        if (($path.StartsWith("backend/", [System.StringComparison]::OrdinalIgnoreCase) -or $path.StartsWith("openapi/", [System.StringComparison]::OrdinalIgnoreCase)) -and
            -not $isDatabasePath -and -not $isSecurityPath) {
            [void]$areas.Add("Backend")
            $matched = $true
        }
        if ($path.StartsWith(".github/", [System.StringComparison]::OrdinalIgnoreCase) -or $path.StartsWith("scripts/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $path -match '(^|/)package(-lock)?\.json$') {
            [void]$areas.Add("CI")
            $matched = $true
        }
        if ($path -match '^(src/|tests/|public/|app\.js$|index\.html$|playwright\.config\.)' -or $path -match '^package(-lock)?\.json$') {
            [void]$areas.Add("Frontend")
            $matched = $true
        }
        if (-not $matched) {
            [void]$areas.Add("Docs")
        }
    }
    if ($areas.Count -eq 0) { [void]$areas.Add("Docs") }
    return @($areas)
}

if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot "package.json") -PathType Leaf)) {
    Write-Host "[FAIL] Repository root - package.json is missing"
    exit 1
}

Push-Location $repositoryRoot
try {
    Write-Host "BSS verification: Level=$Level Area=$Area"
    $script:ChangedPaths = @(Get-ChangedPaths)
    if (-not $script:MustStop) {
        Test-PowerShellSyntax -ChangedPaths $script:ChangedPaths

        $areasToRun = if ($Area -eq "Auto") { @(Get-AutoAreas -ChangedPaths $script:ChangedPaths) } else { @($Area) }
        Write-Host "Routing: $($areasToRun -join ', ')"

        if ($Level -eq "Full") {
            Invoke-FullVerification -SelectedAreas $areasToRun
        } else {
            foreach ($selectedArea in $areasToRun) {
                switch ($selectedArea) {
                    "Docs" { Invoke-DocsVerification }
                    "Frontend" { Invoke-FrontendVerification }
                    "Backend" { Invoke-BackendVerification }
                    "Database" { Invoke-DatabaseVerification }
                    "Security" { Invoke-SecurityVerification }
                    "CI" { Invoke-CIVerification }
                }
            }
        }
    }
} finally {
    Pop-Location
}

Write-Host "`nVerification summary"
Write-Host "--------------------"
foreach ($result in $script:Results) {
    $detail = if ([string]::IsNullOrWhiteSpace($result.Detail)) { "" } else { " - $($result.Detail)" }
    Write-Host "[$($result.Status)] $($result.Name)$detail"
}

if ($script:MustStop) {
    Write-Host "RESULT: STOP"
    exit 1
}

$hasUnavailable = @($script:Results | Where-Object { $_.Status -eq "UNAVAILABLE" }).Count -gt 0
if ($hasUnavailable) {
    Write-Host "RESULT: UNAVAILABLE"
    exit 0
}

Write-Host "RESULT: PASS"
exit 0
