param(
  [switch]$DisableHibernate,
  [string]$TaskName = "Ridgeline Codex Agent Loop"
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Set-NoAutoRebootWithLoggedOnUser {
  if (-not (Test-IsAdministrator)) {
    Write-Host "Windows Update no-auto-reboot policy requires administrator permission."
    return
  }

  $policyPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
  New-Item -Path $policyPath -Force | Out-Null
  New-ItemProperty -Path $policyPath -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -PropertyType DWord -Force | Out-Null
  Write-Host "Windows Update no-auto-reboot policy is set."
}

Write-Host "Configuring Anton always-on mode..."
Write-Host "Sleep and hibernate timers will be disabled for both plugged-in and battery power."
Write-Host "Closing the lid will be set to do nothing for both plugged-in and battery power."
Write-Host "Wake timers will be enabled for both plugged-in and battery power."
Write-Host "Display and disk idle timers will be disabled for plugged-in power."
Write-Host "Windows Update auto-reboot with a logged-on user will be disabled when elevation is available."

$lidCloseAction = "5ca83367-6e45-459f-a27b-476b1d01c936"
$unattendedSleepTimeout = "7bc4a2f9-d8fc-4469-b07b-33eb785aaca0"

powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 0 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE 0 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP $unattendedSleepTimeout 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP $unattendedSleepTimeout 0 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS $lidCloseAction 0 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_BUTTONS $lidCloseAction 0 | Out-Null
powercfg /change monitor-timeout-ac 0 | Out-Null
powercfg /change disk-timeout-ac 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -WakeToRun

  try {
    Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
    Write-Host "Updated scheduled task '$TaskName' so it can wake and keep running on battery."
  } catch {
    Write-Host "Could not update scheduled task '$TaskName' without elevation: $($_.Exception.Message)"
    Write-Host "Run this script from an elevated PowerShell window if the task settings need to be rewritten."
  }
} else {
  Write-Host "Scheduled task '$TaskName' was not found. Install Anton's task first, then run this again."
}

if ($DisableHibernate) {
  if (Test-IsAdministrator) {
    powercfg /hibernate off | Out-Null
    Write-Host "Hibernate has been disabled."
    Set-NoAutoRebootWithLoggedOnUser
  } else {
    Write-Host "Hibernate requires administrator permission to disable."
    Write-Host "Opening an elevated PowerShell window. Approve the Windows prompt, then let it finish."
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -DisableHibernate -TaskName `"$TaskName`""
    Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -Verb RunAs
  }
}

Write-Host "Anton always-on mode is configured."
Write-Host "Leave the laptop plugged in, open enough to cool itself, and on a stable network for 24/7 runs."
