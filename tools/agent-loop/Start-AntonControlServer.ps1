param(
  [string]$TaskName = "Ridgeline Codex Agent Loop",
  [string]$Prefix = "http://127.0.0.1:8765/",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$AllowedMarkdownFiles = @{
  "ANTON.md" = "Anton Instructions"
  "AGENT_STATE.md" = "Agent State"
  "AGENT_BACKLOG.md" = "Backlog"
  "SITE_QUALITY_AUDIT.md" = "Quality Audit"
  "AGENT_LOOP.md" = "Loop Guide"
}

function Write-JsonResponse {
  param(
    [System.Net.HttpListenerContext]$Context,
    [int]$StatusCode,
    [hashtable]$Payload
  )

  $json = $Payload | ConvertTo-Json -Depth 5
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.Headers.Set("Access-Control-Allow-Origin", "*")
  $Context.Response.Headers.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  $Context.Response.Headers.Set("Access-Control-Allow-Headers", "Content-Type, X-Anton-Token")
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Test-Token {
  param([System.Net.HttpListenerRequest]$Request)

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return $true
  }

  $supplied = $Request.Headers.Get("X-Anton-Token")
  return $supplied -eq $Token
}

function Read-JsonBody {
  param([System.Net.HttpListenerRequest]$Request)

  $reader = [System.IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
  try {
    $body = $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }

  if ([string]::IsNullOrWhiteSpace($body)) {
    return $null
  }

  return $body | ConvertFrom-Json
}

function Get-AllowedMarkdownPath {
  param([string]$Name)

  if (-not $AllowedMarkdownFiles.ContainsKey($Name)) {
    return $null
  }

  return Join-Path $RepoRoot $Name
}

function Get-GitHistory {
  param([string]$Name)

  Push-Location $RepoRoot
  try {
    $raw = git log --follow --date=iso-strict --pretty=format:"%h`t%ad`t%s" -- $Name
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
      return @()
    }

    return @($raw -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 12 | ForEach-Object {
      $parts = $_ -split "`t", 3
      @{
        hash = $parts[0]
        date = $parts[1]
        subject = if ($parts.Count -gt 2) { $parts[2] } else { "" }
      }
    })
  } finally {
    Pop-Location
  }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host "Anton control server listening on $Prefix"
Write-Host "POST /start starts scheduled task '$TaskName'."
Write-Host "GET /files and GET /file?name=ANTON.md expose allow-listed Anton markdown files."
Write-Host "POST /append-note appends a timestamped note to ANTON.md."
if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Host "No token required. Keep this bound to 127.0.0.1 unless you add -Token."
} else {
  Write-Host "Token protection is enabled. Send it in the X-Anton-Token header."
}
Write-Host "Press Ctrl+C to stop."

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $path = $request.Url.AbsolutePath.TrimEnd("/")

    if ($request.HttpMethod -eq "OPTIONS") {
      Write-JsonResponse -Context $context -StatusCode 204 -Payload @{ ok = $true }
      continue
    }

    if (-not (Test-Token -Request $request)) {
      Write-JsonResponse -Context $context -StatusCode 401 -Payload @{
        ok = $false
        status = "unauthorized"
        message = "Anton control token is missing or invalid."
      }
      continue
    }

    if ($request.HttpMethod -eq "GET" -and ($path -eq "" -or $path -eq "/status")) {
      $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
      $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
      $lockPath = Join-Path $RepoRoot "agent-runs\agent-loop.lock"
      $lock = Get-Item -LiteralPath $lockPath -ErrorAction SilentlyContinue
      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        status = "online"
        taskName = $TaskName
        taskState = if ($task) { [string]$task.State } else { "missing" }
        lastRunTime = if ($taskInfo) { $taskInfo.LastRunTime.ToString("o") } else { $null }
        nextRunTime = if ($taskInfo) { $taskInfo.NextRunTime.ToString("o") } else { $null }
        lockActive = [bool]$lock
        lockUpdatedAt = if ($lock) { $lock.LastWriteTime.ToString("o") } else { $null }
      }
      continue
    }

    if ($request.HttpMethod -eq "GET" -and $path -eq "/files") {
      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        files = @($AllowedMarkdownFiles.GetEnumerator() | Sort-Object Name | ForEach-Object {
          @{
            name = $_.Key
            label = $_.Value
          }
        })
      }
      continue
    }

    if ($request.HttpMethod -eq "GET" -and $path -eq "/file") {
      $name = $request.QueryString.Get("name")
      $filePath = Get-AllowedMarkdownPath -Name $name
      if (-not $filePath -or -not (Test-Path -LiteralPath $filePath)) {
        Write-JsonResponse -Context $context -StatusCode 404 -Payload @{
          ok = $false
          status = "missing-file"
          message = "The requested markdown file is not allow-listed or does not exist."
        }
        continue
      }

      $item = Get-Item -LiteralPath $filePath
      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        name = $name
        label = $AllowedMarkdownFiles[$name]
        content = [string](Get-Content -LiteralPath $filePath -Raw)
        lastWriteTime = $item.LastWriteTime.ToString("o")
        history = Get-GitHistory -Name $name
      }
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/append-note") {
      $body = Read-JsonBody -Request $request
      $note = if ($body -and $body.note) { [string]$body.note } else { "" }
      if ([string]::IsNullOrWhiteSpace($note)) {
        Write-JsonResponse -Context $context -StatusCode 400 -Payload @{
          ok = $false
          status = "empty-note"
          message = "Write a note before appending to ANTON.md."
        }
        continue
      }

      $filePath = Get-AllowedMarkdownPath -Name "ANTON.md"
      $stamp = [DateTimeOffset]::Now.ToString("yyyy-MM-dd HH:mm zzz")
      $entry = @(
        ""
        "## User Note - $stamp"
        ""
        $note.Trim()
        ""
      ) -join "`r`n"
      Add-Content -LiteralPath $filePath -Value $entry -Encoding UTF8
      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        status = "appended"
        message = "Note appended to ANTON.md."
        name = "ANTON.md"
        content = [string](Get-Content -LiteralPath $filePath -Raw)
        history = Get-GitHistory -Name "ANTON.md"
      }
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/start") {
      $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
      if (-not $task) {
        Write-JsonResponse -Context $context -StatusCode 404 -Payload @{
          ok = $false
          status = "missing-task"
          message = "Scheduled task '$TaskName' was not found."
        }
        continue
      }

      Start-ScheduledTask -TaskName $TaskName
      Write-JsonResponse -Context $context -StatusCode 202 -Payload @{
        ok = $true
        status = "started"
        message = "Anton scheduled task was started."
      }
      continue
    }

    if ($request.HttpMethod -eq "POST" -and ($path -eq "/enable" -or $path -eq "/disable")) {
      $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
      if (-not $task) {
        Write-JsonResponse -Context $context -StatusCode 404 -Payload @{
          ok = $false
          status = "missing-task"
          message = "Scheduled task '$TaskName' was not found."
        }
        continue
      }

      if ($path -eq "/enable") {
        Enable-ScheduledTask -TaskName $TaskName | Out-Null
        $message = "Anton scheduled task is enabled."
        $state = "enabled"
      } else {
        Disable-ScheduledTask -TaskName $TaskName | Out-Null
        $message = "Anton scheduled task is paused."
        $state = "disabled"
      }

      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        status = $state
        message = $message
      }
      continue
    }

    Write-JsonResponse -Context $context -StatusCode 404 -Payload @{
      ok = $false
      status = "not-found"
      message = "Use GET /status, GET /files, GET /file, POST /append-note, POST /start, POST /enable, or POST /disable."
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
