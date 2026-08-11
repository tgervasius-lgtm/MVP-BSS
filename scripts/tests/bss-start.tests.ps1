[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$sourceScript = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\bss-start.ps1"))
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("bss-start-tests-" + [guid]::NewGuid().ToString("N"))
$fakeBin = Join-Path $testRoot "bin"
$testScripts = Join-Path $testRoot "scripts"
$codexLog = Join-Path $testRoot "codex-args.json"
$script:Passed = 0
$script:Failed = 0

function Add-TestResult {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][bool]$Passed,
        [string]$Detail = ""
    )

    if ($Passed) {
        $script:Passed++
        Write-Output "[PASS] $Name"
    } else {
        $script:Failed++
        Write-Output "[FAIL] $Name - $Detail"
    }
}

function Assert-Launcher {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Body,
        [string]$State = "OPEN",
        [int]$GhExitCode = 0,
        [int]$PreflightExitCode = 0,
        [switch]$DryRun,
        [int]$ExpectedExitCode = 0,
        [Parameter(Mandatory = $true)][string[]]$ExpectedPatterns,
        [switch]$ExpectCodexLaunch
    )

    $env:BSS_TEST_ISSUE_BODY_BASE64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Body))
    $env:BSS_TEST_ISSUE_STATE = $State
    $env:BSS_TEST_GH_EXIT = "$GhExitCode"
    $env:BSS_TEST_PREFLIGHT_EXIT = "$PreflightExitCode"
    $env:BSS_TEST_CODEX_LOG = $codexLog
    if (Test-Path -LiteralPath $codexLog) { Remove-Item -LiteralPath $codexLog -Force }

    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $testScripts "bss-start.ps1"), "-Issue", "127")
    if ($DryRun) { $arguments += "-DryRun" }
    $output = & powershell.exe @arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = @($output) -join "`n"

    $didPass = $exitCode -eq $ExpectedExitCode
    foreach ($pattern in $ExpectedPatterns) {
        if ($text -notmatch $pattern) { $didPass = $false }
    }
    $launched = Test-Path -LiteralPath $codexLog
    if ($launched -ne [bool]$ExpectCodexLaunch) { $didPass = $false }
    Add-TestResult -Name $Name -Passed $didPass -Detail "exit=$exitCode launched=$launched output=$text"
}

New-Item -ItemType Directory -Path $fakeBin, $testScripts -Force | Out-Null
Copy-Item -LiteralPath $sourceScript -Destination (Join-Path $testScripts "bss-start.ps1")

Set-Content -LiteralPath (Join-Path $testScripts "bss-preflight.ps1") -Encoding UTF8 -Value @'
Write-Host "Fake BSS preflight"
if ([int]$env:BSS_TEST_PREFLIGHT_EXIT -ne 0) {
    Write-Host "RESULT: STOP"
    exit [int]$env:BSS_TEST_PREFLIGHT_EXIT
}
Write-Host "RESULT: READY"
exit 0
'@
Set-Content -LiteralPath (Join-Path $fakeBin "fake-gh.ps1") -Encoding UTF8 -Value @'
if ([int]$env:BSS_TEST_GH_EXIT -ne 0) {
    Write-Error "issue unavailable"
    exit [int]$env:BSS_TEST_GH_EXIT
}
$body = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:BSS_TEST_ISSUE_BODY_BASE64))
[PSCustomObject]@{
    number = 127
    title = "Test issue"
    body = $body
    state = $env:BSS_TEST_ISSUE_STATE
    url = "https://github.com/tgervasius-lgtm/MVP-BSS/issues/127"
} | ConvertTo-Json -Compress
'@
Set-Content -LiteralPath (Join-Path $fakeBin "gh.cmd") -Encoding ASCII -Value '@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fake-gh.ps1" %*'
Set-Content -LiteralPath (Join-Path $fakeBin "fake-codex.ps1") -Encoding UTF8 -Value @'
$args | ConvertTo-Json -Compress | Set-Content -LiteralPath $env:BSS_TEST_CODEX_LOG -Encoding UTF8
exit 0
'@
Set-Content -LiteralPath (Join-Path $fakeBin "codex.cmd") -Encoding ASCII -Value '@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fake-codex.ps1" %*'

$previousPath = $env:PATH
try {
    $env:PATH = "$fakeBin;$previousPath"

    $profiles = @{
        FAST = "low"
        STANDARD = "medium"
        CRITICAL = "high"
        AUDIT = "xhigh"
    }
    foreach ($profile in $profiles.Keys) {
        $effort = $profiles[$profile]
        Assert-Launcher -Name "Dry-run maps $profile to $effort" -Body "## Execution profile`n$profile" -DryRun `
            -ExpectedPatterns @("Profile:\s+$profile", "Reasoning:\s+$effort", "model_reasoning_effort=", "RESULT: DRY-RUN")
    }

    $fencedExampleBody = "## Execution profile`nSTANDARD`n`n## Standard`n``````md`n## Execution profile`nFAST`n``````"
    Assert-Launcher -Name "Fenced profile example is ignored" -Body $fencedExampleBody -DryRun `
        -ExpectedPatterns @("Profile:\s+STANDARD", "Reasoning:\s+medium", "RESULT: DRY-RUN")

    Assert-Launcher -Name "Invalid profile stops" -Body "## Execution profile`nFAST; Write-Output injected" -ExpectedExitCode 1 `
        -ExpectedPatterns @("invalid Execution profile", "RESULT: STOP")
    Assert-Launcher -Name "Missing profile stops" -Body "## Goal`nNo execution profile here." -ExpectedExitCode 1 `
        -ExpectedPatterns @("missing the exact", "RESULT: STOP")
    Assert-Launcher -Name "Closed issue stops" -Body "## Execution profile`nFAST" -State "CLOSED" -ExpectedExitCode 1 `
        -ExpectedPatterns @("is not OPEN", "RESULT: STOP")
    Assert-Launcher -Name "Nonexistent issue stops" -Body "## Execution profile`nFAST" -GhExitCode 1 -ExpectedExitCode 1 `
        -ExpectedPatterns @("could not be fetched", "RESULT: STOP")
    Assert-Launcher -Name "Preflight STOP propagates" -Body "## Execution profile`nSTANDARD" -PreflightExitCode 1 -ExpectedExitCode 1 `
        -ExpectedPatterns @("RESULT: STOP")

    foreach ($profile in @("FAST", "STANDARD")) {
        $effort = $profiles[$profile]
        Assert-Launcher -Name "Fake launch passes $profile effort without live Codex" -Body "## Execution profile`n$profile" -ExpectCodexLaunch `
            -ExpectedPatterns @("Starting Codex", "RESULT: PASS")
        if (Test-Path -LiteralPath $codexLog) {
            $loggedArguments = Get-Content -LiteralPath $codexLog -Raw | ConvertFrom-Json
            $joinedArguments = @($loggedArguments) -join " "
            $hasApproval = $joinedArguments -match '--ask-for-approval on-request'
            $hasEffort = @($loggedArguments) -contains "model_reasoning_effort=$effort"
            Add-TestResult -Name "Fake $profile launch preserves arguments" -Passed ($hasApproval -and $hasEffort) `
                -Detail "arguments=$(@($loggedArguments) -join ' | ')"
        }
    }
} finally {
    $env:PATH = $previousPath
    Remove-Item Env:BSS_TEST_ISSUE_BODY_BASE64 -ErrorAction SilentlyContinue
    Remove-Item Env:BSS_TEST_ISSUE_STATE -ErrorAction SilentlyContinue
    Remove-Item Env:BSS_TEST_GH_EXIT -ErrorAction SilentlyContinue
    Remove-Item Env:BSS_TEST_PREFLIGHT_EXIT -ErrorAction SilentlyContinue
    Remove-Item Env:BSS_TEST_CODEX_LOG -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}

Write-Host ""
Write-Host "Tests: $($script:Passed) passed, $($script:Failed) failed"
if ($script:Failed -gt 0) { exit 1 }
exit 0
