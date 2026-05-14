param(
  [string]$TaskName = "Ridgeline Codex Agent Loop",
  [int]$IntervalMinutes = 30
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runner = Join-Path $ScriptDir "ridgeline-agent-loop.ps1"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  Write-Host "Administrator permission is needed to update Anton's scheduled task triggers."
  Write-Host "Opening an elevated PowerShell window. Approve the Windows prompt, then let it finish."
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -TaskName `"$TaskName`" -IntervalMinutes $IntervalMinutes"
  Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -Verb RunAs
  return
}

if (!(Test-Path -LiteralPath $Runner)) {
  throw "Missing runner: $Runner"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -Once"

$timeTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable `
  -WakeToRun

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger @($timeTrigger, $logonTrigger) `
  -Settings $settings `
  -Description "Runs the Ridgeline Codex site-improvement agent loop." `
  -Force | Out-Null

Write-Host "Installed scheduled task '$TaskName'. It will run every $IntervalMinutes minute(s) and at Windows logon."
Write-Host "To remove it: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
