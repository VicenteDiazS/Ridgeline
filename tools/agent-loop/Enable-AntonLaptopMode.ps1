param(
  [switch]$IncludeBattery,
  [string]$TaskName = "Ridgeline Codex Agent Loop"
)

$ErrorActionPreference = "Stop"

Write-Host "Configuring Anton laptop mode..."
Write-Host "Plugged in: closing the lid will not sleep the laptop."
Write-Host "Plugged in: wake timers are enabled so Anton's scheduled task can wake the laptop."

powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null

if ($IncludeBattery) {
  Write-Host "Battery mode requested: closing the lid will not sleep the laptop on battery either."
  Write-Host "Battery mode requested: wake timers are enabled on battery."
  powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 | Out-Null
  powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
} else {
  Write-Host "Battery mode left unchanged. This is safer for heat and battery life."
}

powercfg /setactive SCHEME_CURRENT | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -WakeToRun

  Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
  Write-Host "Updated scheduled task '$TaskName' so it can wake the computer to run."
} else {
  Write-Host "Scheduled task '$TaskName' was not found. Install Anton's task first, then run this again."
}

Write-Host "Anton laptop mode is configured."
Write-Host "Best practice: leave the laptop plugged in and somewhere it can cool itself."
