#requires -Version 5.1
<#
.SYNOPSIS
Uninstalls agent-terminal-status and restores the prior Claude status line.
#>

[CmdletBinding()]
param(
    [string] $ConfigDir
)

$ErrorActionPreference = 'Stop'

function Get-DefaultConfigDir {
    if (-not [string]::IsNullOrWhiteSpace($env:CLAUDE_CONFIG_DIR)) {
        return $env:CLAUDE_CONFIG_DIR
    }
    $userHome = if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $env:USERPROFILE
    }
    else {
        [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    }
    return Join-Path $userHome '.claude'
}

function Write-Utf8NoBom {
    param([string] $Path, [string] $Content)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Write-JsonAtomic {
    param([string] $Path, $Value)
    $directory = Split-Path -Parent $Path
    $temporary = Join-Path $directory ('.ats-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        Write-Utf8NoBom $temporary (($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine)
        Move-Item -LiteralPath $temporary -Destination $Path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    }
}

function Read-Json {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $raw = [IO.File]::ReadAllText($Path)
    if ([string]::IsNullOrWhiteSpace($raw)) { return [pscustomobject]@{} }
    try {
        $value = $raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw "Cannot parse '$Path' as JSON."
    }
    if ($null -eq $value -or
        $value.GetType().FullName -ne 'System.Management.Automation.PSCustomObject') {
        throw "Cannot parse '$Path': the root value must be a JSON object."
    }
    return $value
}

if ([string]::IsNullOrWhiteSpace($ConfigDir)) {
    if ((Split-Path -Leaf $PSScriptRoot) -eq 'agent-terminal-status') {
        $ConfigDir = Split-Path -Parent $PSScriptRoot
    }
    else {
        $ConfigDir = Get-DefaultConfigDir
    }
}
$ConfigDir = [IO.Path]::GetFullPath($ConfigDir)
$installDir = Join-Path $ConfigDir 'agent-terminal-status'
$statePath = Join-Path $installDir 'install-state.json'
$settingsPath = Join-Path $ConfigDir 'settings.json'
$state = $null
$settings = $null
try {
    $state = Read-Json $statePath
}
catch {
    $state = $null
}
try {
    $settings = Read-Json $settingsPath
}
catch {
    Write-Warning "Claude settings are unreadable and were left untouched. Project files will still be removed; repair '$settingsPath' and remove its statusLine entry if needed."
}
$settingsChanged = $false
$previousPresentProperty = if ($null -ne $state) {
    $state.PSObject.Properties['previousStatusLinePresent']
}
else {
    $null
}
$previousValueProperty = if ($null -ne $state) {
    $state.PSObject.Properties['previousStatusLine']
}
else {
    $null
}
$rollbackKnown = $null -ne $previousPresentProperty -and
    $previousPresentProperty.Value -is [bool] -and (
        -not [bool]$previousPresentProperty.Value -or
        $null -ne $previousValueProperty
    )
$previousStatusLinePresent = $rollbackKnown -and [bool]$previousPresentProperty.Value

if ($null -ne $settings) {
    $statusProperty = $settings.PSObject.Properties['statusLine']
    $currentCommand = if ($null -ne $statusProperty -and $null -ne $statusProperty.Value) {
        [string]$statusProperty.Value.command
    }
    else {
        ''
    }
    $installedCommand = if ($null -ne $state) { [string]$state.installedCommand } else { '' }
    $isOurs = -not [string]::IsNullOrEmpty($currentCommand) -and (
        $currentCommand -eq $installedCommand -or
        $currentCommand -match '(?i)[/\\]agent-terminal-status[/\\]statusline\.ps1'
    )

    if ($isOurs) {
        if (-not $rollbackKnown) {
            Write-Warning 'The install state is unavailable or incomplete; a previously preserved statusLine cannot be restored. Removing the agent-terminal-status setting and project files.'
        }
        if ($previousStatusLinePresent) {
            $statusProperty.Value = $state.previousStatusLine
        }
        else {
            $settings.PSObject.Properties.Remove('statusLine')
        }
        $settingsChanged = $true
    }
    elseif (-not [string]::IsNullOrEmpty($currentCommand)) {
        Write-Warning 'Claude statusLine changed after installation; leaving the current setting untouched.'
    }
}

if ($settingsChanged) {
    Write-JsonAtomic $settingsPath $settings
}

$knownFiles = @(
    (Join-Path $installDir 'statusline.ps1'),
    (Join-Path $installDir 'uninstall.ps1'),
    $statePath
)
foreach ($file in $knownFiles) {
    if (Test-Path -LiteralPath $file) {
        Remove-Item -LiteralPath $file -Force
    }
}
if (Test-Path -LiteralPath $installDir) {
    $remaining = @(Get-ChildItem -LiteralPath $installDir -Force)
    if ($remaining.Count -eq 0) {
        Remove-Item -LiteralPath $installDir
    }
    else {
        Write-Warning "Kept '$installDir' because it contains files not created by this installer."
    }
}

Write-Output 'Uninstalled agent-terminal-status.'
if ($settingsChanged -and $previousStatusLinePresent) {
    Write-Output 'Restored the previous Claude Code statusLine.'
}
elseif ($settingsChanged) {
    Write-Output 'Removed the agent-terminal-status setting from Claude Code.'
}
