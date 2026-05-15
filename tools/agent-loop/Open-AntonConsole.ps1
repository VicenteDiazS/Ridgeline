$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$ServerScript = Join-Path $ScriptDir "Start-AntonControlServer.ps1"
$ConsolePage = Join-Path $RepoRoot "anton.html"
$RunDir = Join-Path $RepoRoot "agent-runs"
$OutLog = Join-Path $RunDir "anton-control-server.out.log"
$ErrLog = Join-Path $RunDir "anton-control-server.err.log"
$Prefix = "http://127.0.0.1:8765/"

New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Test-ControlServer {
  try {
    $response = Invoke-RestMethod -Uri ($Prefix.TrimEnd("/") + "/status") -Method Get -TimeoutSec 2
    return [bool]$response.ok
  } catch {
    return $false
  }
}

if (-not (Test-ControlServer)) {
  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ServerScript, "-Prefix", $Prefix) `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $deadline) {
    if (Test-ControlServer) {
      break
    }
    Start-Sleep -Milliseconds 300
  }
}

Start-Process -FilePath $ConsolePage | Out-Null
