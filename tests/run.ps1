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

    Test-Case 'repo-relative path preserves spaces and Unicode' {
        $git = [pscustomobject]@{ Root = 'C:\Users\alex\work\sample repo'; Branch = 'main' }
        $value = Get-AtsDisplayPath "C:\Users\alex\work\sample repo\packages\$unicodeName" $git
        Assert-Equal "sample repo/packages/$unicodeName" $value 'Context path was not preserved.'
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
