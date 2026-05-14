param(
  [string]$TaskName = "Ridgeline Codex Agent Loop",
  [string]$Prefix = "http://127.0.0.1:8765/",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"

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

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host "Anton control server listening on $Prefix"
Write-Host "POST /start starts scheduled task '$TaskName'."
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
      Write-JsonResponse -Context $context -StatusCode 200 -Payload @{
        ok = $true
        status = "online"
        taskName = $TaskName
        lastRunTime = if ($taskInfo) { $taskInfo.LastRunTime.ToString("o") } else { $null }
        nextRunTime = if ($taskInfo) { $taskInfo.NextRunTime.ToString("o") } else { $null }
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

    Write-JsonResponse -Context $context -StatusCode 404 -Payload @{
      ok = $false
      status = "not-found"
      message = "Use GET /status or POST /start."
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
