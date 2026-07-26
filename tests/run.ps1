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
}
finally {
    if ($null -eq $originalTesting) { Remove-Item Env:ATS_TESTING -ErrorAction SilentlyContinue } else { $env:ATS_TESTING = $originalTesting }
    if ($null -eq $originalMachine) { Remove-Item Env:ATS_MACHINE -ErrorAction SilentlyContinue } else { $env:ATS_MACHINE = $originalMachine }
    if ($null -eq $originalColumns) { Remove-Item Env:COLUMNS -ErrorAction SilentlyContinue } else { $env:COLUMNS = $originalColumns }
    if ($null -eq $originalAscii) { Remove-Item Env:ATS_ASCII -ErrorAction SilentlyContinue } else { $env:ATS_ASCII = $originalAscii }
    if ($null -eq $originalBranchMode) { Remove-Item Env:ATS_SHOW_BRANCH -ErrorAction SilentlyContinue } else { $env:ATS_SHOW_BRANCH = $originalBranchMode }
    if ($null -eq $originalHostMode) { Remove-Item Env:ATS_SHOW_HOST -ErrorAction SilentlyContinue } else { $env:ATS_SHOW_HOST = $originalHostMode }
}

Write-Output "PowerShell tests: $script:Passed passed, $script:Failed failed"
if ($script:Failed -gt 0) { exit 1 }
