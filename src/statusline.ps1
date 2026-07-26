#requires -Version 5.1
<#
.SYNOPSIS
Renders a quiet Claude Code workspace identity status line.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string] $InputJson
)

$script:AtsVersion = '0.1.0'
$script:AtsDefaultMaxWidth = 96
$script:AtsDefaultGitTimeoutMs = 150

function Set-AtsUtf8Console {
    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [Console]::InputEncoding = $utf8
        [Console]::OutputEncoding = $utf8
        $global:OutputEncoding = $utf8
    }
    catch {
        # Some hosts expose read-only console encodings. Plain ASCII still works.
    }
}
function ConvertTo-AtsSlashPath {
    param([Parameter(Mandatory = $true)][string] $Path)

    $value = $Path -replace '\\', '/'
    if ($value.StartsWith('//')) {
        $value = '//' + (($value.Substring(2)) -replace '/+', '/')
    }
    else {
        $value = $value -replace '/+', '/'
    }

    if ($value -ne '/' -and $value -ne '//' -and $value -notmatch '^[A-Za-z]:/$') {
        $value = $value.TrimEnd('/')
    }
    if ([string]::IsNullOrEmpty($value)) { return '/' }
    return $value
}

function Test-AtsCaseInsensitivePath {
    param([Parameter(Mandatory = $true)][string] $Path)
    return [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT -or
        $Path -match '^[A-Za-z]:/' -or $Path.StartsWith('//')
}

function Get-AtsRelativeChild {
    param(
        [Parameter(Mandatory = $true)][string] $Child,
        [Parameter(Mandatory = $true)][string] $Parent
    )

    $childValue = ConvertTo-AtsSlashPath $Child
    $parentValue = ConvertTo-AtsSlashPath $Parent
    $comparison = if (Test-AtsCaseInsensitivePath $childValue) {
        [StringComparison]::OrdinalIgnoreCase
    }
    else {
        [StringComparison]::Ordinal
    }

    if ($childValue.Equals($parentValue, $comparison)) { return '' }
    $prefix = $parentValue.TrimEnd('/') + '/'
    if ($childValue.StartsWith($prefix, $comparison)) {
        return $childValue.Substring($prefix.Length)
    }
    return $null
}

function Get-AtsPayloadCwd {
    param(
        [string] $Json,
        [string] $FallbackCwd
    )

    $data = $null
    if (-not [string]::IsNullOrWhiteSpace($Json)) {
        try { $data = $Json | ConvertFrom-Json -ErrorAction Stop } catch { $data = $null }
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    if ($null -ne $data) {
        if ($null -ne $data.workspace -and -not [string]::IsNullOrWhiteSpace([string]$data.workspace.current_dir)) {
            $candidates.Add([string]$data.workspace.current_dir)
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$data.cwd)) {
            $candidates.Add([string]$data.cwd)
        }
        if ($null -ne $data.workspace -and -not [string]::IsNullOrWhiteSpace([string]$data.workspace.project_dir)) {
            $candidates.Add([string]$data.workspace.project_dir)
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($FallbackCwd)) { $candidates.Add($FallbackCwd) }
    try { $candidates.Add((Get-Location).Path) } catch { }
    if ($candidates.Count -eq 0) { return '.' }
    return $candidates[0]
}

function ConvertTo-AtsCommandArgument {
    param([Parameter(Mandatory = $true)][string] $Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + ($Value.Replace('"', '\"')) + '"'
}

function Get-AtsGitTimeoutMs {
    $value = $script:AtsDefaultGitTimeoutMs
    if (-not [string]::IsNullOrWhiteSpace($env:ATS_GIT_TIMEOUT_MS)) {
        $parsed = 0
        if ([int]::TryParse($env:ATS_GIT_TIMEOUT_MS, [ref]$parsed)) { $value = $parsed }
    }
    return [Math]::Max(25, [Math]::Min($value, 2000))
}

function Invoke-AtsGit {
    param(
        [Parameter(Mandatory = $true)][string] $GitPath,
        [Parameter(Mandatory = $true)][string] $Cwd,
        [Parameter(Mandatory = $true)][string[]] $Arguments
    )

    $allArguments = @('-c', 'core.quotepath=false', '-C', (ConvertTo-AtsSlashPath $Cwd)) + $Arguments
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $GitPath
    $startInfo.Arguments = (($allArguments | ForEach-Object { ConvertTo-AtsCommandArgument ([string]$_) }) -join ' ')
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.EnvironmentVariables['GIT_OPTIONAL_LOCKS'] = '0'
    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        $startInfo.StandardOutputEncoding = $utf8
        $startInfo.StandardErrorEncoding = $utf8
    }
    catch { }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) { return $null }
        $process.StandardInput.Close()
        if (-not $process.WaitForExit((Get-AtsGitTimeoutMs))) {
            try { $process.Kill() } catch { }
            return $null
        }
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            StdOut = $stdout
            StdErr = $stderr
        }
    }
    catch {
        return $null
    }
    finally {
        $process.Dispose()
    }
}

function Get-AtsGitIdentity {
    param([Parameter(Mandatory = $true)][string] $Cwd)

    $gitCommand = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $gitCommand) { return $null }
    $gitPath = $gitCommand.Source

    $probe = Invoke-AtsGit $gitPath $Cwd @('rev-parse', '--show-toplevel', '--symbolic-full-name', 'HEAD')
    if ($null -eq $probe) { return $null }
    $lines = @($probe.StdOut -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
    if ($lines.Count -eq 0) { return $null }
    $root = $lines[0]
    if ($root -notmatch '^(/|[A-Za-z]:[/\\]|\\\\)') { return $null }

    $branch = $null
    $ref = if ($lines.Count -gt 1) { $lines[1] } else { '' }
    if ($ref.StartsWith('refs/heads/')) {
        $branch = $ref.Substring('refs/heads/'.Length)
    }
    else {
        $symbolic = Invoke-AtsGit $gitPath $Cwd @('symbolic-ref', '--quiet', '--short', 'HEAD')
        if ($null -ne $symbolic -and $symbolic.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($symbolic.StdOut)) {
            $branch = $symbolic.StdOut.Trim()
        }
        else {
            $commit = Invoke-AtsGit $gitPath $Cwd @('rev-parse', '--short=7', 'HEAD')
            if ($null -ne $commit -and $commit.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($commit.StdOut)) {
                $branch = 'detached@' + $commit.StdOut.Trim()
            }
        }
    }

    return [pscustomobject]@{ Root = $root; Branch = $branch }
}

function Get-AtsHomePath {
    if (-not [string]::IsNullOrWhiteSpace($env:HOME)) { return $env:HOME }
    if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) { return $env:USERPROFILE }
    return [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
}

function Get-AtsDisplayPath {
    param(
        [Parameter(Mandatory = $true)][string] $Cwd,
        [AllowNull()] $GitIdentity,
        [string] $Style = 'context'
    )

    $normalizedCwd = ConvertTo-AtsSlashPath $Cwd
    $normalizedStyle = $Style.Trim().ToLowerInvariant()
    if ($normalizedStyle -eq 'name') {
        $parts = $normalizedCwd.TrimEnd('/').Split('/')
        if ($parts.Count -gt 0 -and -not [string]::IsNullOrEmpty($parts[-1])) { return $parts[-1] }
        return $normalizedCwd
    }

    if ($normalizedStyle -eq 'context' -and $null -ne $GitIdentity) {
        $relative = Get-AtsRelativeChild $normalizedCwd ([string]$GitIdentity.Root)
        if ($null -ne $relative) {
            $rootParts = (ConvertTo-AtsSlashPath ([string]$GitIdentity.Root)).TrimEnd('/').Split('/')
            $rootName = if ($rootParts.Count -gt 0) { $rootParts[-1] } else { [string]$GitIdentity.Root }
            if ([string]::IsNullOrEmpty($relative)) { return $rootName }
            return $rootName + '/' + $relative
        }
    }

    $homeRelative = Get-AtsRelativeChild $normalizedCwd (Get-AtsHomePath)
    if ($null -ne $homeRelative) {
        if ([string]::IsNullOrEmpty($homeRelative)) { return '~' }
        return '~/' + $homeRelative
    }
    return $normalizedCwd
}

function Get-AtsMode {
    param([string] $Value, [string] $Default = 'auto')
    $candidate = if ([string]::IsNullOrWhiteSpace($Value)) { $Default } else { $Value.Trim().ToLowerInvariant() }
    if ($candidate -in @('auto', 'always', 'never')) { return $candidate }
    return $Default
}

function Test-AtsTruthy {
    param([string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    return $Value.Trim().ToLowerInvariant() -in @('1', 'true', 'yes', 'on')
}

function Get-AtsMaxWidth {
    $width = $script:AtsDefaultMaxWidth
    foreach ($candidate in @($env:ATS_MAX_WIDTH, $env:COLUMNS)) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $parsed = 0
        if ([int]::TryParse($candidate, [ref]$parsed)) {
            $width = $parsed
            break
        }
    }
    $width = [Math]::Max(12, [Math]::Min($width, 512))
    return [Math]::Min($width, $script:AtsDefaultMaxWidth)
}

function Get-AtsCodePointWidth {
    param(
        [Parameter(Mandatory = $true)][int] $CodePoint,
        [Parameter(Mandatory = $true)]
        [System.Globalization.UnicodeCategory] $Category
    )

    if ($CodePoint -eq 0 -or $CodePoint -lt 32 -or ($CodePoint -ge 0x7F -and $CodePoint -lt 0xA0)) {
        return 0
    }
    if ($Category -in @(
        [Globalization.UnicodeCategory]::Control,
        [Globalization.UnicodeCategory]::EnclosingMark,
        [Globalization.UnicodeCategory]::Format,
        [Globalization.UnicodeCategory]::NonSpacingMark
    )) {
        return 0
    }
    $wide = ($CodePoint -ge 0x1100 -and $CodePoint -le 0x115F) -or
        $CodePoint -eq 0x2329 -or $CodePoint -eq 0x232A -or
        ($CodePoint -ge 0x2E80 -and $CodePoint -le 0xA4CF -and $CodePoint -ne 0x303F) -or
        ($CodePoint -ge 0xAC00 -and $CodePoint -le 0xD7A3) -or
        ($CodePoint -ge 0xF900 -and $CodePoint -le 0xFAFF) -or
        ($CodePoint -ge 0xFE10 -and $CodePoint -le 0xFE19) -or
        ($CodePoint -ge 0xFE30 -and $CodePoint -le 0xFE6F) -or
        ($CodePoint -ge 0xFF00 -and $CodePoint -le 0xFF60) -or
        ($CodePoint -ge 0xFFE0 -and $CodePoint -le 0xFFE6) -or
        ($CodePoint -ge 0x1F300 -and $CodePoint -le 0x1FAFF) -or
        ($CodePoint -ge 0x20000 -and $CodePoint -le 0x3FFFD)
    if ($wide) { return 2 }
    return 1
}

function Get-AtsTextWidth {
    param([AllowEmptyString()][string] $Value)

    if ([string]::IsNullOrEmpty($Value)) { return 0 }
    $width = 0
    $index = 0
    while ($index -lt $Value.Length) {
        $codePoint = [char]::ConvertToUtf32($Value, $index)
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($Value, $index)
        $width += Get-AtsCodePointWidth $codePoint $category
        $index += if ($codePoint -gt 0xFFFF) { 2 } else { 1 }
    }
    return $width
}

function Get-AtsPrefixByWidth {
    param(
        [Parameter(Mandatory = $true)][string] $Value,
        [Parameter(Mandatory = $true)][int] $Width
    )

    $used = 0
    $index = 0
    while ($index -lt $Value.Length) {
        $codePoint = [char]::ConvertToUtf32($Value, $index)
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($Value, $index)
        $cellWidth = Get-AtsCodePointWidth $codePoint $category
        if ($cellWidth -gt 0 -and $used + $cellWidth -gt $Width) { break }
        $used += $cellWidth
        $index += if ($codePoint -gt 0xFFFF) { 2 } else { 1 }
    }
    return $Value.Substring(0, $index)
}

function Get-AtsSuffixByWidth {
    param(
        [Parameter(Mandatory = $true)][string] $Value,
        [Parameter(Mandatory = $true)][int] $Width
    )

    $used = 0
    $index = $Value.Length
    while ($index -gt 0) {
        $start = $index - 1
        if ([char]::IsLowSurrogate($Value[$start]) -and $start -gt 0 -and [char]::IsHighSurrogate($Value[$start - 1])) {
            $start--
        }
        $codePoint = [char]::ConvertToUtf32($Value, $start)
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($Value, $start)
        $cellWidth = Get-AtsCodePointWidth $codePoint $category
        if ($cellWidth -gt 0 -and $used + $cellWidth -gt $Width) { break }
        $used += $cellWidth
        $index = $start
    }
    return $Value.Substring($index)
}

function Compress-AtsMiddle {
    param(
        [Parameter(Mandatory = $true)][string] $Value,
        [Parameter(Mandatory = $true)][int] $Width,
        [bool] $AsciiOnly = $false
    )

    if ($Width -le 0) { return '' }
    if ((Get-AtsTextWidth $Value) -le $Width) { return $Value }
    $marker = if ($AsciiOnly) { '...' } else { [string][char]0x2026 }
    $markerWidth = Get-AtsTextWidth $marker
    if ($Width -le $markerWidth) { return Get-AtsPrefixByWidth $Value $Width }
    $available = $Width - $markerWidth
    $left = [Math]::Max(1, [Math]::Floor($available / 2))
    $right = [Math]::Max(1, $available - $left)
    return (Get-AtsPrefixByWidth $Value $left) + $marker + (Get-AtsSuffixByWidth $Value $right)
}

function Format-AtsStatus {
    param([Parameter(Mandatory = $true)] $Identity)

    $asciiOnly = Test-AtsTruthy $env:ATS_ASCII
    $separator = if ($asciiOnly) { ' | ' } else { ' ' + [string][char]0x00B7 + ' ' }
    $branchMode = Get-AtsMode $env:ATS_SHOW_BRANCH
    $hostMode = Get-AtsMode $env:ATS_SHOW_HOST
    $width = Get-AtsMaxWidth
    $path = if ([string]::IsNullOrEmpty([string]$Identity.Path)) { [string]$Identity.Cwd } else { [string]$Identity.Path }
    if ([string]::IsNullOrEmpty($path)) { $path = '?' }
    $includeBranch = -not [string]::IsNullOrEmpty([string]$Identity.Branch) -and $branchMode -ne 'never'
    $includeHost = -not [string]::IsNullOrEmpty([string]$Identity.Machine) -and $hostMode -ne 'never'

    $compose = {
        param([string] $CurrentPath)
        $parts = New-Object System.Collections.Generic.List[string]
        $parts.Add($CurrentPath)
        if ($includeBranch) { $parts.Add([string]$Identity.Branch) }
        if ($includeHost) { $parts.Add([string]$Identity.Machine) }
        return $parts -join $separator
    }

    $line = & $compose $path
    if ((Get-AtsTextWidth $line) -le $width) { return $line }

    $suffixParts = New-Object System.Collections.Generic.List[string]
    if ($includeBranch) { $suffixParts.Add([string]$Identity.Branch) }
    if ($includeHost) { $suffixParts.Add([string]$Identity.Machine) }
    $suffixLength = if ($suffixParts.Count -gt 0) { Get-AtsTextWidth ($separator + ($suffixParts -join $separator)) } else { 0 }
    $minimumPath = [Math]::Min(18, [Math]::Max(8, [Math]::Floor($width / 2)))
    if ($suffixLength + $minimumPath -le $width) {
        return & $compose (Compress-AtsMiddle $path ($width - $suffixLength) $asciiOnly)
    }

    if ($includeBranch -and $branchMode -eq 'auto') {
        $includeBranch = $false
        $line = & $compose $path
        if ((Get-AtsTextWidth $line) -le $width) { return $line }
    }

    $suffixLength = if ($includeHost) { Get-AtsTextWidth ($separator + [string]$Identity.Machine) } else { 0 }
    if ($suffixLength + $minimumPath -le $width) {
        return & $compose (Compress-AtsMiddle $path ($width - $suffixLength) $asciiOnly)
    }

    if ($includeHost -and $hostMode -eq 'auto') {
        $includeHost = $false
        $line = & $compose $path
        if ((Get-AtsTextWidth $line) -le $width) { return $line }
    }

    $suffixParts = New-Object System.Collections.Generic.List[string]
    if ($includeBranch) { $suffixParts.Add([string]$Identity.Branch) }
    if ($includeHost) { $suffixParts.Add([string]$Identity.Machine) }
    $suffix = if ($suffixParts.Count -gt 0) { $separator + ($suffixParts -join $separator) } else { '' }
    $pathBudget = [Math]::Max(1, $width - (Get-AtsTextWidth $suffix))
    $final = (Compress-AtsMiddle $path $pathBudget $asciiOnly) + $suffix
    return Compress-AtsMiddle $final $width $asciiOnly
}

function New-AtsIdentity {
    param(
        [string] $Json,
        [string] $FallbackCwd,
        [AllowNull()] $GitIdentity,
        [string] $Machine,
        [switch] $SkipGitCollection
    )

    $cwd = Get-AtsPayloadCwd $Json $FallbackCwd
    $git = if ($SkipGitCollection) { $GitIdentity } elseif ($null -ne $GitIdentity) { $GitIdentity } else { Get-AtsGitIdentity $cwd }
    $style = if ([string]::IsNullOrWhiteSpace($env:ATS_PATH_STYLE)) { 'context' } else { $env:ATS_PATH_STYLE }
    $path = Get-AtsDisplayPath $cwd $git $style
    $hostName = $Machine
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = $env:ATS_MACHINE }
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = $env:COMPUTERNAME }
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = $env:HOSTNAME }
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = [Environment]::MachineName }
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = 'unknown' }

    return [pscustomobject]@{
        Cwd = $cwd
        Path = $path
        Branch = if ($null -ne $git) { $git.Branch } else { $null }
        Machine = $hostName
    }
}

function Invoke-AgentTerminalStatus {
    param([string] $Json)
    if ([string]::IsNullOrEmpty($Json)) {
        try { $Json = [Console]::In.ReadToEnd() } catch { $Json = '' }
    }
    $identity = New-AtsIdentity -Json $Json
    return Format-AtsStatus $identity
}

if ($env:ATS_TESTING -ne '1') {
    Set-AtsUtf8Console
    try {
        [Console]::Out.WriteLine((Invoke-AgentTerminalStatus $InputJson))
    }
    catch {
        $fallback = Get-AtsPayloadCwd '' ''
        $identity = New-AtsIdentity -Json '' -FallbackCwd $fallback -SkipGitCollection
        [Console]::Out.WriteLine((Format-AtsStatus $identity))
    }
}
