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

function Join-ProcessArguments {
  param([array]$Arguments)

  return ($Arguments | ForEach-Object {
    $value = [string]$_
    if ($value -eq "") {
      return '""'
    }
    if ($value -notmatch '[\s"]') {
      return $value
    }

    $escaped = $value -replace '(\\*)"', '$1$1\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    return '"{0}"' -f $escaped
  }) -join " "
}

function Get-GitChangedFiles {
  Push-Location $RepoRoot
  try {
    $files = git status --porcelain | ForEach-Object {
      if ($_.Length -ge 4) { $_.Substring(3) } else { $_ }
    }
    return @($files | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  } finally {
    Pop-Location
  }
}

function Get-BlockingGitChangedFiles {
  $ignored = @(
    "agent-last-run.json"
  )
  return @(Get-GitChangedFiles | Where-Object { $ignored -notcontains $_ })
}

function Get-StatusExcerpt {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ""
  }

  $clean = ($Text -replace "`0", "" -replace "\r\n", "`n").Trim()
  if ($clean.Length -le 900) {
    return $clean
  }

  return $clean.Substring([Math]::Max(0, $clean.Length - 900)).Trim()
}

function Get-ImpactLabel {
  param([nullable[int]]$Score)

  if ($null -eq $Score) {
    return "Not scored yet"
  }
  if ($Score -ge 5) {
    return "Major iPhone-visible improvement"
  }
  if ($Score -ge 4) {
    return "Strong iPhone-visible improvement"
  }
  if ($Score -ge 3) {
    return "Useful visible improvement"
  }
  if ($Score -ge 2) {
    return "Small useful improvement"
  }
  if ($Score -ge 1) {
    return "Maintenance only"
  }
  return "No visible impact"
}

function Get-ImpactFromMessage {
  param([string]$Message)

  $score = $null
  $visibleChange = ""
  $reason = ""
  $endedEarlyBecause = ""
  $timeLostTo = ""
  $blockedBy = ""

  if (-not [string]::IsNullOrWhiteSpace($Message)) {
    $scoreMatch = [regex]::Match($Message, "(?im)^\s*(?:Impact\s*Score|Impact)\s*:\s*([0-5])\s*(?:/|out\s+of\s+)?\s*5?\b")
    if ($scoreMatch.Success) {
      $score = [int]$scoreMatch.Groups[1].Value
    }

    $visibleMatch = [regex]::Match($Message, "(?im)^\s*(?:Visible\s*Change|User-visible\s*Change|What\s*changed)\s*:\s*(.+)$")
    if ($visibleMatch.Success) {
      $visibleChange = $visibleMatch.Groups[1].Value.Trim()
    }

    $reasonMatch = [regex]::Match($Message, "(?im)^\s*(?:Impact\s*Reason|Why\s*it\s*matters)\s*:\s*(.+)$")
    if ($reasonMatch.Success) {
      $reason = $reasonMatch.Groups[1].Value.Trim()
    }

    $endedEarlyMatch = [regex]::Match($Message, "(?im)^\s*(?:Ended\s*Early\s*Because|Run\s*End\s*Reason)\s*:\s*(.+)$")
    if ($endedEarlyMatch.Success) {
      $endedEarlyBecause = $endedEarlyMatch.Groups[1].Value.Trim()
    }

    $timeLostMatch = [regex]::Match($Message, "(?im)^\s*Time\s*Lost\s*To\s*:\s*(.+)$")
    if ($timeLostMatch.Success) {
      $timeLostTo = $timeLostMatch.Groups[1].Value.Trim()
    }

    $blockedByMatch = [regex]::Match($Message, "(?im)^\s*Blocked\s*By\s*:\s*(.+)$")
    if ($blockedByMatch.Success) {
      $blockedBy = $blockedByMatch.Groups[1].Value.Trim()
    }
  }

  return [ordered]@{
    score = $score
    label = Get-ImpactLabel -Score $score
    visibleChange = $visibleChange
    reason = $reason
    endedEarlyBecause = $endedEarlyBecause
    timeLostTo = $timeLostTo
    blockedBy = $blockedBy
  }
}

function Get-FirstUsefulSummaryLine {
  param([string]$Message)

  if ([string]::IsNullOrWhiteSpace($Message)) {
    return ""
  }

  $lines = $Message -replace "\r\n", "`n" -split "`n"
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }
    if ($trimmed -match '^(Impact\s*Score|Visible\s*Change|Impact\s*Reason|Ended\s*Early\s*Because|Run\s*End\s*Reason|Time\s*Lost\s*To|Blocked\s*By|Next safe slice)\s*:') {
      continue
    }
    return $trimmed
  }

  return ""
}

function Get-ShortCommitSubject {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ""
  }

  $subject = $Text.Trim()
  $subject = $subject -replace '`', ''
  $subject = $subject -replace '\[(.*?)\]\((.*?)\)', '$1'
  $subject = $subject -replace '\s+', ' '
  $subject = $subject.Trim(' ', '.', ':', ';', '-', '!', '?')
  if ($subject.Length -gt 72) {
    $subject = $subject.Substring(0, 72).Trim()
    $subject = $subject.TrimEnd('.', ':', ';', '-', '!', '?')
  }
  return $subject
}

function Get-AutoCommitMessage {
  param(
    $Config,
    [string]$LastMessage,
    [array]$ChangedFiles,
    [object]$Impact
  )

  $files = @($ChangedFiles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  $visible = if ($Impact -and $Impact.visibleChange) { $Impact.visibleChange } else { "" }
  $summaryLine = Get-FirstUsefulSummaryLine -Message $LastMessage
  $subject = Get-ShortCommitSubject -Text $(if ($visible) { $visible } else { $summaryLine })

  $combined = (($visible + " " + $summaryLine + " " + $LastMessage).ToLowerInvariant())
  $extensions = @($files | ForEach-Object { [IO.Path]::GetExtension($_).ToLowerInvariant() } | Where-Object { $_ })

  $prefix = "chore"
  if ($combined -match '\b(fix|fixed|fixes|bug|regression|broken|stuck|overflow|crash|error|failed|restore|offline|auth)\b') {
    $prefix = "fix"
  } elseif ($Impact -and $null -ne $Impact.score -and [int]$Impact.score -ge 3) {
    $prefix = "feat"
  } elseif ($extensions.Count -gt 0 -and ($extensions | Where-Object { $_ -notin @('.md') }).Count -eq 0) {
    $prefix = "docs"
  } elseif ($extensions -contains '.ps1' -and ($extensions | Where-Object { $_ -in @('.ps1', '.json', '.md') }).Count -eq $extensions.Count) {
    $prefix = "chore"
  }

  if ([string]::IsNullOrWhiteSpace($subject)) {
    return "{0}: automated Ridgeline agent run {1}" -f $prefix, (Get-Date).ToString("yyyy-MM-dd HH:mm")
  }

  return "{0}: {1}" -f $prefix, $subject
}

function Write-AgentStatus {
  param(
    [string]$Status,
    [string]$StartedAt,
    [string]$FinishedAt,
    [string]$Summary,
    [string]$Commit = $null,
    [bool]$Pushed = $false,
    [array]$ChangedFiles = @(),
    [string]$Phase = "",
    [string]$StatusTitle = "",
    [string]$StatusDetail = "",
    [string]$ActionRequired = "",
    [string]$FailureKind = "",
    [string]$Diagnostic = "",
    [string]$OutputLog = "",
    [object]$Impact = $null,
    [string]$EndedEarlyBecause = "",
    [string]$TimeLostTo = "",
    [string]$BlockedBy = ""
  )

  $intervalMinutes = 90
  try {
    $statusConfig = Read-Config
    if ($statusConfig.intervalMinutes) {
      $intervalMinutes = [int]$statusConfig.intervalMinutes
    }
  } catch {
    $intervalMinutes = 90
  }

  $nextExpectedRunAt = $null
  if ($FinishedAt) {
    try {
      $nextExpectedRunAt = ([DateTimeOffset]::Parse($FinishedAt).AddMinutes($intervalMinutes)).ToString("o")
    } catch {
      $nextExpectedRunAt = $null
    }
  }

  $durationMinutes = $null
  try {
    if ($StartedAt -and $FinishedAt) {
      $durationMinutes = [Math]::Round(([DateTimeOffset]::Parse($FinishedAt) - [DateTimeOffset]::Parse($StartedAt)).TotalMinutes, 1)
    } elseif ($StartedAt) {
      $durationMinutes = [Math]::Round(([DateTimeOffset]::Now - [DateTimeOffset]::Parse($StartedAt)).TotalMinutes, 1)
    }
  } catch {
    $durationMinutes = $null
  }

  $payload = [ordered]@{
    agentName = "Anton"
    statusVersion = 5
    status = $Status
    statusTitle = $StatusTitle
    statusDetail = $StatusDetail
    phase = $Phase
    actionRequired = $ActionRequired
    failureKind = $FailureKind
    diagnostic = $Diagnostic
    startedAt = $StartedAt
    finishedAt = $FinishedAt
    lastHeartbeatAt = [DateTimeOffset]::Now.ToString("o")
    intervalMinutes = $intervalMinutes
    nextExpectedRunAt = $nextExpectedRunAt
    durationMinutes = $durationMinutes
    commit = $Commit
    pushed = $Pushed
    summary = $Summary
    changedFiles = @($ChangedFiles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    impactScore = if ($Impact -and $null -ne $Impact.score) { $Impact.score } else { $null }
    impactLabel = if ($Impact -and $Impact.label) { $Impact.label } else { "Not scored yet" }
    visibleChange = if ($Impact -and $Impact.visibleChange) { $Impact.visibleChange } else { "" }
    impactReason = if ($Impact -and $Impact.reason) { $Impact.reason } else { "" }
    endedEarlyBecause = if ($Impact -and $Impact.endedEarlyBecause) { $Impact.endedEarlyBecause } elseif ($EndedEarlyBecause) { $EndedEarlyBecause } else { "" }
    timeLostTo = if ($Impact -and $Impact.timeLostTo) { $Impact.timeLostTo } elseif ($TimeLostTo) { $TimeLostTo } else { "" }
    blockedBy = if ($Impact -and $Impact.blockedBy) { $Impact.blockedBy } elseif ($BlockedBy) { $BlockedBy } else { "" }
    log = "agent-runs/agent-loop.log"
    outputLog = $OutputLog
  }

  $payload | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $StatusPath -Encoding UTF8
}

function Publish-AgentStatus {
  param([string]$Reason)

  Push-Location $RepoRoot
  try {
    git add -- agent-last-run.json
    git diff --cached --quiet -- agent-last-run.json
    if ($LASTEXITCODE -eq 0) {
      return
    }

    $message = "chore: update Anton status: {0}" -f $Reason
    git commit -m $message -- agent-last-run.json
    if ($LASTEXITCODE -ne 0) {
      Write-Log "Could not commit Anton status update for '$Reason'."
      return
    }

    $statusCommitSha = (git rev-parse --short HEAD).Trim()
    $config = Read-Config
    if ($config.pushChanges) {
      $branch = [string]$config.branch
      if ([string]::IsNullOrWhiteSpace($branch)) {
        $branch = (git branch --show-current).Trim()
      }
      git push ([string]$config.remote) $branch
      if ($LASTEXITCODE -eq 0) {
        Write-Log "Pushed Anton status update $statusCommitSha to $($config.remote)/$branch."
      } else {
        Write-Log "Push failed for Anton status update $statusCommitSha."
      }
    }
  } finally {
    Pop-Location
  }
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

  Push-Location $RepoRoot
  try {
    Write-Log "Starting Ridgeline Codex agent run."
    Write-Log "Repository: $RepoRoot"

    $startingChanges = Get-BlockingGitChangedFiles
    if ($config.requireCleanWorktree -and $startingChanges.Count -gt 0) {
      $message = "Anton did not start because the worktree already has $($startingChanges.Count) changed file(s). Commit, stash, or review those changes first so automated commits only include Anton's own work."
      Write-Log $message
      Write-AgentStatus `
        -Status "blocked-dirty-worktree" `
        -StartedAt $started `
        -FinishedAt ([DateTimeOffset]::Now.ToString("o")) `
        -Summary $message `
        -ChangedFiles (Get-GitChangedFiles) `
        -Phase "Preflight" `
        -StatusTitle "Blocked by local changes" `
        -StatusDetail "Anton found uncommitted files before it started. It stopped so it would not mix unrelated work into an automated commit." `
        -ActionRequired "Review, commit, or stash the local changes, then start Anton again." `
        -EndedEarlyBecause "The worktree already had local changes that could mix with an automated run." `
        -BlockedBy "dirty-worktree"
      Publish-AgentStatus -Reason "blocked"
      return
    }

    $summary = "Agent run started."
    Write-AgentStatus `
      -Status "running" `
      -StartedAt $started `
      -FinishedAt $null `
      -Summary $summary `
      -ChangedFiles (Get-GitChangedFiles) `
      -Phase "Starting Codex" `
      -StatusTitle "Anton is working" `
      -StatusDetail "The scheduled task started and Anton is launching Codex for the next site-improvement slice." `
      -ActionRequired "No action needed. Refresh this page after the run finishes to see the commit, files, and summary."
    Publish-AgentStatus -Reason "running"

    $codexPath = Resolve-CodexPath

    $repoArg = Resolve-Path (Join-Path $RepoRoot ([string]$config.repoRoot))
    $codexArgsToRun = @()
    $codexArgsToRun += @($config.codexArgs)
    $codexArgsToRun += @("--cd", $repoArg.Path)
    $codexArgsToRun += @("--output-last-message", $LastMessagePath)
    $codexArgsToRun += @([string]$config.prompt)

    $outputPath = Join-Path $RunDir ("codex-{0}.log" -f (Get-Date).ToString("yyyyMMdd-HHmmss"))
    $stdoutPath = Join-Path $RunDir ("codex-{0}.stdout.log" -f (Get-Date).ToString("yyyyMMdd-HHmmss"))
    $stderrPath = Join-Path $RunDir ("codex-{0}.stderr.log" -f (Get-Date).ToString("yyyyMMdd-HHmmss"))
    $displayArgs = $codexArgsToRun | ForEach-Object {
      if ($_ -match '\s') { '"{0}"' -f ($_ -replace '"', '\"') } else { $_ }
    }
    Write-Log "Running: $codexPath $($displayArgs -join ' ')"
    $process = Start-Process `
      -FilePath $codexPath `
      -ArgumentList (Join-ProcessArguments -Arguments $codexArgsToRun) `
      -WorkingDirectory $RepoRoot `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -WindowStyle Hidden `
      -Wait `
      -PassThru
    $exitCode = $process.ExitCode

    Set-Content -LiteralPath $outputPath -Value @(
      "STDOUT:"
      if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw }
      "STDERR:"
      if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw }
    ) -Encoding UTF8

    if ($exitCode -ne 0) {
      $combinedOutput = ""
      if (Test-Path -LiteralPath $stdoutPath) {
        $combinedOutput += Get-Content -LiteralPath $stdoutPath -Raw
      }
      if (Test-Path -LiteralPath $stderrPath) {
        $combinedOutput += Get-Content -LiteralPath $stderrPath -Raw
      }
      $failureStatus = "waiting-for-tokens-or-auth"
      $failureText = "Codex exited with code $exitCode. Check the captured stdout/stderr for the exact cause. See $outputPath."
      if ($combinedOutput -match "unrecognized subcommand|unexpected argument") {
        $failureStatus = "command-error"
        $failureText = "Codex exited with code $exitCode because the runner passed an invalid command-line argument. See $outputPath."
      } elseif ($combinedOutput -match "quota|rate limit|tokens|authentication|unauthorized|forbidden|login") {
        $failureText = "Codex exited with code $exitCode because auth, quota, rate limit, or token access may need attention. See $outputPath."
      }
      Write-Log $failureText
      $actionRequired = if ($failureStatus -eq "command-error") {
        "Fix the Anton runner command-line configuration, then start Anton again."
      } else {
        "Check Codex/OpenAI login, quota, token, or rate-limit status. Anton will retry on the next scheduled run."
      }
      $failureKind = if ($failureStatus -eq "command-error") { "runner-command" } else { "tokens-auth-or-service" }
      Write-AgentStatus `
        -Status $failureStatus `
        -StartedAt $started `
        -FinishedAt ([DateTimeOffset]::Now.ToString("o")) `
        -Summary $failureText `
        -ChangedFiles (Get-GitChangedFiles) `
        -Phase "Codex unavailable" `
        -StatusTitle "Anton could not use Codex" `
        -StatusDetail $failureText `
        -ActionRequired $actionRequired `
        -FailureKind $failureKind `
        -Diagnostic (Get-StatusExcerpt -Text $combinedOutput) `
        -OutputLog ($outputPath.Replace("$RepoRoot\", "")) `
        -EndedEarlyBecause $failureText `
        -BlockedBy $failureKind
      Publish-AgentStatus -Reason "needs-attention"
      return
    }

    $lastMessage = ""
    if (Test-Path -LiteralPath $LastMessagePath) {
      $lastMessage = (Get-Content -LiteralPath $LastMessagePath -Raw).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($lastMessage)) {
      $lastMessage = "Codex finished successfully."
    }
    $impact = Get-ImpactFromMessage -Message $lastMessage

    $changedFiles = Get-GitChangedFiles
    $commitSha = $null
    $pushed = $false

    if ($config.commitChanges -and $changedFiles.Count -gt 0) {
      Write-Log "Staging and committing $($changedFiles.Count) changed file(s)."
      git add -A -- .
      $message = Get-AutoCommitMessage -Config $config -LastMessage $lastMessage -ChangedFiles $changedFiles -Impact $impact
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

    Write-AgentStatus `
      -Status "completed" `
      -StartedAt $started `
      -FinishedAt ([DateTimeOffset]::Now.ToString("o")) `
      -Summary $lastMessage `
      -Commit $commitSha `
      -Pushed $pushed `
      -ChangedFiles $changedFiles `
      -Impact $impact `
      -Phase "Completed" `
      -StatusTitle "Anton finished a run" `
      -StatusDetail "Anton completed the scheduled site-improvement loop and recorded the result." `
      -ActionRequired "No action needed unless you want to review the latest commit."

    $statusOnlyChanges = @(Get-GitChangedFiles | Where-Object { $_ -eq "agent-last-run.json" })
    if ($config.commitChanges -and $statusOnlyChanges.Count -gt 0) {
      Write-Log "Committing updated agent status."
      $statusCommitSha = $null
      git add -- agent-last-run.json
      $statusMessage = "chore: update Anton run status: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm")
      git commit -m $statusMessage -- agent-last-run.json
      if ($LASTEXITCODE -eq 0) {
        $statusCommitSha = (git rev-parse --short HEAD).Trim()
        Write-Log "Committed status update $statusCommitSha."
      }

      if ($config.pushChanges -and $statusCommitSha) {
        $branch = [string]$config.branch
        if ([string]::IsNullOrWhiteSpace($branch)) {
          $branch = (git branch --show-current).Trim()
        }
        git push ([string]$config.remote) $branch
        if ($LASTEXITCODE -eq 0) {
          Write-Log "Pushed status update $statusCommitSha to $($config.remote)/$branch."
        } else {
          Write-Log "Push failed for status update $statusCommitSha. Check GitHub authentication or branch protection."
        }
      }
    }
  } catch {
    $message = "Agent loop error: $($_.Exception.Message)"
    Write-Log $message
    Write-AgentStatus `
      -Status "error" `
      -StartedAt $started `
      -FinishedAt ([DateTimeOffset]::Now.ToString("o")) `
      -Summary $message `
      -ChangedFiles (Get-GitChangedFiles) `
      -Phase "Runner error" `
      -StatusTitle "Anton runner hit an error" `
      -StatusDetail $message `
      -ActionRequired "Check the Anton logs and runner script. Anton will retry on the next scheduled run." `
      -FailureKind "runner-error" `
      -Diagnostic (Get-StatusExcerpt -Text $_.ScriptStackTrace) `
      -EndedEarlyBecause $message `
      -BlockedBy "runner-error"
    Publish-AgentStatus -Reason "error"
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
