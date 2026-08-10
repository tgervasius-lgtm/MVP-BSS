[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 2147483647)]
    [int]$Issue,

    [switch]$DryRun
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$expectedRepository = "tgervasius-lgtm/MVP-BSS"
$profileEfforts = @{
    FAST = "low"
    STANDARD = "medium"
    CRITICAL = "high"
    AUDIT = "xhigh"
}
$scriptDirectory = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
    $scriptDirectory = (Get-Location).Path
}
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDirectory ".."))
$preflightPath = Join-Path $scriptDirectory "bss-preflight.ps1"

function Stop-Launch {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host "[STOP] $Message"
    Write-Host "RESULT: STOP"
    exit 1
}

function Get-Executable {
    param([Parameter(Mandatory = $true)][string]$Name)

    return Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-ExecutionProfile {
    param([AllowEmptyString()][string]$Body)

    $lines = @($Body -split '\r?\n')
    $profileHeaders = New-Object System.Collections.Generic.List[int]
    $secondLevelHeaders = New-Object System.Collections.Generic.List[int]
    $inFence = $false
    $fenceCharacter = [char]0
    $fenceLength = 0

    for ($index = 0; $index -lt $lines.Count; $index++) {
        $line = $lines[$index]
        $fenceMatch = [regex]::Match($line, '^[ \t]{0,3}(`{3,}|~{3,})')
        if ($fenceMatch.Success) {
            $marker = $fenceMatch.Groups[1].Value
            if (-not $inFence) {
                $inFence = $true
                $fenceCharacter = $marker[0]
                $fenceLength = $marker.Length
                continue
            }
            $isClosingFence = $marker[0] -eq $fenceCharacter -and $marker.Length -ge $fenceLength -and
                $line.Substring($fenceMatch.Length).Trim().Length -eq 0
            if ($isClosingFence) {
                $inFence = $false
                $fenceCharacter = [char]0
                $fenceLength = 0
            }
            continue
        }
        if ($inFence) { continue }

        if ($line -match '^##(?:[ \t]+|$)') {
            $secondLevelHeaders.Add($index)
        }
        if ($line -match '^## Execution profile[ \t]*$') {
            $profileHeaders.Add($index)
        }
    }

    if ($profileHeaders.Count -eq 0) {
        Stop-Launch "Issue #$Issue is missing the exact '## Execution profile' section."
    }
    if ($profileHeaders.Count -ne 1) {
        Stop-Launch "Issue #$Issue must contain exactly one '## Execution profile' section."
    }

    $headerIndex = $profileHeaders[0]
    $nextHeaderIndex = $lines.Count
    foreach ($candidateIndex in $secondLevelHeaders) {
        if ($candidateIndex -gt $headerIndex) {
            $nextHeaderIndex = $candidateIndex
            break
        }
    }
    $sectionLines = New-Object System.Collections.Generic.List[string]
    for ($index = $headerIndex + 1; $index -lt $nextHeaderIndex; $index++) {
        $sectionLines.Add($lines[$index])
    }
    $profile = (@($sectionLines) -join [Environment]::NewLine).Trim()

    if (-not $profileEfforts.ContainsKey($profile)) {
        $displayProfile = if ([string]::IsNullOrWhiteSpace($profile)) { "<empty>" } else { $profile -replace '[\x00-\x1F\x7F]+', ' ' }
        Stop-Launch "Issue #$Issue has invalid Execution profile '$displayProfile'. Allowed: FAST, STANDARD, CRITICAL, AUDIT."
    }

    return $profile
}

function Format-CommandArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -match '^[A-Za-z0-9._:/#=-]+$') {
        return $Value
    }
    return "'" + $Value.Replace("'", "''") + "'"
}

Write-Host "BSS issue-driven Codex launcher"
Write-Host "-------------------------------"

$ghCommand = Get-Executable -Name "gh"
if ($null -eq $ghCommand) {
    Stop-Launch "GitHub CLI (gh) is unavailable."
}

$previousErrorActionPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    $issueOutput = & $ghCommand.Source issue view $Issue --repo $expectedRepository --json number,title,body,state,url 2>&1
    $issueExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($issueExitCode -ne 0) {
    Stop-Launch "GitHub issue #$Issue could not be fetched from $expectedRepository (gh exit $issueExitCode)."
}

try {
    $issueData = (@($issueOutput) -join [Environment]::NewLine) | ConvertFrom-Json
} catch {
    Stop-Launch "GitHub CLI returned invalid JSON for issue #$Issue."
}
if ($null -eq $issueData -or [int]$issueData.number -ne $Issue) {
    Stop-Launch "GitHub CLI returned an unexpected issue record."
}
if (-not "$($issueData.state)".Equals("OPEN", [System.StringComparison]::OrdinalIgnoreCase)) {
    Stop-Launch "Issue #$Issue is not OPEN (state: $($issueData.state))."
}

$profile = Get-ExecutionProfile -Body "$($issueData.body)"
$reasoningEffort = $profileEfforts[$profile]
$safeTitle = "$($issueData.title)" -replace '[\x00-\x1F\x7F]+', ' '

$codexCommand = Get-Executable -Name "codex.cmd"
if ($null -eq $codexCommand) {
    Stop-Launch "codex.cmd is unavailable. The PowerShell codex.ps1 shim is not used."
}
if (-not (Test-Path -LiteralPath $preflightPath -PathType Leaf)) {
    Stop-Launch "Required BSS preflight script is missing."
}

Write-Host "Issue:     #$Issue $safeTitle"
Write-Host "URL:       $($issueData.url)"
Write-Host "Profile:   $profile"
Write-Host "Reasoning: $reasoningEffort"
Write-Host "Approval:  on-request"
Write-Host "Plan:      Run BSS preflight, then open an interactive issue-scoped Codex session."
Write-Host ""
Write-Host "Running required BSS preflight..."
& $preflightPath
if ($LASTEXITCODE -ne 0) {
    Stop-Launch "BSS preflight returned exit code $LASTEXITCODE."
}

$prompt = "Work on BSS GitHub issue #$Issue. Read the issue with gh and follow AGENTS.md. Keep the work issue-scoped; do not commit, push, merge, or deploy without BSS OS review."
$codexArguments = @(
    "--ask-for-approval",
    "on-request",
    "--config",
    "model_reasoning_effort=`"$reasoningEffort`"",
    $prompt
)
$displayCommand = (@("codex.cmd") + $codexArguments | ForEach-Object { Format-CommandArgument -Value $_ }) -join " "

Write-Host ""
Write-Host "Command: $displayCommand"
if ($DryRun) {
    Write-Host "[PASS] Dry-run complete. Codex was not started."
    Write-Host "RESULT: DRY-RUN"
    exit 0
}

Write-Host "Starting Codex..."
Push-Location $repositoryRoot
try {
    & $codexCommand.Source @codexArguments
    $codexExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($codexExitCode -ne 0) {
    Stop-Launch "codex.cmd returned exit code $codexExitCode."
}

Write-Host "RESULT: PASS"
exit 0
