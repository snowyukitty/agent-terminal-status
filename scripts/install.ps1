#requires -Version 5.1
<#
.SYNOPSIS
Installs agent-terminal-status into Claude Code user settings.

.DESCRIPTION
Copies the Windows status command into the Claude configuration directory and
sets statusLine in settings.json. Existing status lines require -Force and are
restored by the installed uninstaller.
#>

[CmdletBinding()]
param(
    [string] $ConfigDir,
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceStatusLine = Join-Path $projectRoot 'src\statusline.ps1'
$sourceUninstaller = Join-Path $PSScriptRoot 'uninstall.ps1'

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
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Content
    )
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Write-JsonAtomic {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)] $Value
    )
    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    $temporary = Join-Path $directory ('.ats-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        Write-Utf8NoBom $temporary (($Value | ConvertTo-Json -Depth 100) + [Environment]::NewLine)
        Move-Item -LiteralPath $temporary -Destination $Path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporary) {
            Remove-Item -LiteralPath $temporary -Force
        }
    }
}

function Get-JsonObject {
    param([Parameter(Mandatory = $true)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{}
    }
    $raw = [IO.File]::ReadAllText($Path)
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return [pscustomobject]@{}
    }
    try {
        $value = $raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw "Cannot install: '$Path' is not valid JSON. No settings were changed."
    }
    if ($null -eq $value -or
        $value.GetType().FullName -ne 'System.Management.Automation.PSCustomObject') {
        throw "Cannot install: '$Path' must contain a JSON object. No settings were changed."
    }
    return $value
}

function Add-OrSetProperty {
    param(
        [Parameter(Mandatory = $true)] $Object,
        [Parameter(Mandatory = $true)][string] $Name,
        [Parameter(Mandatory = $true)] $Value
    )
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
    else {
        $property.Value = $Value
    }
}

if ([string]::IsNullOrWhiteSpace($ConfigDir)) {
    $ConfigDir = Get-DefaultConfigDir
}
$ConfigDir = [IO.Path]::GetFullPath($ConfigDir)
$installDir = Join-Path $ConfigDir 'agent-terminal-status'
$settingsPath = Join-Path $ConfigDir 'settings.json'
$statePath = Join-Path $installDir 'install-state.json'
$installedStatusLine = Join-Path $installDir 'statusline.ps1'
$installedUninstaller = Join-Path $installDir 'uninstall.ps1'

if (-not (Test-Path -LiteralPath $sourceStatusLine)) {
    throw "Source status line not found at '$sourceStatusLine'."
}

$portablePath = (Resolve-Path -LiteralPath (Split-Path -Parent $installedStatusLine) -ErrorAction SilentlyContinue)
if ($null -eq $portablePath) {
    $portablePath = $installDir
}
else {
    $portablePath = $portablePath.Path
}
$portableStatusPath = ((Join-Path ([string]$portablePath) 'statusline.ps1') -replace '\\', '/')
$installedCommand = 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $portableStatusPath + '"'
$settings = Get-JsonObject $settingsPath
$statusProperty = $settings.PSObject.Properties['statusLine']
$existingState = $null
if (Test-Path -LiteralPath $statePath) {
    try { $existingState = Get-JsonObject $statePath } catch { $existingState = $null }
}

$alreadyOurs = $false
if ($null -ne $statusProperty -and $null -ne $statusProperty.Value) {
    $currentCommand = [string]$statusProperty.Value.command
    $alreadyOurs = $currentCommand -eq $installedCommand -or
        $currentCommand -match '(?i)[/\\]agent-terminal-status[/\\]statusline\.ps1'
}

if ($null -ne $statusProperty -and -not $alreadyOurs -and -not $Force) {
    throw "A Claude Code statusLine is already configured. Re-run with -Force to preserve and replace it; uninstall will restore it."
}

$previousPresent = $null -ne $statusProperty
$previousValue = if ($previousPresent) { $statusProperty.Value } else { $null }
if ($alreadyOurs) {
    $existingPreviousPresentProperty = if ($null -ne $existingState) {
        $existingState.PSObject.Properties['previousStatusLinePresent']
    }
    else {
        $null
    }
    $existingPreviousValueProperty = if ($null -ne $existingState) {
        $existingState.PSObject.Properties['previousStatusLine']
    }
    else {
        $null
    }
    $existingRollbackKnown = $null -ne $existingPreviousPresentProperty -and
        $existingPreviousPresentProperty.Value -is [bool] -and (
            -not [bool]$existingPreviousPresentProperty.Value -or
            $null -ne $existingPreviousValueProperty
        )
    if ($existingRollbackKnown) {
        $previousPresent = [bool]$existingPreviousPresentProperty.Value
        $previousValue = if ($null -ne $existingPreviousValueProperty) {
            $existingPreviousValueProperty.Value
        }
        else {
            $null
        }
    }
    else {
        $previousPresent = $null
        $previousValue = $null
        Write-Warning 'The install state is unavailable or incomplete; a previously preserved statusLine cannot be restored. Reinstalling with rollback marked unknown.'
    }
}

if (-not (Test-Path -LiteralPath $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Copy-Item -LiteralPath $sourceStatusLine -Destination $installedStatusLine -Force
Copy-Item -LiteralPath $sourceUninstaller -Destination $installedUninstaller -Force

$state = [ordered]@{
    schemaVersion = 1
    installedVersion = '0.1.0'
    installedCommand = $installedCommand
    settingsPath = $settingsPath
    previousStatusLinePresent = $previousPresent
    previousStatusLine = $previousValue
    installedAtUtc = [DateTime]::UtcNow.ToString('o')
}

$statusLine = [pscustomobject][ordered]@{
    type = 'command'
    command = $installedCommand
    padding = 0
}
Add-OrSetProperty $settings 'statusLine' $statusLine
Write-JsonAtomic $statePath $state
try {
    Write-JsonAtomic $settingsPath $settings
}
catch {
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    throw
}

Write-Output "Installed agent-terminal-status 0.1.0."
Write-Output "Claude settings: $settingsPath"
Write-Output "Status command: $installedStatusLine"
if ($previousPresent -and -not $alreadyOurs) {
    Write-Output 'The previous statusLine was preserved and will be restored on uninstall.'
}
Write-Output 'Claude Code reloads settings automatically; interact once to refresh the line.'
