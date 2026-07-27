#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$script:Passed = 0
$script:Failed = 0
$originalTesting = $env:ATS_TESTING
$originalMachine = $env:ATS_MACHINE
$originalColumns = $env:COLUMNS
$originalAscii = $env:ATS_ASCII
$originalMaxWidth = $env:ATS_MAX_WIDTH
$originalBranchMode = $env:ATS_SHOW_BRANCH
$originalHostMode = $env:ATS_SHOW_HOST
$unicodeName = ([string][char]0x65E5) + ([char]0x672C) + ([char]0x8A9E)

function Assert-Equal {
    param($Expected, $Actual, [string] $Message)
    if ($Expected -ne $Actual) {
        throw "$Message`nExpected: <$Expected>`nActual:   <$Actual>"
    }
}

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw $Message }
}

function Test-Case {
    param([string] $Name, [scriptblock] $Body)
    try {
        & $Body
        $script:Passed++
        Write-Output "PASS $Name"
    }
    catch {
        $script:Failed++
        Write-Output "FAIL $Name"
        Write-Output $_
    }
}

function Invoke-Git {
    param([string] $Cwd, [Parameter(ValueFromRemainingArguments = $true)][string[]] $Arguments)
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & git -C $Cwd @Arguments 2>$null | Out-Null
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0) {
        throw "git failed in '$Cwd': $($Arguments -join ' ') (exit $exitCode)"
    }
}

$env:ATS_TESTING = '1'
. (Join-Path $root 'src\statusline.ps1')

try {
    Test-Case 'workspace.current_dir wins' {
        $json = '{"cwd":"C:\\stale","workspace":{"current_dir":"C:\\current","project_dir":"C:\\started"}}'
        Assert-Equal 'C:\current' (Get-AtsPayloadCwd $json 'C:\fallback') 'Wrong cwd precedence.'
    }

    Test-Case 'malformed JSON falls back' {
        Assert-Equal 'C:\safe' (Get-AtsPayloadCwd '{broken' 'C:\safe') 'Malformed JSON did not fall back.'
    }

    Test-Case 'payload paths must be nonblank strings' {
        $json = '{"cwd":"   ","workspace":{"current_dir":[1,2],"project_dir":"C:\\safe\\project"}}'
        Assert-Equal 'C:\safe\project' (Get-AtsPayloadCwd $json 'C:\fallback') 'Invalid payload path was coerced.'
    }

    Test-Case 'repo-relative path preserves spaces and Unicode' {
        $git = [pscustomobject]@{ Root = 'C:\Users\alex\work\sample repo'; Branch = 'main' }
        $value = Get-AtsDisplayPath "C:\Users\alex\work\sample repo\packages\$unicodeName" $git
        Assert-Equal "sample repo/packages/$unicodeName" $value 'Context path was not preserved.'
    }

    Test-Case 'home path follows the displayed path style' {
        $savedHome = $env:HOME
        $savedProfile = $env:USERPROFILE
        try {
            $env:HOME = '/c/Users/alex'
            $env:USERPROFILE = 'C:\Users\alex'
            Assert-Equal '~/scratch/notes' (Get-AtsDisplayPath 'C:\Users\alex\scratch\notes' $null 'full') 'Windows path did not prefer USERPROFILE.'

            $env:HOME = '/home/alex'
            Assert-Equal '~/scratch/notes' (Get-AtsDisplayPath '/home/alex/scratch/notes' $null 'full') 'POSIX path did not prefer HOME.'
        }
        finally {
            if ($null -eq $savedHome) { Remove-Item Env:HOME -ErrorAction SilentlyContinue } else { $env:HOME = $savedHome }
            if ($null -eq $savedProfile) { Remove-Item Env:USERPROFILE -ErrorAction SilentlyContinue } else { $env:USERPROFILE = $savedProfile }
        }
    }

    Test-Case 'missing home still emits workspace identity' {
        $savedHome = $env:HOME
        $savedProfile = $env:USERPROFILE
        $savedHomeDrive = $env:HOMEDRIVE
        $savedHomePath = $env:HOMEPATH
        try {
            Remove-Item Env:HOME -ErrorAction SilentlyContinue
            Remove-Item Env:USERPROFILE -ErrorAction SilentlyContinue
            Remove-Item Env:HOMEDRIVE -ErrorAction SilentlyContinue
            Remove-Item Env:HOMEPATH -ErrorAction SilentlyContinue
            $identity = New-AtsIdentity `
                -Json '{"workspace":{"current_dir":"C:\\work\\proj"}}' `
                -Machine 'probe' `
                -SkipGitCollection
            $value = Format-AtsStatus $identity
            Assert-Equal 'C:/work/proj' $identity.Path 'Missing home changed the workspace path.'
            Assert-True (-not [string]::IsNullOrWhiteSpace($value)) 'Missing home produced a blank status row.'
            Assert-True ($value.Contains('C:/work/proj')) 'Missing home hid the workspace identity.'
            Assert-True ($value.Contains('probe')) 'Missing home hid the machine identity.'
        }
        finally {
            if ($null -eq $savedHome) { Remove-Item Env:HOME -ErrorAction SilentlyContinue } else { $env:HOME = $savedHome }
            if ($null -eq $savedProfile) { Remove-Item Env:USERPROFILE -ErrorAction SilentlyContinue } else { $env:USERPROFILE = $savedProfile }
            if ($null -eq $savedHomeDrive) { Remove-Item Env:HOMEDRIVE -ErrorAction SilentlyContinue } else { $env:HOMEDRIVE = $savedHomeDrive }
            if ($null -eq $savedHomePath) { Remove-Item Env:HOMEPATH -ErrorAction SilentlyContinue } else { $env:HOMEPATH = $savedHomePath }
        }
    }

    Test-Case 'wide render includes path branch and machine' {
        $env:ATS_MACHINE = 'build-box'
        $env:COLUMNS = '96'
        $env:ATS_SHOW_BRANCH = 'auto'
        $env:ATS_SHOW_HOST = 'auto'
        $identity = [pscustomobject]@{
            Cwd = 'C:\work\project\docs'
            Path = 'project/docs'
            Branch = 'feature/status'
            Machine = 'build-box'
        }
        $dot = [string][char]0x00B7
        Assert-Equal ("project/docs $dot feature/status $dot build-box") (Format-AtsStatus $identity) 'Wide output mismatch.'
    }

    Test-Case 'narrow render drops branch before machine' {
        $env:COLUMNS = '32'
        $identity = [pscustomobject]@{
            Cwd = 'C:\work\project\packages\very-long-service'
            Path = 'project/packages/very-long-service'
            Branch = 'feature/very-long-branch'
            Machine = 'build-box'
        }
        $value = Format-AtsStatus $identity
        Assert-True ($value.Length -le 32) 'Narrow output exceeded COLUMNS.'
        Assert-True (-not $value.Contains('feature/')) 'Branch was not dropped first.'
        Assert-True ($value.Contains('build-box')) 'Machine should remain at this width.'
        Assert-True ($value.Contains('service')) 'Leaf directory was lost.'
    }

    Test-Case 'narrow render counts wide Unicode cells' {
        $env:COLUMNS = '26'
        $identity = [pscustomobject]@{
            Cwd = "C:\work\project\packages\$unicodeName-service"
            Path = "project/packages/$unicodeName-service"
            Branch = 'main'
            Machine = 'build-box'
        }
        $value = Format-AtsStatus $identity
        Assert-True ((Get-AtsTextWidth $value) -le 26) 'Wide Unicode output exceeded COLUMNS.'
        Assert-True ($value.Contains('service')) 'Wide Unicode truncation lost the leaf.'
    }

    Test-Case 'ASCII visibility overrides' {
        $env:COLUMNS = '96'
        $env:ATS_ASCII = '1'
        $env:ATS_SHOW_BRANCH = 'never'
        $env:ATS_SHOW_HOST = 'always'
        $identity = [pscustomobject]@{ Cwd = 'C:\work\repo'; Path = 'repo'; Branch = 'main'; Machine = 'build-box' }
        Assert-Equal 'repo | build-box' (Format-AtsStatus $identity) 'ASCII output mismatch.'
        Remove-Item Env:ATS_ASCII -ErrorAction SilentlyContinue
        $env:ATS_SHOW_BRANCH = 'auto'
        $env:ATS_SHOW_HOST = 'auto'
    }

    Test-Case 'configured width caps a wider terminal' {
        $env:COLUMNS = '160'
        $env:ATS_MAX_WIDTH = '20'
        $identity = [pscustomobject]@{
            Cwd = 'C:\work\project\packages\service'
            Path = 'project/packages/service'
            Branch = 'main'
            Machine = 'build-box'
        }
        $value = Format-AtsStatus $identity
        Assert-True ((Get-AtsTextWidth $value) -le 20) 'ATS_MAX_WIDTH was not applied.'
        Assert-True (-not $value.Contains('build-box')) 'Optional host should be dropped under the configured cap.'
        Remove-Item Env:ATS_MAX_WIDTH -ErrorAction SilentlyContinue
    }

    Test-Case 'render width is invariant across visibility modes' {
        $env:COLUMNS = '512'
        $identities = @(
            [pscustomobject]@{
                Cwd = 'C:\work\payments-api\services\billing\handlers'
                Path = 'payments-api/services/billing/handlers'
                Branch = 'feature/very-long-branch-name-here'
                Machine = 'build-eu'
            },
            [pscustomobject]@{
                Cwd = "C:\work\$unicodeName\packages\$unicodeName-service"
                Path = "$unicodeName/packages/$unicodeName-service"
                Branch = "$unicodeName/very-long-branch"
                Machine = "$unicodeName-build"
            },
            [pscustomobject]@{ Cwd = 'C:\tmp\x'; Path = 'x'; Branch = $null; Machine = '' }
        )
        foreach ($width in 12..96) {
            $env:ATS_MAX_WIDTH = [string]$width
            foreach ($branchMode in @('auto', 'always', 'never')) {
                $env:ATS_SHOW_BRANCH = $branchMode
                foreach ($hostMode in @('auto', 'always', 'never')) {
                    $env:ATS_SHOW_HOST = $hostMode
                    foreach ($identity in $identities) {
                        $value = Format-AtsStatus $identity
                        Assert-True ((Get-AtsTextWidth $value) -le $width) "Output exceeded width $width for branch=$branchMode host=$hostMode`: $value"
                    }
                }
            }
        }
        Remove-Item Env:ATS_MAX_WIDTH -ErrorAction SilentlyContinue
        $env:ATS_SHOW_BRANCH = 'auto'
        $env:ATS_SHOW_HOST = 'auto'
    }

    Test-Case 'render replaces unsafe Unicode formatting characters' {
        $env:COLUMNS = '512'
        $env:ATS_MAX_WIDTH = '512'
        $env:ATS_SHOW_BRANCH = 'always'
        $env:ATS_SHOW_HOST = 'always'
        $unsafeCharacters = @(
            [string][char]0x0000,
            [string][char]0x001B,
            [string][char]0x0085,
            [string][char]0x061C,
            [string][char]0x200B,
            [string][char]0x200F,
            [string][char]0x2028,
            [string][char]0x2029,
            [string][char]0x202D,
            [string][char]0x202E,
            [string][char]0x2066,
            [string][char]0x2069,
            [string][char]0xFEFF,
            ([string][char]0xDB40 + [char]0xDC7F),
            [string][char]0xD800
        )
        $attack = $unsafeCharacters -join 'x'
        $safeText = $unicodeName + '/e' + [char]0x0301 + '/' + [char]0x2764 + [char]0xFE0F
        $identity = [pscustomobject]@{
            Cwd = "C:\work\repo\$attack"
            Path = "repo/$safeText/$attack"
            Branch = "feature/$attack"
            Machine = "build-$attack"
        }
        $value = Format-AtsStatus $identity
        foreach ($character in $unsafeCharacters) {
            Assert-True (-not $value.Contains($character)) 'Output retained an unsafe formatting character.'
        }
        for ($index = 0; $index -lt $value.Length; $index++) {
            $codeUnitLength = if (
                [char]::IsHighSurrogate($value[$index]) -and
                $index + 1 -lt $value.Length -and
                [char]::IsLowSurrogate($value[$index + 1])
            ) {
                2
            }
            else {
                1
            }
            $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($value, $index)
            $isUnsafe = $category -eq [Globalization.UnicodeCategory]::Control -or
                $category -eq [Globalization.UnicodeCategory]::Format -or
                $category -eq [Globalization.UnicodeCategory]::Surrogate -or
                $category -eq [Globalization.UnicodeCategory]::LineSeparator -or
                $category -eq [Globalization.UnicodeCategory]::ParagraphSeparator
            Assert-True (-not $isUnsafe) "Output retained unsafe category $category."
            $index += $codeUnitLength - 1
        }
        Assert-Equal 1 @($value -split '[\r\n\u0085\u2028\u2029]').Count 'Output broke the one-line contract.'
        Assert-True ($value.Contains($safeText)) 'Sanitization removed safe Unicode text.'
        Remove-Item Env:ATS_MAX_WIDTH -ErrorAction SilentlyContinue
        $env:ATS_SHOW_BRANCH = 'auto'
        $env:ATS_SHOW_HOST = 'auto'
    }

    Test-Case 'PowerShell command emits UTF-8 identity' {
        $payload = '{"workspace":{"current_dir":"C:\\Users\\alex\\\u65e5\u672c\u8a9e"}}'
        $savedTesting = $env:ATS_TESTING
        $process = $null
        try {
            Remove-Item Env:ATS_TESTING -ErrorAction SilentlyContinue
            $utf8 = New-Object System.Text.UTF8Encoding($false)
            $statusPath = Join-Path $root 'src\statusline.ps1'
            $startInfo = New-Object System.Diagnostics.ProcessStartInfo
            $startInfo.FileName = (Get-Command powershell -CommandType Application).Source
            $startInfo.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $statusPath + '"'
            $startInfo.UseShellExecute = $false
            $startInfo.CreateNoWindow = $true
            $startInfo.RedirectStandardInput = $true
            $startInfo.RedirectStandardOutput = $true
            $startInfo.RedirectStandardError = $true
            $startInfo.StandardOutputEncoding = $utf8
            $startInfo.StandardErrorEncoding = $utf8
            $process = New-Object System.Diagnostics.Process
            $process.StartInfo = $startInfo
            Assert-True ($process.Start()) 'Could not start the status command.'
            $inputBytes = $utf8.GetBytes($payload)
            $process.StandardInput.BaseStream.Write($inputBytes, 0, $inputBytes.Length)
            $process.StandardInput.BaseStream.Close()
            $output = $process.StandardOutput.ReadToEnd()
            $errorOutput = $process.StandardError.ReadToEnd()
            $process.WaitForExit()
            Assert-Equal 0 $process.ExitCode "Status command failed: $errorOutput"
            Assert-True ($output.Contains($unicodeName)) 'Command output lost Unicode cwd.'
            Assert-True ($output.Contains([string][char]0x00B7)) 'Command output lost the Unicode separator.'
        }
        finally {
            if ($null -ne $process) { $process.Dispose() }
            $env:ATS_TESTING = $savedTesting
        }
    }

    Test-Case 'Git branch detached HEAD and linked worktree' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-git-' + [Guid]::NewGuid().ToString('N'))
        $repo = Join-Path $temporaryRoot 'repo with spaces'
        try {
            New-Item -ItemType Directory -Path $repo -Force | Out-Null
            Invoke-Git $repo init
            Invoke-Git $repo config user.email test@example.invalid
            Invoke-Git $repo config user.name 'Test User'
            [IO.File]::WriteAllText((Join-Path $repo 'file.txt'), "first`n")
            Invoke-Git $repo add file.txt
            Invoke-Git $repo commit -m initial
            Invoke-Git $repo branch -M main
            $nested = Join-Path (Join-Path $repo 'packages') $unicodeName
            New-Item -ItemType Directory -Path $nested -Force | Out-Null

            $git = Get-AtsGitIdentity $nested
            Assert-Equal 'main' $git.Branch 'Normal branch was not detected.'
            Assert-Equal ((Resolve-Path $repo).Path -replace '\\', '/') (ConvertTo-AtsSlashPath $git.Root) 'Repo root mismatch.'

            Invoke-Git $repo checkout --detach HEAD
            $detached = Get-AtsGitIdentity $nested
            Assert-True ($detached.Branch -match '^detached@[0-9a-f]{7}$') 'Detached HEAD fallback mismatch.'

            Invoke-Git $repo switch main
            $worktree = Join-Path $temporaryRoot 'linked worktree'
            Invoke-Git $repo worktree add -b feature/worktree $worktree
            $worktreeIdentity = Get-AtsGitIdentity $worktree
            Assert-Equal 'feature/worktree' $worktreeIdentity.Branch 'Worktree branch mismatch.'
            Assert-Equal ((Resolve-Path $worktree).Path -replace '\\', '/') (ConvertTo-AtsSlashPath $worktreeIdentity.Root) 'Worktree root mismatch.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'installer preserves and restores an existing statusLine' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-install-' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            $previous = [ordered]@{
                theme = 'dark'
                statusLine = [ordered]@{ type = 'command'; command = 'old-status'; padding = 3 }
            }
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText((Join-Path $config 'settings.json'), ($previous | ConvertTo-Json -Depth 10), $encoding)

            $blocked = $false
            try {
                & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config 2>&1 | Out-Null
            }
            catch {
                $blocked = $true
            }
            Assert-True $blocked 'Existing statusLine should require -Force.'

            & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config -Force | Out-Null
            $installed = [IO.File]::ReadAllText((Join-Path $config 'settings.json')) | ConvertFrom-Json
            Assert-True ([string]$installed.statusLine.command -match 'agent-terminal-status/statusline\.ps1') 'Installed command mismatch.'

            & (Join-Path $config 'agent-terminal-status\uninstall.ps1') | Out-Null
            $restored = [IO.File]::ReadAllText((Join-Path $config 'settings.json')) | ConvertFrom-Json
            Assert-Equal 'old-status' $restored.statusLine.command 'Prior statusLine was not restored.'
            Assert-Equal 'dark' $restored.theme 'Unrelated setting changed.'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $config 'agent-terminal-status'))) 'Install directory was not removed.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'uninstall warns when rollback state is unknown' {
        $encoding = New-Object System.Text.UTF8Encoding($false)
        foreach ($scenario in @(
            'deleted',
            'empty',
            'invalid-json',
            'missing-presence',
            'missing-value',
            'wrong-presence-type'
        )) {
            $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-missing-state-' + $scenario + '-' + [Guid]::NewGuid().ToString('N'))
            $config = Join-Path $temporaryRoot 'claude config'
            try {
                New-Item -ItemType Directory -Path $config -Force | Out-Null
                $settingsPath = Join-Path $config 'settings.json'
                $settings = [ordered]@{
                    theme = 'dark'
                    statusLine = [ordered]@{ type = 'command'; command = 'old-status'; padding = 3 }
                }
                [IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 10), $encoding)
                & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config -Force | Out-Null

                $installDir = Join-Path $config 'agent-terminal-status'
                $statePath = Join-Path $installDir 'install-state.json'
                if ($scenario -eq 'deleted') {
                    Remove-Item -LiteralPath $statePath -Force
                }
                elseif ($scenario -eq 'empty') {
                    [IO.File]::WriteAllText($statePath, '', $encoding)
                }
                elseif ($scenario -eq 'invalid-json') {
                    [IO.File]::WriteAllText($statePath, '{ invalid', $encoding)
                }
                else {
                    $state = [IO.File]::ReadAllText($statePath) | ConvertFrom-Json
                    if ($scenario -eq 'missing-presence') {
                        $state.PSObject.Properties.Remove('previousStatusLinePresent')
                    }
                    elseif ($scenario -eq 'missing-value') {
                        $state.PSObject.Properties.Remove('previousStatusLine')
                    }
                    else {
                        $state.previousStatusLinePresent = 'true'
                    }
                    [IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 10), $encoding)
                }

                $messages = & (Join-Path $installDir 'uninstall.ps1') 3>&1
                $after = [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json
                Assert-True ($null -eq $after.PSObject.Properties['statusLine']) "Scenario '$scenario' retained the installed statusLine."
                Assert-Equal 'dark' $after.theme "Scenario '$scenario' changed an unrelated setting."
                Assert-True (($messages -join "`n") -match 'cannot be restored') "Scenario '$scenario' did not warn about unavailable rollback."
                Assert-True (-not (Test-Path -LiteralPath $installDir)) "Scenario '$scenario' did not remove project files."
            }
            finally {
                if (Test-Path -LiteralPath $temporaryRoot) {
                    $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                    $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                    if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                        throw "Refusing to clean unexpected test path: $resolvedTemporary"
                    }
                    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
                }
            }
        }
    }

    Test-Case 'installed command survives Git Bash routing when available' {
        $gitCommand = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        $gitRoot = if ($null -ne $gitCommand) {
            Split-Path -Parent (Split-Path -Parent $gitCommand.Source)
        }
        else {
            ''
        }
        $gitBash = if (-not [string]::IsNullOrEmpty($gitRoot)) {
            Join-Path $gitRoot 'bin\bash.exe'
        }
        else {
            ''
        }
        if ([string]::IsNullOrEmpty($gitBash) -or -not (Test-Path -LiteralPath $gitBash)) {
            Write-Output 'SKIP Git Bash routing smoke test: Git Bash not found.'
            return
        }

        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats bash ' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        $savedTesting = $env:ATS_TESTING
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config | Out-Null
            $settings = [IO.File]::ReadAllText((Join-Path $config 'settings.json')) | ConvertFrom-Json
            $payloadCwd = (ConvertTo-AtsSlashPath $root)
            $payload = '{"workspace":{"current_dir":"' + $payloadCwd + '"}}'
            $bashScriptPath = Join-Path $temporaryRoot 'invoke-status.sh'
            $bashScript = "#!/bin/sh`nprintf '%s' '$payload' | " + [string]$settings.statusLine.command + "`n"
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($bashScriptPath, $bashScript, $encoding)
            Remove-Item Env:ATS_TESTING -ErrorAction SilentlyContinue
            $output = & $gitBash $bashScriptPath
            Assert-Equal 0 $LASTEXITCODE 'Installed command failed through Git Bash.'
            Assert-True (($output -join "`n").Contains('agent-terminal-status')) 'Installed command produced the wrong identity through Git Bash.'
            & (Join-Path $config 'agent-terminal-status\uninstall.ps1') | Out-Null
        }
        finally {
            $env:ATS_TESTING = $savedTesting
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'installer refuses invalid settings without changes' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-invalid-' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            $settingsPath = Join-Path $config 'settings.json'
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($settingsPath, '{ invalid', $encoding)

            $blocked = $false
            try {
                & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config 2>&1 | Out-Null
            }
            catch {
                $blocked = $true
            }
            Assert-True $blocked 'Invalid JSON should block installation.'
            Assert-Equal '{ invalid' ([IO.File]::ReadAllText($settingsPath)) 'Invalid settings were modified.'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $config 'agent-terminal-status'))) 'Install files were created after invalid settings.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'installer refuses array-root settings without changes' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-array-root-' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            $settingsPath = Join-Path $config 'settings.json'
            $original = '["my","important",{"deeply":"nested"}]'
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($settingsPath, $original, $encoding)

            $blocked = $false
            try {
                & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config 2>&1 | Out-Null
            }
            catch {
                $blocked = $true
            }
            Assert-True $blocked 'Array-root settings should block installation.'
            Assert-Equal $original ([IO.File]::ReadAllText($settingsPath)) 'Array-root settings were modified.'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $config 'agent-terminal-status'))) 'Install files were created for array-root settings.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'uninstall removes own files when settings are corrupt' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-corrupt-uninstall-' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            $settingsPath = Join-Path $config 'settings.json'
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($settingsPath, '{"theme":"dark"}', $encoding)
            & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config | Out-Null
            [IO.File]::WriteAllText($settingsPath, '{ invalid', $encoding)

            $warnings = & (Join-Path $config 'agent-terminal-status\uninstall.ps1') 3>&1
            Assert-True (($warnings -join "`n") -match 'settings are unreadable') 'Uninstall did not explain the partial cleanup.'
            Assert-Equal '{ invalid' ([IO.File]::ReadAllText($settingsPath)) 'Corrupt settings were modified.'
            Assert-True (-not (Test-Path -LiteralPath (Join-Path $config 'agent-terminal-status'))) 'Own install files were not removed.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }

    Test-Case 'uninstall preserves a later user statusLine edit' {
        $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ('ats-later-edit-' + [Guid]::NewGuid().ToString('N'))
        $config = Join-Path $temporaryRoot 'claude config'
        try {
            New-Item -ItemType Directory -Path $config -Force | Out-Null
            $settingsPath = Join-Path $config 'settings.json'
            $encoding = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($settingsPath, '{"theme":"dark"}', $encoding)
            & (Join-Path $root 'scripts\install.ps1') -ConfigDir $config | Out-Null

            $settings = [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json
            $settings.statusLine.command = 'new-user-command'
            [IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 10), $encoding)

            & (Join-Path $config 'agent-terminal-status\uninstall.ps1') 3>$null | Out-Null
            $after = [IO.File]::ReadAllText($settingsPath) | ConvertFrom-Json
            Assert-Equal 'new-user-command' $after.statusLine.command 'Uninstall overwrote a later user edit.'
            Assert-Equal 'dark' $after.theme 'Uninstall changed an unrelated setting.'
        }
        finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
                $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
                if (-not $resolvedTemporary.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to clean unexpected test path: $resolvedTemporary"
                }
                Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
            }
        }
    }
}
finally {
    if ($null -eq $originalTesting) { Remove-Item Env:ATS_TESTING -ErrorAction SilentlyContinue } else { $env:ATS_TESTING = $originalTesting }
    if ($null -eq $originalMachine) { Remove-Item Env:ATS_MACHINE -ErrorAction SilentlyContinue } else { $env:ATS_MACHINE = $originalMachine }
    if ($null -eq $originalColumns) { Remove-Item Env:COLUMNS -ErrorAction SilentlyContinue } else { $env:COLUMNS = $originalColumns }
    if ($null -eq $originalAscii) { Remove-Item Env:ATS_ASCII -ErrorAction SilentlyContinue } else { $env:ATS_ASCII = $originalAscii }
    if ($null -eq $originalMaxWidth) { Remove-Item Env:ATS_MAX_WIDTH -ErrorAction SilentlyContinue } else { $env:ATS_MAX_WIDTH = $originalMaxWidth }
    if ($null -eq $originalBranchMode) { Remove-Item Env:ATS_SHOW_BRANCH -ErrorAction SilentlyContinue } else { $env:ATS_SHOW_BRANCH = $originalBranchMode }
    if ($null -eq $originalHostMode) { Remove-Item Env:ATS_SHOW_HOST -ErrorAction SilentlyContinue } else { $env:ATS_SHOW_HOST = $originalHostMode }
}

Write-Output "PowerShell tests: $script:Passed passed, $script:Failed failed"
if ($script:Failed -gt 0) { exit 1 }
