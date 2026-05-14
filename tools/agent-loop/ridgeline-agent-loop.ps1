param(
  [switch]$Loop,
  [switch]$Once,
  [int]$IntervalMinutes = 0
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$ConfigPath = Join-Path $RepoRoot "agent-loop.config.json"
$StatusPath = Join-Path $RepoRoot "agent-last-run.json"
$RunDir = Join-Path $RepoRoot "agent-runs"
$LogPath = Join-Path $RunDir "agent-loop.log"
$LastMessagePath = Join-Path $RunDir "last-codex-message.md"
$LockPath = Join-Path $RunDir "agent-loop.lock"

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("s"), $Message
  Add-Content -LiteralPath $LogPath -Value $line
  Write-Host $line
}

function Read-Config {
  if (!(Test-Path -LiteralPath $ConfigPath)) {
    throw "Missing config: $ConfigPath"
  }
  return Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
}

function Resolve-CodexPath {
  $command = Get-Command codex -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $extensionRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
  if (Test-Path -LiteralPath $extensionRoot) {
    $candidate = Get-ChildItem -LiteralPath $extensionRoot -Recurse -Filter "codex.exe" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($candidate) {
      return $candidate.FullName
    }
  }

  throw "codex.exe was not found. Open the ChatGPT/Codex extension in VS Code once, or add codex.exe to PATH."
}

function Get-GitChangedFiles {
  Push-Location $RepoRoot
  try {
    $files = git status --porcelain | ForEach-Object {
      if ($_.Length -ge 4) { $_.Substring(3) } else { $_ }
    }
    return @($files)
  } finally {
    Pop-Location
  }
}

function Write-AgentStatus {
  param(
    [string]$Status,
    [string]$StartedAt,
    [string]$FinishedAt,
    [string]$Summary,
    [string]$Commit = $null,
    [bool]$Pushed = $false,
    [array]$ChangedFiles = @()
  )

  $payload = [ordered]@{
    status = $Status
    startedAt = $StartedAt
    finishedAt = $FinishedAt
    commit = $Commit
    pushed = $Pushed
    summary = $Summary
    changedFiles = @($ChangedFiles)
    log = "agent-runs/agent-loop.log"
  }

  $payload | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $StatusPath -Encoding UTF8
}

function Invoke-AgentOnce {
  $config = Read-Config
  if (-not $config.enabled) {
    Write-Log "Agent loop disabled in config."
    return
  }

  if (Test-Path -LiteralPath $LockPath) {
    $lockAge = (Get-Date) - (Get-Item -LiteralPath $LockPath).LastWriteTime
    if ($lockAge.TotalMinutes -lt [double]$config.maxRunMinutes) {
      Write-Log "Another agent run appears active. Lock age: $([int]$lockAge.TotalMinutes) minutes."
      return
    }
    Write-Log "Removing stale lock older than maxRunMinutes."
    Remove-Item -LiteralPath $LockPath -Force
  }

  Set-Content -LiteralPath $LockPath -Value ([DateTimeOffset]::Now.ToString("o")) -Encoding UTF8
  $started = [DateTimeOffset]::Now.ToString("o")
  $summary = "Agent run started."
  Write-AgentStatus -Status "running" -StartedAt $started -FinishedAt $null -Summary $summary -ChangedFiles (Get-GitChangedFiles)

  Push-Location $RepoRoot
  try {
    Write-Log "Starting Ridgeline Codex agent run."
    Write-Log "Repository: $RepoRoot"

    $startingChanges = Get-GitChangedFiles
    if ($config.requireCleanWorktree -and $startingChanges.Count -gt 0) {
      $message = "Anton did not start because the worktree already has $($startingChanges.Count) changed file(s). Commit, stash, or review those changes first so automated commits only include Anton's own work."
      Write-Log $message
      Write-AgentStatus -Status "blocked-dirty-worktree" -StartedAt $started -FinishedAt ([DateTimeOffset]::Now.ToString("o")) -Summary $message -ChangedFiles $startingChanges
      return
    }

    $codexPath = Resolve-CodexPath

    $repoArg = Resolve-Path (Join-Path $RepoRoot ([string]$config.repoRoot))
    $codexArgsToRun = @()
    $codexArgsToRun += @($config.codexArgs)
    $codexArgsToRun += @("--cd", $repoArg.Path)
    $codexArgsToRun += @("--output-last-message", $LastMessagePath)
    $codexArgsToRun += @([string]$config.prompt)

    $outputPath = Join-Path $RunDir ("codex-{0}.log" -f (Get-Date).ToString("yyyyMMdd-HHmmss"))
    Write-Log "Running: $codexPath $($codexArgsToRun -join ' ')"
    & $codexPath @codexArgsToRun *> $outputPath
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
      $failureText = "Codex exited with code $exitCode. This can happen when tokens are unavailable, auth expires, or the service is busy. See $outputPath."
      Write-Log $failureText
      Write-AgentStatus -Status "waiting-for-tokens-or-auth" -StartedAt $started -FinishedAt ([DateTimeOffset]::Now.ToString("o")) -Summary $failureText -ChangedFiles (Get-GitChangedFiles)
      return
    }

    $lastMessage = ""
    if (Test-Path -LiteralPath $LastMessagePath) {
      $lastMessage = (Get-Content -LiteralPath $LastMessagePath -Raw).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($lastMessage)) {
      $lastMessage = "Codex finished successfully."
    }

    $changedFiles = Get-GitChangedFiles
    $commitSha = $null
    $pushed = $false

    if ($config.commitChanges -and $changedFiles.Count -gt 0) {
      Write-Log "Staging and committing $($changedFiles.Count) changed file(s)."
      git add -A -- .
      $message = "{0}: {1}" -f $config.commitMessagePrefix, (Get-Date).ToString("yyyy-MM-dd HH:mm")
      git commit -m $message
      if ($LASTEXITCODE -eq 0) {
        $commitSha = (git rev-parse --short HEAD).Trim()
        Write-Log "Committed $commitSha."
      }

      if ($config.pushChanges -and $commitSha) {
        $branch = [string]$config.branch
        if ([string]::IsNullOrWhiteSpace($branch)) {
          $branch = (git branch --show-current).Trim()
        }
        git push ([string]$config.remote) $branch
        if ($LASTEXITCODE -eq 0) {
          $pushed = $true
          Write-Log "Pushed $commitSha to $($config.remote)/$branch."
        } else {
          Write-Log "Push failed for $commitSha. Check GitHub authentication or branch protection."
        }
      }
    } else {
      Write-Log "No changed files to commit."
    }

    Write-AgentStatus -Status "completed" -StartedAt $started -FinishedAt ([DateTimeOffset]::Now.ToString("o")) -Summary $lastMessage -Commit $commitSha -Pushed $pushed -ChangedFiles $changedFiles
  } catch {
    $message = "Agent loop error: $($_.Exception.Message)"
    Write-Log $message
    Write-AgentStatus -Status "error" -StartedAt $started -FinishedAt ([DateTimeOffset]::Now.ToString("o")) -Summary $message -ChangedFiles (Get-GitChangedFiles)
  } finally {
    Pop-Location
    if (Test-Path -LiteralPath $LockPath) {
      Remove-Item -LiteralPath $LockPath -Force
    }
  }
}

$config = Read-Config
if ($IntervalMinutes -le 0) {
  $IntervalMinutes = [int]$config.intervalMinutes
}
if ($IntervalMinutes -le 0) {
  $IntervalMinutes = 90
}

if ($Loop) {
  Write-Log "Starting continuous loop. Interval: $IntervalMinutes minute(s)."
  while ($true) {
    Invoke-AgentOnce
    Start-Sleep -Seconds ($IntervalMinutes * 60)
  }
} else {
  Invoke-AgentOnce
}
