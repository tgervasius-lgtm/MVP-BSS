[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$expectedRepository = "MVP-BSS"
$expectedOrigin = "github.com/tgervasius-lgtm/MVP-BSS"
$warnings = New-Object System.Collections.Generic.List[string]
$stops = New-Object System.Collections.Generic.List[string]

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    return [PSCustomObject]@{
        ExitCode = $exitCode
        Output = @($output | ForEach-Object { "$_" })
    }
}

function Test-ExpectedOrigin {
    param([Parameter(Mandatory = $true)][string]$RemoteUrl)

    $sanitized = $RemoteUrl.Trim() -replace '\\', '/'
    $sanitized = $sanitized -replace '^https?://(?:[^/@]+@)?', ''
    $sanitized = $sanitized -replace '^ssh://git@', ''
    $sanitized = $sanitized -replace '^git@([^:]+):', '$1/'
    $sanitized = $sanitized.TrimEnd('/') -replace '\.git$', ''
    return $sanitized.Equals($expectedOrigin, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-ToolVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string[]]$CommandNames
    )

    $command = $null
    foreach ($commandName in $CommandNames) {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $command) { break }
    }

    if ($null -eq $command) {
        Write-Host "[WARN] $Label is unavailable."
        $warnings.Add("$Label is unavailable.")
        return
    }

    $versionOutput = & $command.Source --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] $Label was found but its version could not be read."
        $warnings.Add("$Label version check failed.")
        return
    }

    $version = (@($versionOutput) -join " ").Trim()
    Write-Host "[PASS] $Label available: $version"
}

Write-Host "BSS local preflight"
Write-Host "-------------------"

$gitCommand = Get-Command git -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $gitCommand) {
    Write-Host "[STOP] git is unavailable."
    Write-Host "RESULT: STOP"
    exit 1
}

$rootResult = Invoke-Git -Arguments @("rev-parse", "--show-toplevel")
if ($rootResult.ExitCode -ne 0 -or $rootResult.Output.Count -eq 0) {
    Write-Host "[STOP] Current directory is not inside the expected git repository."
    Write-Host "RESULT: STOP"
    exit 1
}

$repositoryRoot = [System.IO.Path]::GetFullPath($rootResult.Output[0])
$repositoryName = Split-Path -Leaf $repositoryRoot
$packagePath = Join-Path $repositoryRoot "package.json"
$hasRepositoryMarker = $false
if (Test-Path -LiteralPath $packagePath -PathType Leaf) {
    try {
        $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        $hasRepositoryMarker = $package.name -eq "bss-smart-systems-demo"
    } catch {
        $hasRepositoryMarker = $false
    }
}

if ($repositoryName -ne $expectedRepository -or -not $hasRepositoryMarker) {
    $stops.Add("Current directory is not the expected MVP-BSS repository.")
    Write-Host "[STOP] Current directory is not the expected MVP-BSS repository."
} else {
    Write-Host "[PASS] Repository identity: MVP-BSS"
}

$originResult = Invoke-Git -Arguments @("config", "--get", "remote.origin.url")
if ($originResult.ExitCode -ne 0 -or $originResult.Output.Count -eq 0 -or -not (Test-ExpectedOrigin -RemoteUrl $originResult.Output[0])) {
    $stops.Add("The origin remote is missing or unexpected.")
    Write-Host "[STOP] Origin remote is missing or does not identify the expected GitHub repository."
} else {
    Write-Host "[PASS] Origin remote identifies $expectedOrigin"
}

if ($stops.Count -gt 0) {
    Write-Host "RESULT: STOP"
    exit 1
}

$branchResult = Invoke-Git -Arguments @("branch", "--show-current")
$headResult = Invoke-Git -Arguments @("rev-parse", "HEAD")
if ($branchResult.ExitCode -ne 0 -or $branchResult.Output.Count -eq 0 -or $headResult.ExitCode -ne 0 -or $headResult.Output.Count -eq 0) {
    Write-Host "[STOP] Current branch or HEAD could not be resolved."
    Write-Host "RESULT: STOP"
    exit 1
}

$branch = $branchResult.Output[0]
$head = $headResult.Output[0]
Write-Host "Branch: $branch"
Write-Host "HEAD:   $head"

Write-Host "Fetching origin/main (non-destructive)..."
$fetchResult = Invoke-Git -Arguments @("fetch", "--quiet", "origin", "main")
if ($fetchResult.ExitCode -ne 0) {
    Write-Host "[STOP] origin/main could not be fetched (git exit $($fetchResult.ExitCode))."
    Write-Host "RESULT: STOP"
    exit 1
}

$originMainResult = Invoke-Git -Arguments @("rev-parse", "--verify", "origin/main")
if ($originMainResult.ExitCode -ne 0 -or $originMainResult.Output.Count -eq 0) {
    Write-Host "[STOP] origin/main could not be resolved after fetch."
    Write-Host "RESULT: STOP"
    exit 1
}
Write-Host "origin/main: $($originMainResult.Output[0])"

$comparisonResult = Invoke-Git -Arguments @("rev-list", "--left-right", "--count", "HEAD...origin/main")
if ($comparisonResult.ExitCode -ne 0 -or $comparisonResult.Output.Count -eq 0) {
    Write-Host "[STOP] HEAD could not be compared with origin/main."
    Write-Host "RESULT: STOP"
    exit 1
}

$counts = $comparisonResult.Output[0].Trim() -split '\s+'
if ($counts.Count -ne 2) {
    Write-Host "[STOP] Unexpected ahead/behind output from git."
    Write-Host "RESULT: STOP"
    exit 1
}
$ahead = [int]$counts[0]
$behind = [int]$counts[1]
Write-Host "Ahead/behind origin/main: $ahead/$behind"
if ($branch -eq "main" -and ($ahead -gt 0 -or $behind -gt 0)) {
    $stops.Add("main does not match origin/main.")
    Write-Host "[STOP] main does not match the fetched origin/main baseline."
} elseif ($behind -gt 0) {
    $warnings.Add("Branch is behind origin/main by $behind commit(s).")
    Write-Host "[WARN] Branch is behind origin/main by $behind commit(s)."
}

$statusResult = Invoke-Git -Arguments @("status", "--porcelain=v1", "--untracked-files=all")
if ($statusResult.ExitCode -ne 0) {
    Write-Host "[STOP] Worktree state could not be inspected."
    Write-Host "RESULT: STOP"
    exit 1
}

$tracked = @($statusResult.Output | Where-Object { $_.Length -ge 2 -and -not $_.StartsWith("??") })
$untracked = @($statusResult.Output | Where-Object { $_.StartsWith("??") })
Write-Host "Tracked changes:   $($tracked.Count)"
foreach ($entry in $tracked) { Write-Host "  $entry" }
Write-Host "Untracked entries: $($untracked.Count)"
foreach ($entry in $untracked) { Write-Host "  $entry" }

$isDirty = $statusResult.Output.Count -gt 0
if ($branch -eq "main" -and $isDirty) {
    $stops.Add("main has tracked or untracked worktree changes.")
    Write-Host "[STOP] main has tracked or untracked worktree changes. No files were changed."
} elseif ($isDirty) {
    $warnings.Add("Feature branch has tracked or untracked worktree changes.")
    Write-Host "[WARN] Feature branch worktree is not clean."
} else {
    Write-Host "[PASS] Worktree is clean."
}

$artifactCandidates = @(
    "debug.log",
    "npm-debug.log",
    "playwright-report",
    "test-results",
    "backend/debug.log",
    "backend/npm-debug.log"
)
$artifacts = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $artifactCandidates) {
    if (Test-Path -LiteralPath (Join-Path $repositoryRoot $relativePath)) {
        $artifacts.Add($relativePath)
    }
}
if ($artifacts.Count -gt 0) {
    Write-Host "[WARN] Known local debug/temp artifacts are present (not deleted):"
    foreach ($artifact in $artifacts) { Write-Host "  $artifact" }
    $warnings.Add("Known local debug/temp artifacts are present.")
} else {
    Write-Host "[PASS] No known local debug/temp artifacts detected."
}

Get-ToolVersion -Label "Node" -CommandNames @("node.exe", "node")
Get-ToolVersion -Label "npm" -CommandNames @("npm.cmd", "npm")
Get-ToolVersion -Label "codex.cmd" -CommandNames @("codex.cmd")

if ($stops.Count -gt 0) {
    Write-Host "RESULT: STOP"
    exit 1
}
if ($warnings.Count -gt 0) {
    Write-Host "RESULT: WARN"
    exit 0
}

Write-Host "RESULT: READY"
exit 0
